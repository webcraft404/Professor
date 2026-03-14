module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const mockBooked = [
    '2026-02-23T10:00',
    '2026-02-23T10:30',
    '2026-02-23T14:00',
    '2026-02-24T11:00',
    '2026-02-24T16:00',
    '2026-02-25T09:30',
    '2026-02-25T15:00',
  ];

  return res.status(200).json({ booked: mockBooked });
};
