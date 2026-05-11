# HomeMatch — Testing Guide

## 🚀 Quick Start

```bash
# Option 1: Double-click start.sh in Finder
# Option 2: Terminal
bash start.sh
```

Opens at → **http://localhost:3001**

---

## 🗺️ Pages to Test

| URL | What it is |
|-----|-----------|
| `http://localhost:3001` | Landing page (log in / sign up) |
| `http://localhost:3001/agent-register` | Agent sign-up wizard |
| `http://localhost:3001/agent-portal` | Agent dashboard |
| `http://localhost:3001/admin` | Admin panel (seed data, manage agents) |

---

## 🧪 Test Flow #1 — Client Experience

1. **Go to** `http://localhost:3001`
2. Click **"Get Started Free"** → Create an account (email + password)
3. Complete the **onboarding wizard** (location, budget, property type, style)
4. **Discover** — swipe through agents, click a card to see the detail modal
5. Enter a **ZIP code** in the filter panel to see the market data widget
6. Click **Like** (💚) on any agent → you'll see the "It's a Match!" animation
7. Go to **Matches** tab → find your match
8. Click **Book Consultation** → pick a date/time
9. Go to **Alerts** tab → see your booking notification
10. Go to **Profile** tab → see your bookings list

---

## 🧪 Test Flow #2 — Agent Experience

1. **Go to** `http://localhost:3001/agent-register`
2. Fill out all 4 steps and submit
3. **Go to** `http://localhost:3001/agent-portal`
   - **Overview tab** — stats cards, pending action banner
   - **Clients tab** — matched clients
   - **Bookings tab** — confirm or decline a booking request (after a client books)
   - **Profile tab** — edit your bio, service areas, specialties

---

## 🧪 Test Flow #3 — Admin Panel

1. **Go to** `http://localhost:3001/admin`
2. Click **"Seed Sample Data"** to populate the app with 10 sample agents
3. View/approve/reject agent profiles
4. See all users, matches, bookings

---

## 🧪 Test Flow #4 — Real Agent Discovery

To pull in real local agents from Google:

1. Add your Google Places API key to `.env`:
   ```
   GOOGLE_PLACES_API_KEY=your_key_here
   ```
2. Restart the server
3. In the admin panel, use the **"Import from Google Places"** button  
   (or call `POST /api/agents/import-from-places` with `{ "location": "San Francisco, CA" }`)

---

## 🔑 Test Accounts

After seeding from Admin, you can log in with any seeded user or create new ones.  
The default admin route `/admin` is accessible without a separate login.

---

## 📱 Mobile App (Expo)

```bash
cd mobile
npm install
npx expo start
```

- Scan the QR code with **Expo Go** (iOS/Android)
- Or press `i` for iOS simulator / `a` for Android emulator
- Navigate to **Profile** tab → tap **Mortgage Calculator**

---

## ⚙️ Environment Variables (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ Yes | Cookie signing secret |
| `GOOGLE_PLACES_API_KEY` | Optional | Real agent search |
| `RENTCAST_API_KEY` | Optional | Live market data (mock fallback included) |
| `RESEND_API_KEY` | Optional | Transactional emails (logged to console if not set) |
| `FROM_EMAIL` | Optional | Sender address for emails |
| `APP_URL` | Optional | Used in email links (default: localhost:3001) |

---

## 🐛 Common Issues

**"Cannot connect to PostgreSQL"**  
→ Start Postgres: `brew services start postgresql@15`

**Port 3001 already in use**  
→ `lsof -ti:3001 | xargs kill` then restart

**Blank page / 401 errors**  
→ Make sure you're logged in. Visit `/` first.

**Market widget not showing**  
→ Enter a valid 5-digit US ZIP code in the filter panel on Discover page
