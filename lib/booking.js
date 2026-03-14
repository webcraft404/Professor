const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'webcraft404@gmail.com';
const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

function getCalendarClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyPath && !key) return null;
  let credentials;
  try {
    credentials = key
      ? JSON.parse(Buffer.from(key, 'base64').toString('utf8'))
      : require(path.resolve(process.cwd(), keyPath));
  } catch (e) {
    console.error('Google credentials error:', e.message);
    return null;
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
  return google.calendar({ version: 'v3', auth });
}

function getMailer() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || BUSINESS_EMAIL;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

function buildAddToCalendarLink(startISO, endISO, title, description) {
  const fmt = (iso) => iso.replace(/\..*$/, '').replace(/-/g, '').replace(/:/g, '') + 'Z';
  const base = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(startISO)}/${fmt(endISO)}`,
    details: description || '',
  });
  return `${base}?${params.toString()}`;
}

async function createCalendarEvent(calendar, eventTitle, start, end, phone, email) {
  if (!calendar) return;
  await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: eventTitle,
      description: `טלפון: ${phone}\nאימייל: ${email}`,
      start: { dateTime: start, timeZone: 'Asia/Jerusalem' },
      end: { dateTime: end, timeZone: 'Asia/Jerusalem' },
    },
  });
}

async function sendConfirmationEmail(transporter, { name, email, phone, start, end, eventTitle }) {
  if (!transporter) return;
  const endISO = end || new Date(new Date(start).getTime() + 30 * 60 * 1000).toISOString();
  const addToCalUrl = buildAddToCalendarLink(
    start,
    endISO,
    eventTitle,
    `אושר משעל – הרוקמים 26, חולון. טלפון: ${phone}`
  );
  const html = `
    <div dir="rtl" style="font-family: Heebo, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a1a; color: #f5f5f0;">
      <h2 style="color: #b8860b; margin-bottom: 16px;">אישור תור – אושר משעל</h2>
      <p>שלום ${name},</p>
      <p>התור שלך אושר.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #f5f5f030;">תאריך ושעה</td><td style="padding: 8px 0; border-bottom: 1px solid #f5f5f030;">${new Date(start).toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' })}</td></tr>
        <tr><td style="padding: 8px 0;">מיקום</td><td style="padding: 8px 0;">הרוקמים 26, חולון (מרכז עזריאלי)</td></tr>
      </table>
      <p style="margin-top: 24px;">
        <a href="${addToCalUrl}" style="display: inline-block; padding: 12px 24px; background: #b8860b; color: #1a1a1a; text-decoration: none; font-weight: bold; border-radius: 4px;">הוסף ללוח השנה שלי</a>
      </p>
      <p style="margin-top: 24px; font-size: 14px; color: #f5f5f0b0;">אושר משעל – Barber Shop</p>
    </div>
  `;
  await transporter.sendMail({
    from: `"אושר משעל" <${BUSINESS_EMAIL}>`,
    to: email,
    subject: 'אישור תור – אושר משעל',
    html,
  });
}

module.exports = {
  getCalendarClient,
  getMailer,
  buildAddToCalendarLink,
  createCalendarEvent,
  sendConfirmationEmail,
  BUSINESS_EMAIL,
  CALENDAR_ID,
};
