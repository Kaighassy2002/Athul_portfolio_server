const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../Models/User");
const Like = require("../Models/Like");
const Comment = require("../Models/Comment");
const PasswordReset = require("../Models/PasswordReset");
const EmailVerification = require("../Models/EmailVerification");
const { config } = require("../config/env");
const { publicUser } = require("../middleware/auth");
const { fail } = require("../utils/httpError");
const { randomToken, sha256 } = require("../utils/crypto");
const { sendMail, mailConfigured } = require("../utils/mail");
const {
  EMAIL_RE,
  normalizeEmail,
  normalizeName,
  validatePassword,
} = require("../utils/validate");
const {
  issueSession,
  rotateRefresh,
  revokeRefresh,
  clearSession,
} = require("../services/session");

function googleClient(redirectUri) {
  if (!config.GOOGLE_CLIENT_ID) return null;
  return new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET || undefined,
    redirectUri
  );
}

function audienceMatches(tokenInfo) {
  const audiences = [tokenInfo?.aud, tokenInfo?.azp]
    .flat()
    .filter(Boolean)
    .map((value) => String(value).trim());
  return audiences.includes(config.GOOGLE_CLIENT_ID);
}

async function googleProfileFromAccessToken(accessToken) {
  const client = googleClient();
  if (!client) throw fail(503, "Google login is not configured yet.", "GOOGLE_DISABLED");
  const tokenInfo = await client.getTokenInfo(accessToken);
  if (!audienceMatches(tokenInfo)) throw new Error("Google token audience mismatch");
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Google profile lookup failed");
  const profile = await response.json();
  return {
    ...profile,
    sub: profile.sub || tokenInfo.sub,
    email: profile.email || tokenInfo.email,
    email_verified: profile.email_verified ?? tokenInfo.email_verified ?? true,
  };
}

async function googleProfileFromAuthCode(code) {
  if (!config.GOOGLE_CLIENT_SECRET) {
    throw fail(503, "Google login is not configured yet.", "GOOGLE_DISABLED");
  }
  const client = googleClient("postmessage");
  const { tokens } = await client.getToken({ code, redirect_uri: "postmessage" });
  if (tokens.id_token) {
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  }
  if (tokens.access_token) return googleProfileFromAccessToken(tokens.access_token);
  throw new Error("Google did not return a verifiable credential.");
}

function assertVerifiedGoogleEmail(profile) {
  const verified = profile?.email_verified;
  if (verified === false || verified === "false") {
    throw new Error("Google email is not verified");
  }
}

async function upsertGoogleUser(profile) {
  const email = normalizeEmail(profile.email);
  if (!email) throw new Error("Google did not return an email address.");
  const name = normalizeName(profile.name || profile.given_name) || email.split("@")[0];
  const googleId = String(profile.sub || "");
  const avatar = String(profile.picture || "").slice(0, 500);

  if (googleId) {
    const byGoogle = await User.findOne({ googleId });
    if (byGoogle) {
      byGoogle.avatar = byGoogle.avatar || avatar;
      byGoogle.emailVerified = true;
      await byGoogle.save();
      return byGoogle;
    }
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.provider === "google" || existing.googleId) {
      existing.googleId = existing.googleId || googleId;
      existing.emailVerified = true;
      existing.avatar = existing.avatar || avatar;
      await existing.save();
      return existing;
    }
    throw fail(
      409,
      "An account with this email already exists. Login with your password.",
      "USE_PASSWORD"
    );
  }

  return User.create({
    name,
    email,
    googleId,
    avatar,
    provider: "google",
    emailVerified: true,
    role: "user",
  });
}

async function sendVerificationMail(user) {
  const token = randomToken(32);
  const tokenHash = sha256(token);
  await EmailVerification.deleteMany({ userId: user._id });
  await EmailVerification.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  const verifyUrl = `${config.CLIENT_URL}/verify-email?token=${token}`;
  let emailed = false;
  try {
    emailed = await sendMail({
      to: user.email,
      subject: "Confirm your field notes account",
      text: `Confirm your account:\n${verifyUrl}\n\nThis link is good for a day.`,
      html: `<p>Confirm your account on Athul's field notes.</p><p><a href="${verifyUrl}">Verify email</a> — good for a day.</p>`,
    });
  } catch (error) {
    console.error("verify mail");
  }
  return { emailed, verifyUrl };
}

exports.getAuthConfig = (_req, res) => {
  res.status(200).json({
    success: true,
    googleClientId: config.GOOGLE_CLIENT_ID,
    googleEnabled: Boolean(config.GOOGLE_CLIENT_ID),
    googleCodeLogin: Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
  });
};

exports.signup = async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (name.length < 2) throw fail(400, "Please add your name.");
    if (!EMAIL_RE.test(email)) throw fail(400, "Please use a valid email.");
    const passwordError = validatePassword(password);
    if (passwordError) throw fail(400, passwordError);

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.provider === "google" && !existing.passwordHash) {
        throw fail(409, "This email already uses Google. Continue with Google.", "USE_GOOGLE");
      }
      throw fail(409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, config.BCRYPT_COST);
    const user = await User.create({
      name,
      email,
      passwordHash,
      provider: "local",
      emailVerified: false,
      role: "user",
    });

    const { emailed, verifyUrl } = await sendVerificationMail(user);
    const payload = {
      success: true,
      message: "Account created. Please verify your email.",
      needsVerification: true,
    };
    if (!emailed && !config.isProd) payload.devVerifyUrl = verifyUrl;
    if (!emailed && config.isProd && !mailConfigured()) {
      throw fail(503, "Mail is not configured. Could not send a verification letter.");
    }
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!EMAIL_RE.test(email) || !password) {
      throw fail(400, "Email and password are required.");
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.passwordHash) {
      throw fail(401, "Those details did not match.");
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw fail(401, "Those details did not match.");
    if (!user.emailVerified) {
      throw fail(403, "Please verify your email first.", "EMAIL_UNVERIFIED");
    }

    const session = await issueSession(res, user);
    res.status(200).json({
      success: true,
      message: "Welcome back.",
      user: session.user,
    });
  } catch (error) {
    next(error);
  }
};

exports.googleLogin = async (req, res, next) => {
  try {
    if (!config.GOOGLE_CLIENT_ID) {
      throw fail(503, "Google login is not configured yet.", "GOOGLE_DISABLED");
    }

    const credential = req.body?.credential;
    const accessToken = req.body?.accessToken;
    const code = req.body?.code;
    let profile;

    if (code) {
      profile = await googleProfileFromAuthCode(String(code));
    } else if (credential) {
      const client = googleClient();
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: config.GOOGLE_CLIENT_ID,
      });
      profile = ticket.getPayload();
    } else if (accessToken) {
      profile = await googleProfileFromAccessToken(accessToken);
    } else {
      throw fail(400, "Google credential is missing.");
    }

    assertVerifiedGoogleEmail(profile);
    const user = await upsertGoogleUser(profile);
    const session = await issueSession(res, user);
    res.status(200).json({
      success: true,
      message: "Welcome.",
      user: session.user,
    });
  } catch (error) {
    if (error.status) return next(error);
    if (String(error?.message || "").includes("not configured")) {
      return next(fail(503, "Google login is not configured yet.", "GOOGLE_DISABLED"));
    }
    next(fail(401, "Google login could not be verified."));
  }
};

exports.forgotPassword = async (req, res, next) => {
  const generic = {
    success: true,
    message: "If that address is on the survey, a reset letter is on its way.",
  };

  try {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_RE.test(email)) return res.status(200).json(generic);

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.passwordHash) return res.status(200).json(generic);

    const token = randomToken(32);
    const tokenHash = sha256(token);
    await PasswordReset.deleteMany({ userId: user._id });
    await PasswordReset.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resetUrl = `${config.CLIENT_URL}/reset-password?token=${token}`;
    let emailed = false;
    try {
      emailed = await sendMail({
        to: user.email,
        subject: "Reset your field notes password",
        text: `Open this link within an hour:\n${resetUrl}`,
        html: `<p><a href="${resetUrl}">Reset your password</a> — this link is good for an hour.</p>`,
      });
    } catch {
      console.error("reset mail");
    }

    const payload = { ...generic };
    if (!emailed && !config.isProd) payload.devResetUrl = resetUrl;
    res.status(200).json(payload);
  } catch (error) {
    console.error("forgotPassword");
    res.status(200).json(generic);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");
    const passwordError = validatePassword(password);
    if (!token) throw fail(400, "This reset link is missing.");
    if (passwordError) throw fail(400, passwordError);

    const record = await PasswordReset.findOne({
      tokenHash: sha256(token),
      expiresAt: { $gt: new Date() },
    });
    if (!record) throw fail(400, "This reset link has expired.");

    const user = await User.findById(record.userId);
    if (!user) throw fail(400, "This reset link has expired.");

    user.passwordHash = await bcrypt.hash(password, config.BCRYPT_COST);
    user.emailVerified = true;
    if (user.provider === "google") user.provider = "both";
    await user.save();
    await PasswordReset.deleteMany({ userId: user._id });

    const session = await issueSession(res, user);
    res.status(200).json({
      success: true,
      message: "Password updated.",
      user: session.user,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const token = String(req.body?.token || req.query?.token || "");
    if (!token) throw fail(400, "This verification link is missing.");
    const record = await EmailVerification.findOne({
      tokenHash: sha256(token),
      expiresAt: { $gt: new Date() },
    });
    if (!record) throw fail(400, "This verification link has expired.");
    const user = await User.findById(record.userId);
    if (!user) throw fail(400, "This verification link has expired.");
    user.emailVerified = true;
    await user.save();
    await EmailVerification.deleteMany({ userId: user._id });
    const session = await issueSession(res, user);
    res.status(200).json({
      success: true,
      message: "Email verified.",
      user: session.user,
    });
  } catch (error) {
    next(error);
  }
};

exports.resendVerification = async (req, res, next) => {
  const generic = {
    success: true,
    message: "If that address is waiting, a new letter is on its way.",
  };
  try {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_RE.test(email)) return res.status(200).json(generic);
    const user = await User.findOne({ email });
    if (!user || user.emailVerified || !user.passwordHash) {
      return res.status(200).json(generic);
    }
    const { emailed, verifyUrl } = await sendVerificationMail(user);
    const payload = { ...generic };
    if (!emailed && !config.isProd) payload.devVerifyUrl = verifyUrl;
    res.status(200).json(payload);
  } catch (error) {
    res.status(200).json(generic);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const session = await rotateRefresh(req, res);
    if (!session) {
      clearSession(res);
      throw fail(401, "Session expired. Please login again.", "AUTH_REQUIRED");
    }
    res.status(200).json({
      success: true,
      user: session.user,
    });
  } catch (error) {
    clearSession(res);
    if (error.status) return next(error);
    next(fail(401, "Session expired. Please login again.", "AUTH_REQUIRED"));
  }
};

exports.logout = async (req, res, next) => {
  try {
    await revokeRefresh(req);
    clearSession(res);
    res.status(200).json({ success: true, message: "Logged out." });
  } catch (error) {
    clearSession(res);
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [likeCount, commentCount] = await Promise.all([
      Like.countDocuments({ userId }),
      Comment.countDocuments({ userId }),
    ]);
    res.status(200).json({
      success: true,
      user: publicUser(req.user, { includeEmail: true }),
      stats: { likeCount, commentCount },
    });
  } catch (error) {
    next(error);
  }
};
