const { fail } = require("../utils/httpError");
const { EMAIL_RE, normalizeEmail, normalizeName, clampString } = require("../utils/validate");
const { sendMail, mailConfigured } = require("../utils/mail");
const { config } = require("../config/env");

exports.sendContact = async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const subject = clampString(req.body?.subject || `A note from ${name}`, 160);
    const message = clampString(req.body?.message, 4000);

    if (name.length < 2) throw fail(400, "Please add your name.");
    if (!EMAIL_RE.test(email)) throw fail(400, "Please use a valid email.");
    if (message.length < 10) throw fail(400, "Please write a little more.");

    const to = config.CONTACT_TO || config.SMTP_FROM || config.SMTP_USER;
    if (!mailConfigured() || !to) {
      if (!config.isProd) {
        return res.status(200).json({
          success: true,
          message: "Note received (mail is not configured in development).",
        });
      }
      throw fail(503, "The desk is not taking letters right now.");
    }

    await sendMail({
      to,
      subject: `[Harbor] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p>From: ${name} &lt;${email}&gt;</p><p>${message.replace(/</g, "&lt;")}</p>`,
    });

    res.status(200).json({
      success: true,
      message: "The note has been filed.",
    });
  } catch (error) {
    next(error);
  }
};
