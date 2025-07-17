const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function buildJobEmail(user, job) {
  const subject = `New WWR Job Alert: ${job.title}`;
  const jobLink = job.link;
  const html = `
    <p>Hello,</p>
    <p>A new job matching your preferences was posted:</p>
    <h2>${job.title}</h2>
    <p>${job.description ? job.description.substring(0, 300) : ''}</p>
    <p><a href="${jobLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Apply Now</a></p>
    <p style="font-size:12px;color:#888;">Job posted on <a href="https://weworkremotely.com">We Work Remotely</a>.</p>
    <p><a href="${FRONTEND_URL}/preferences">Manage your preferences</a></p>
  `;
  const text = `Hello,\nA new job matching your preferences was posted:\n\n${job.title}\n${job.description ? job.description.substring(0, 300) : ''}\nApply: ${jobLink}\n\nJob posted on We Work Remotely.\nManage your preferences: ${FRONTEND_URL}/preferences`;
  return { subject, html, text };
}

async function sendJobNotification(user, job) {
  const { subject, html, text } = buildJobEmail(user, job);
  const msg = {
    to: user.email,
    from: EMAIL_FROM,
    subject,
    text,
    html
  };
  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${user.email} for job ${job.wwrJobId}`);
    return true;
  } catch (err) {
    console.error('SendGrid error:', err);
    return false;
  }
}

module.exports = { sendJobNotification }; 