require('dotenv').config();
const {
  getCalendarClient,
  getMailer,
  createCalendarEvent,
  sendConfirmationEmail,
} = require('../lib/booking');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { name, phone, email, start, end, title } = body || {};
  if (!name || !phone || !email || !start || !end) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const eventTitle = title || `תספורת: ${name} - ${phone}`;

  const calendar = getCalendarClient();
  if (calendar) {
    try {
      await createCalendarEvent(calendar, eventTitle, start, end, phone, email);
    } catch (err) {
      console.error('Calendar insert error:', err.message);
      return res.status(502).json({ error: 'Calendar error' });
    }
  }

  const transporter = getMailer();
  if (transporter) {
    try {
      await sendConfirmationEmail(transporter, {
        name,
        email,
        phone,
        start,
        end,
        eventTitle,
      });
    } catch (err) {
      console.error('Email send error:', err.message);
    }
  }

  return res.status(200).json({ success: true });
};
