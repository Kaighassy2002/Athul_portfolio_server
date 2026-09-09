const { config } = require("../config/env");

function mailConfigured() {
  return Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
}

async function sendMail({ to, subject, text, html }) {
  if (!mailConfigured()) return false;
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });

  await transporter.sendMail({
    from: config.SMTP_FROM || config.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return true;
}

module.exports = { mailConfigured, sendMail };
