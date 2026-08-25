const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../Models/User");
const Like = require("../Models/Like");
const Comment = require("../Models/Comment");
const PasswordReset = require("../Models/PasswordReset");
const { signToken, publicUser } = require("../middileware/auth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5173").replace(
  /\/$/,
  ""
);

function googleClient() {
  return GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function authPayload(user) {
  return {
    token: signToken(user),
    user: publicUser(user),
  };
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return "Password should be at least 8 characters.";
  }
  if (password.length > 128) {
    return "Password is too long.";
  }
  return "";
}

async function sendResetMail(to, resetUrl) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return false;

  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_PORT) === "465",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject: "Reset your field notes password",
    text: `A reset was requested for your account on Athul's field notes.\n\nOpen this link within an hour:\n${resetUrl}\n\nIf you did not ask for this, you can ignore the letter.`,
    html: `<p>A reset was requested for your account on Athul's field notes.</p><p><a href="${resetUrl}">Reset your password</a> — this link is good for an hour.</p><p>If you did not ask for this, you can ignore the letter.</p>`,
  });
  return true;
}

async function googleProfileFromAccessToken(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("Google profile lookup failed");
  }
  return response.json();
}

async function upsertGoogleUser(profile) {
  const email = normalizeEmail(profile.email);
  if (!email) {
    throw new Error("Google did not return an email address.");
  }

  const name =
    normalizeName(profile.name || profile.given_name) || email.split("@")[0];
  const googleId = String(profile.sub || profile.id || "");
  const avatar = profile.picture || "";

  let user = googleId ? await User.findOne({ googleId }) : null;
  if (!user) user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      avatar,
      provider: "google",
    });
    return user;
  }

  user.googleId = user.googleId || googleId;
  user.avatar = user.avatar || avatar;
  if (user.provider === "local") user.provider = "both";
  if (!user.name) user.name = name;
  await user.save();
  return user;
}

exports.getAuthConfig = (_req, res) => {
  res.status(200).json({
    googleClientId: GOOGLE_CLIENT_ID,
    googleEnabled: Boolean(GOOGLE_CLIENT_ID),
  });
};

exports.signup = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (name.length < 2) {
      return res.status(400).json({ message: "Please add your name." });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Please use a valid email." });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.provider === "google" && !existing.passwordHash) {
        return res.status(409).json({
          message: "This email already uses Google. Continue with Google.",
          code: "USE_GOOGLE",
        });
      }
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      provider: "local",
    });

    res.status(201).json({
      message: "Account created.",
      ...authPayload(user),
    });
  } catch (error) {
    console.error("signup", error);
    res.status(500).json({ message: "Could not create the account." });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!EMAIL_RE.test(email) || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Those details did not match." });
    }
    if (!user.passwordHash) {
      return res.status(401).json({
        message: "This account uses Google. Continue with Google.",
        code: "USE_GOOGLE",
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Those details did not match." });
    }

    res.status(200).json({
      message: "Welcome back.",
      ...authPayload(user),
    });
  } catch (error) {
    console.error("login", error);
    res.status(500).json({ message: "Could not login." });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        message: "Google login is not configured yet.",
        code: "GOOGLE_DISABLED",
      });
    }

    const credential = req.body?.credential;
    const accessToken = req.body?.accessToken;
    let profile;

    if (credential) {
      const client = googleClient();
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      profile = ticket.getPayload();
    } else if (accessToken) {
      profile = await googleProfileFromAccessToken(accessToken);
    } else {
      return res.status(400).json({ message: "Google credential is missing." });
    }

    const user = await upsertGoogleUser(profile);
    res.status(200).json({
      message: "Welcome.",
      ...authPayload(user),
    });
  } catch (error) {
    console.error("googleLogin", error);
    res.status(401).json({ message: "Google login could not be verified." });
  }
};

exports.forgotPassword = async (req, res) => {
  const generic = {
    message: "If that address is on the survey, a reset letter is on its way.",
  };

  try {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_RE.test(email)) {
      return res.status(200).json(generic);
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(200).json(generic);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await PasswordReset.deleteMany({ userId: user._id });
    await PasswordReset.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resetUrl = `${CLIENT_URL}/reset-password?token=${token}`;
    let emailed = false;
    try {
      emailed = await sendResetMail(user.email, resetUrl);
    } catch (mailError) {
      console.error("reset mail", mailError);
    }

    const payload = { ...generic };
    if (!emailed && process.env.NODE_ENV !== "production") {
      payload.devResetUrl = resetUrl;
    }
    res.status(200).json(payload);
  } catch (error) {
    console.error("forgotPassword", error);
    res.status(200).json(generic);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");
    const passwordError = validatePassword(password);
    if (!token) {
      return res.status(400).json({ message: "This reset link is missing." });
    }
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await PasswordReset.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });
    if (!record) {
      return res.status(400).json({ message: "This reset link has expired." });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(400).json({ message: "This reset link has expired." });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    if (user.provider === "google") user.provider = "both";
    await user.save();
    await PasswordReset.deleteMany({ userId: user._id });

    res.status(200).json({
      message: "Password updated.",
      ...authPayload(user),
    });
  } catch (error) {
    console.error("resetPassword", error);
    res.status(500).json({ message: "Could not reset the password." });
  }
};

exports.me = async (req, res) => {
  try {
    const userId = req.user._id;
    const [likeCount, commentCount] = await Promise.all([
      Like.countDocuments({ userId }),
      Comment.countDocuments({ userId }),
    ]);
    res.status(200).json({
      user: publicUser(req.user),
      stats: { likeCount, commentCount },
    });
  } catch (error) {
    console.error("me", error);
    res.status(500).json({ message: "Could not load the profile." });
  }
};
