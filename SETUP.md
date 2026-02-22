# Booking system setup – אושר משעל

## Vercel deployment

The project is ready for Vercel:

- **Static:** `index.html` is served at the root.
- **API:** Serverless functions in `/api`:
  - `POST /api/book` → `api/book.js`
  - `GET /api/availability` → `api/availability.js`

Set **Environment Variables** in the Vercel project (Settings → Environment Variables). Use the same names as in `.env`. For Google Calendar on Vercel, use **GOOGLE_SERVICE_ACCOUNT_KEY** (base64-encoded JSON key), not a file path, since the filesystem is read-only in serverless.

Local dev still uses `npm start` (Express in `server.js`).

---

## 1. Install and run

```bash
npm install
cp .env.example .env
# Edit .env with your values (see below)
npm start
```

Open **http://localhost:3000**. Booking modal works; without env config, only the UI runs (no calendar/email).

---

## 2. Google Calendar (business calendar: webcraft404@gmail.com)

Events are created with title: **תספורת: [Customer Name] - [Phone]**.

### Steps

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project (or use existing).
   - Enable **Google Calendar API**: APIs & Services → Enable APIs → search “Google Calendar API” → Enable.

2. **Service account**
   - APIs & Services → Credentials → Create Credentials → **Service account**.
   - Name it (e.g. “Barber Booking”), Create and Continue → Done.
   - Open the new service account → **Keys** → Add Key → Create new key → **JSON** → Download.
   - Save the file as `google-service-account.json` in the project folder (or another path you’ll use).

3. **Share the business calendar with the service account**
   - Open [Google Calendar](https://calendar.google.com/) in the account **webcraft404@gmail.com**.
   - Find the calendar you want (e.g. “My calendar”) → **Settings and sharing**.
   - Under **Share with specific people**, Add people → enter the **service account email** (from the JSON, e.g. `xxx@your-project.iam.gserviceaccount.com`).
   - Set permission to **Make changes to events** → Send.

4. **Configure `.env`**
   - **Option A – file path**  
     `GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json`  
     (or the path where you saved the JSON.)
   - **Option B – base64**  
     Encode the JSON:  
     `node -e "console.log(require('fs').readFileSync('./google-service-account.json').toString('base64'))"`  
     Put the result in:  
     `GOOGLE_SERVICE_ACCOUNT_KEY=<paste-base64-here>`

   - Set the calendar to use (usually the one you shared):  
     `CALENDAR_ID=webcraft404@gmail.com`  
     Or use `primary` if the service account’s primary calendar is the one you shared.

After this, when a customer books, an event is created on that calendar.

---

## 3. Confirmation email (Nodemailer)

The server sends a styled confirmation email to the customer with appointment details and an **“Add to my Calendar”** link.

### Gmail (webcraft404@gmail.com)

1. Turn on **2-Step Verification** for the Google account.
2. Create an **App password**: Google Account → Security → 2-Step Verification → App passwords → generate for “Mail”.
3. In `.env`:
   - `SMTP_USER=webcraft404@gmail.com`
   - `SMTP_PASS=<the-16-char-app-password>`
   - Optional: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587` (defaults in code).

### Other SMTP

Set in `.env`:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

---

## 4. `.env` summary

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000). |
| `BUSINESS_EMAIL` | Sender and business identity (default webcraft404@gmail.com). |
| `CALENDAR_ID` | Calendar where events are created (e.g. `webcraft404@gmail.com` or `primary`). |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Path to service account JSON file. |
| **or** `GOOGLE_SERVICE_ACCOUNT_KEY` | Base64-encoded service account JSON. |
| `SMTP_USER` | SMTP login (e.g. webcraft404@gmail.com). |
| `SMTP_PASS` | SMTP password (Gmail: App password). |

---

## 5. Mock bookings (frontend)

Disabled time slots are driven by a **mock array** in `index.html` (search for `MOCK_BOOKED`). To load real availability from the server later, call `GET /api/availability` and use the returned `booked` array instead.
