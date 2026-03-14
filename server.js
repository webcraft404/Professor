require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
      : require(path.resolve(keyPath));
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

app.post('/api/book', async (req, res) => {
  const { name, phone, email, start, end, title } = req.body || {};
  if (!name || !phone || !email || !start || !end) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const eventTitle = title || `תספורת: ${name} - ${phone}`;

  const calendar = getCalendarClient();
  if (calendar) {
    try {
      await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: {
          summary: eventTitle,
          description: `טלפון: ${phone}\nאימייל: ${email}`,
          start: { dateTime: start, timeZone: 'Asia/Jerusalem' },
          end: { dateTime: end, timeZone: 'Asia/Jerusalem' },
        },
      });
    } catch (err) {
      console.error('Calendar insert error:', err.message);
      return res.status(502).json({ error: 'Calendar error' });
    }
  }

  const transporter = getMailer();
  if (transporter) {
    const addToCalUrl = buildAddToCalendarLink(start, end, eventTitle, `אושר משעל – הרוקמים 26, חולון. טלפון: ${phone}`);
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
    try {
      await transporter.sendMail({
        from: `"אושר משעל" <${BUSINESS_EMAIL}>`,
        to: email,
        subject: 'אישור תור – אושר משעל',
        html,
      });
    } catch (err) {
      console.error('Email send error:', err.message);
    }
  }

  res.json({ success: true });
});

app.get('/api/availability', (req, res) => {
  const mockBooked = [
    '2026-02-23T10:00', '2026-02-23T10:30', '2026-02-23T14:00',
    '2026-02-24T11:00', '2026-02-24T16:00',
    '2026-02-25T09:30', '2026-02-25T15:00',
  ];
  res.json({ booked: mockBooked });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH && !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.warn('Google Calendar: set GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_KEY (base64 JSON)');
  }
  if (!process.env.SMTP_PASS) {
    console.warn('Email: set SMTP_PASS (and optionally SMTP_USER) for confirmation emails');
  }
});
