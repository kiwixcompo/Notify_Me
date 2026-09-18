const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter using Gmail SMTP credentials from .env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Define email options
  const displayName = process.env.FROM_NAME || 'Notify Me | AI Job Intelligence';
  const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from: `"${displayName}" <${senderEmail}>`,
    replyTo: `"Notify Me Support" <support@notifyme.app>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // Send the email
  const info = await transporter.sendMail(mailOptions);
  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
