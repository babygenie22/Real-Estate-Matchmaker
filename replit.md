# HomeMatch - Real Estate Agent Matchmaker

## Overview
A full-stack Tinder-style web app that matches home buyers/sellers with real estate agents. Users swipe on agent cards, like or pass, and chat with matched agents in real-time.

## Architecture

### Frontend (React + Vite)
- **Framework**: React + TypeScript with Wouter for routing
- **UI**: Tailwind CSS + shadcn/ui component library
- **Animation**: Framer Motion for swipe card animations
- **State**: TanStack React Query for server state management
- **Real-time**: Socket.io client for live messaging

### Backend (Express + Node.js)
- **Auth**: Replit OIDC Auth (via `javascript_log_in_with_replit` integration)
- **Database**: PostgreSQL via Drizzle ORM
- **Real-time**: Socket.io server for WebSocket messaging
- **API**: REST API with `/api/*` prefix

## Key Features
1. **Landing Page** - Marketing page with CTA for unauthenticated users
2. **Onboarding** - 6-step questionnaire: role, location, budget, property type, preferred style, communication style
3. **Discover** - Draggable agent card stack with like/pass buttons and filters (search, specialty, language)
4. **Matches** - List of liked agents with match cards
5. **Chat** - Real-time messaging with matched agents via Socket.io
6. **Admin** - Platform stats (users, agents, matches, subscriptions) + pending agent approvals
7. **Profile** - User preferences summary and sign out

## Database Schema (`shared/schema.ts`)
- `sessions` - Express session storage (required for Replit Auth)
- `users` - User profiles with onboarding preferences
- `agents` - Agent profiles with stats, specialties, service areas
- `likes` - User swipe records (liked/passed)
- `matches` - Auto-created when user likes an agent
- `messages` - Chat messages per match

## Routes
### Pages
- `/` - Landing page (unauthenticated) or redirects to /discover
- `/onboarding` - New user questionnaire
- `/discover` - Agent swipe interface
- `/matches` - User's matched agents
- `/chat/:matchId` - Real-time chat with an agent
- `/profile` - User profile and preferences
- `/admin` - Admin dashboard

### API Endpoints
- `GET /api/auth/user` - Current authenticated user
- `GET /api/agents?scored=true` - Smart-ranked agent list (excludes seen agents)
- `GET /api/agents/:id` - Single agent details
- `POST /api/likes` - Record a like or pass
- `GET /api/matches` - Current user's matches with agent data
- `GET /api/matches/:id/messages` - Messages for a match
- `POST /api/messages` - Send a message
- `PUT /api/users/preferences` - Update user preferences + complete onboarding
- `GET /api/admin/stats` - Platform analytics
- `GET /api/admin/pending-agents` - Agents awaiting approval
- `POST /api/admin/agents/:id/approve` - Approve an agent

## Seeded Data
5 sample agents pre-loaded: Sarah Mitchell, Michael Torres, Priya Sharma, James Washington, Emily Chen - each with full stats, photos, specialties, service areas, and personality tags.

## File Structure
```
client/src/
  pages/
    landing.tsx       - Marketing landing page
    onboarding.tsx    - User questionnaire wizard
    discover.tsx      - Swipe card interface
    matches.tsx       - Matched agents list
    chat.tsx          - Real-time messaging
    profile.tsx       - User profile
    admin.tsx         - Admin dashboard
  components/
    app-layout.tsx    - Main layout with nav bar
    agent-card.tsx    - Swipeable agent card
    agent-detail-modal.tsx - Full agent detail view
server/
  index.ts           - Express + Socket.io server
  routes.ts          - API route registration
  storage.ts         - Database storage layer (DatabaseStorage)
  db.ts              - Drizzle ORM connection
  seed.ts            - Database seeding
  replit_integrations/auth/ - Replit OIDC auth
shared/
  schema.ts          - Drizzle schema + TypeScript types
```

## Running the App
- `npm run dev` - Starts both backend (Express) and frontend (Vite) on port 5000
- `npm run db:push` - Sync Drizzle schema to PostgreSQL

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Replit)
- `SESSION_SECRET` - Session encryption secret
- `REPL_ID` - Replit app ID (auto-set, used for OIDC auth)
