const nodemailer = require('nodemailer');
const { SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

/**
 * Send an email using configured SMTP transporter
 * @param {string} to - recipient email address
 * @param {string} subject - email subject line
 * @param {string} text - plain-text email body
 */
async function sendEmail(to, subject, text) {
  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      text,
    });
    console.log('Email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email', error);
    throw error;
  }
}

module.exports = { sendEmail };