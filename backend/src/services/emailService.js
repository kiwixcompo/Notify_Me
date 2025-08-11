
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

const EMAIL_FROM = process.env.EMAIL_FROM;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function buildJobEmail(user, job, matchedKeywords = []) {
  const subject = `New Job Alert: ${job.title}`;
  const jobLink = job.link;
  const keywordsHtml = matchedKeywords.length ? `<p><b>Matched Keywords:</b> ${matchedKeywords.join(', ')}</p>` : '';
  const html = `
    <p>Hello,</p>
    <p>A new job matching your preferences was posted:</p>
    <h2>${job.title}</h2>
    <p>${job.description ? job.description.substring(0, 300) : ''}</p>
    ${keywordsHtml}
    <p><a href="${jobLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Apply Now</a></p>
    <p style="font-size:12px;color:#888;">Job posted on <a href="${jobLink}">${jobLink}</a>.</p>
    <p><a href="${FRONTEND_URL}/preferences">Manage your preferences</a></p>
  `;
  const text = `Hello,\nA new job matching your preferences was posted:\n\n${job.title}\n${job.description ? job.description.substring(0, 300) : ''}\n${matchedKeywords.length ? '\nMatched Keywords: ' + matchedKeywords.join(', ') : ''}\nApply: ${jobLink}\n\nManage your preferences: ${FRONTEND_URL}/preferences`;
  return { subject, html, text };
}

async function sendJobNotification(user, job, matchedKeywords = []) {
  const { subject, html, text } = buildJobEmail(user, job, matchedKeywords);
  const mailOptions = {
    from: EMAIL_FROM,
    to: user.email,
    subject,
    text,
    html
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${user.email} for job ${job.wwrJobId}`);
    return true;
  } catch (err) {
    console.error('SMTP error:', err);
    return false;
  }
}

module.exports = { sendJobNotification }; 