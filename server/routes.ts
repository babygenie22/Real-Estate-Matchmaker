import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated, hashPassword } from "./auth/setup";
import { registerAuthRoutes } from "./auth/routes";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { insertLikeSchema, insertMessageSchema, insertBookingSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "./jwt";
import { searchRealEstateAgents, getPlacePhotoUrl } from "./integrations/google-places";
import { getMarketStatsByZip } from "./integrations/rentcast";

// Middleware: confirms the request user has a linked agent profile
async function isAgent(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  const agentProfile = await storage.getAgentByUserId(req.user.id);
  if (!agentProfile) return res.status(403).json({ message: "Agent profile required. Register at /agent-register." });
  req.agentProfile = agentProfile;
  next();
}

// Middleware: confirms the request user has the admin role
function isAdmin(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  await seedDatabase();

  const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.APP_URL || "http://localhost:3001", credentials: true },
  });

  io.on("connection", (socket) => {
    // Resolve the connecting user: web clients carry a passport session cookie,
    // mobile clients pass a JWT in the socket handshake auth payload.
    function resolveSocketUserId(): string | null {
      const sessionUserId = (socket.request as any).session?.passport?.user;
      if (sessionUserId) return sessionUserId;
      const token = (socket.handshake.auth as any)?.token;
      if (typeof token === "string") {
        const payload = verifyToken(token);
        if (payload) return payload.userId;
      }
      return null;
    }

    // Verify ownership before allowing a socket to subscribe to a match room
    socket.on("join-match", async (matchId: string) => {
      try {
        const userId = resolveSocketUserId();
        if (!userId) return;
        const match = await storage.getMatch(matchId);
        if (!match) return;
        const agentProfile = await storage.getAgentByUserId(userId);
        const isParticipant = match.userId === userId || (agentProfile && agentProfile.id === match.agentId);
        if (!isParticipant) return;
        socket.join(`match-${matchId}`);
      } catch {
        // silently drop unauthorized join attempts
      }
    });

    // Relay typing signals to the other participant in the room. Read-only,
    // best-effort: only sockets already joined to the room can broadcast.
    socket.on("typing", (matchId: string, isTyping: boolean) => {
      if (typeof matchId !== "string" || !socket.rooms.has(`match-${matchId}`)) return;
      socket.to(`match-${matchId}`).emit("typing", { matchId, isTyping: Boolean(isTyping) });
    });

    // send-message via socket is intentionally removed — REST endpoints are the
    // authoritative write path (/api/messages, /api/agent-portal/messages) and
    // enforce authentication. Real-time delivery is handled by io.emit after REST saves.
  });

  // ─── AGENTS ────────────────────────────────────────────────────────────────

  app.get("/api/agents", isAuthenticated, async (req: any, res) => {
    try {
      const { search, specialty, language, zipCode, minPrice, maxPrice, scored, browse } = req.query;
      const userId = req.user.id;
      let agentList;
      if (scored === "true") {
        agentList = await storage.getScoredAgents(userId, {
          search: search as string | undefined,
          specialty: specialty as string | undefined,
          language: language as string | undefined,
          zipCode: zipCode as string | undefined,
        });
      } else {
        // Browse mode returns ALL approved agents matching the filters (the
        // swipe deck, by contrast, hides agents the buyer already swiped).
        const filterUserId = browse === "true" ? undefined : userId;
        agentList = await storage.getAgents(
          { search, specialty, language, zipCode, minPrice: minPrice ? Number(minPrice) : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined },
          filterUserId
        );
      }
      res.json(agentList);
    } catch (err) {
      console.error("GET /api/agents error:", err);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/nearby", isAuthenticated, async (req: any, res) => {
    try {
      const { location } = req.query;
      if (!location) return res.status(400).json({ message: "location query param required" });
      const results = await searchRealEstateAgents(String(location));
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to search nearby agents" });
    }
  });

  app.get("/api/agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      res.json(agent);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents/import-from-places", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { placeId, name, address, phone, website, rating, userRatingCount, photoReference } = req.body;
      if (!placeId || !name) return res.status(400).json({ message: "placeId and name required" });
      const photo = photoReference ? getPlacePhotoUrl(photoReference) : null;
      const agent = await storage.createAgent({
        name,
        photo,
        bio: `Licensed Michigan real estate professional serving ${address}`,
        phone,
        website,
        googlePlaceId: placeId,
        rating: rating ?? 0,
        reviewCount: userRatingCount ?? 0,
        serviceAreas: [address],
        isApproved: false,
        subscriptionStatus: "pending",
      } as any);
      res.json(agent);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ─── REVIEWS ───────────────────────────────────────────────────────────────

  app.get("/api/agents/:id/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const agentReviews = await storage.getReviewsByAgent(req.params.id);
      res.json(agentReviews);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertReviewSchema.parse({ ...req.body, userId });
      // Gate reviews: you can only review an agent you've actually matched with.
      const userMatches = await storage.getMatchesByUser(userId);
      const hasMatch = userMatches.some((m) => m.agentId === data.agentId);
      if (!hasMatch) {
        return res.status(403).json({ message: "You can only review agents you've matched with." });
      }
      const existing = await storage.getReviewByUserAndAgent(userId, data.agentId);
      if (existing) return res.status(400).json({ message: "You have already reviewed this agent" });
      const review = await storage.createReview(data);
      res.json(review);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ─── LIKES ─────────────────────────────────────────────────────────────────

  app.post("/api/likes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertLikeSchema.parse({ ...req.body, userId });
      const like = await storage.createLike(data);
      res.json(like);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/likes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userLikes = await storage.getLikesByUser(userId);
      res.json(userLikes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch likes" });
    }
  });

  // Reset discover deck — clears swipe history so all agents reappear. Matches are preserved.
  app.delete("/api/likes", isAuthenticated, async (req: any, res) => {
    try {
      await storage.resetLikesByUser(req.user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to reset deck" });
    }
  });

  // ─── FAVORITES (saved-agent shortlist) ──────────────────────────────────────

  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const agents = await storage.getFavoriteAgents(req.user.id);
      res.json(agents);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const { agentId } = req.body;
      if (!agentId) return res.status(400).json({ message: "agentId is required" });
      const agent = await storage.getAgent(agentId);
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      const fav = await storage.addFavorite(req.user.id, agentId);
      res.json(fav);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/favorites/:agentId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeFavorite(req.user.id, req.params.agentId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // ─── MATCHES ───────────────────────────────────────────────────────────────

  app.get("/api/matches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userMatches = await storage.getMatchesByUser(userId);
      res.json(userMatches);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) return res.status(404).json({ message: "Match not found" });
      // Only the matched user or the matched agent may read messages
      const isOwner = match.userId === req.user.id;
      const agentProfile = await storage.getAgentByUserId(req.user.id);
      const isMatchedAgent = agentProfile && match.agentId === agentProfile.id;
      if (!isOwner && !isMatchedAgent) {
        return res.status(403).json({ message: "Access denied" });
      }
      const msgs = await storage.getMessagesByMatch(req.params.id);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertMessageSchema.parse({ ...req.body, senderId: userId, senderType: "user" });
      // Verify the match belongs to this user before allowing a write
      const match = await storage.getMatch(data.matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });
      if (match.userId !== userId) return res.status(403).json({ message: "Access denied" });
      const msg = await storage.createMessage(data);
      io.to(`match-${data.matchId}`).emit("new-message", msg);
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ─── USERS ─────────────────────────────────────────────────────────────────

  app.put("/api/users/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.updateUserPreferences(userId, { ...req.body, onboardingCompleted: true });
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Update profile preferences without altering onboardingCompleted
  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const allowed = ["location", "budget", "propertyType", "preferredStyle", "communicationStyle", "firstName", "lastName"];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const user = await storage.updateUserPreferences(userId, updates);
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ─── BOOKINGS ──────────────────────────────────────────────────────────────

  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertBookingSchema.parse({ ...req.body, userId });
      const booking = await storage.createBooking(data);
      res.json(booking);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userBookings = await storage.getBookingsByUser(userId);
      res.json(userBookings);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const items = await storage.getNotificationsByUser(userId);
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      await storage.markAllNotificationsRead(req.user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update notifications" });
    }
  });

  app.put("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) return res.status(404).json({ message: "Notification not found" });
      if (notification.userId !== req.user.id) return res.status(403).json({ message: "Access denied" });
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // ─── MARKET DATA ───────────────────────────────────────────────────────────

  app.get("/api/market-data", isAuthenticated, async (req: any, res) => {
    try {
      const { zipCode } = req.query;
      if (!zipCode) return res.status(400).json({ message: "zipCode query param required" });
      const stats = await getMarketStatsByZip(String(zipCode));
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch market data" });
    }
  });

  // ─── AGENT PORTAL ──────────────────────────────────────────────────────────

  // Agent self-registration — creates user (role=agent) + agent profile in one call
  app.post("/api/agent-portal/register", async (req: any, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(2),
        licenseNumber: z.string().min(3),
        phone: z.string().optional(),
        bio: z.string().optional(),
        photo: z.string().optional(),
        website: z.string().optional(),
        linkedinUrl: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        serviceAreas: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
        priceRangeMin: z.number().optional(),
        priceRangeMax: z.number().optional(),
        yearsExperience: z.number().optional(),
        personalityTags: z.array(z.string()).optional(),
      });
      const data = schema.parse(req.body);

      const existing = await storage.getUserByEmail(data.email.toLowerCase().trim());
      if (existing) return res.status(400).json({ message: "An account with this email already exists" });

      const passwordHash = hashPassword(data.password);
      const user = await storage.createUser({
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: "agent",
        onboardingCompleted: true,
      });

      const agent = await storage.createAgent({
        userId: user.id,
        name: data.name,
        licenseNumber: data.licenseNumber,
        phone: data.phone,
        bio: data.bio,
        photo: data.photo || null,
        website: data.website || null,
        linkedinUrl: data.linkedinUrl || null,
        specialties: data.specialties || [],
        serviceAreas: data.serviceAreas || [],
        languages: data.languages?.length ? data.languages : ["English"],
        priceRangeMin: data.priceRangeMin,
        priceRangeMax: data.priceRangeMax,
        yearsExperience: data.yearsExperience,
        personalityTags: data.personalityTags || [],
        isApproved: false,
        subscriptionStatus: "trial",
        rating: 0,
        reviewCount: 0,
        transactionCount: 0,
      } as any);

      if (user.email) {
        import("./integrations/resend").then(({ sendAgentWelcomeEmail }) =>
          sendAgentWelcomeEmail(user.email!, data.name).catch(() => {})
        );
      }

      const { passwordHash: _, ...safeUser } = user as any;
      res.json({ user: safeUser, agent });
    } catch (err: any) {
      if (err.name === "ZodError") return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      console.error("Agent registration error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Get own agent profile
  app.get("/api/agent-portal/me", isAuthenticated, isAgent, async (req: any, res) => {
    res.json(req.agentProfile);
  });

  // Update own agent profile
  app.put("/api/agent-portal/profile", isAuthenticated, isAgent, async (req: any, res) => {
    try {
      const agentId = req.agentProfile.id;
      const allowed = ["name","bio","photo","phone","website","linkedinUrl","licenseNumber","specialties","serviceAreas","languages","priceRangeMin","priceRangeMax","yearsExperience","personalityTags"];
      const updates: any = {};
      for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
      const agent = await storage.updateAgent(agentId, updates);
      res.json(agent);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Agent's client matches
  app.get("/api/agent-portal/matches", isAuthenticated, isAgent, async (req: any, res) => {
    try {
      const agentMatches = await storage.getMatchesByAgent(req.agentProfile.id);
      // Flatten into the shape the agent-portal screens render (buyer name/email + last message).
      const payload = agentMatches.map((m) => {
        const buyerName = [m.user.firstName, m.user.lastName].filter(Boolean).join(" ")
          || m.user.email?.split("@")[0] || "Buyer";
        return {
          id: m.id,
          user: m.user,
          buyerName,
          buyerEmail: m.user.email ?? "",
          createdAt: m.createdAt,
          lastMessage: m.lastMessage?.content ?? "",
          lastMessageAt: m.lastMessage?.createdAt ?? m.createdAt,
        };
      });
      res.json(payload);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Agent's own reviews (so they can read what clients wrote)
  app.get("/api/agent-portal/reviews", isAuthenticated, isAgent, async (req: any, res) => {
    try {
      const reviewList = await storage.getReviewsByAgent(req.agentProfile.id);
      res.json({
        reviews: reviewList,
        averageRating: req.agentProfile.rating ?? 0,
        total: reviewList.length,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Agent's booking requests
  app.get("/api/agent-portal/bookings", isAuthenticated, isAgent, async (req: any, res) => {
    try {
      const agentBookings = await storage.getBookingsByAgent(req.agentProfile.id);
      // Attach a flat buyer name so the dashboard can label each request.
      const payload = agentBookings.map((b: any) => ({
        ...b,
        buyerName: [b.user?.firstName, b.user?.lastName].filter(Boolean).join(" ")
          || b.user?.email?.split("@")[0] || "Buyer",
        buyerEmail: b.user?.email ?? "",
      }));
      res.json(payload);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Confirm / decline / reschedule a booking
  app.put("/api/agent-portal/bookings/:id", isAuthenticated, isAgent, async (req: any, res) => {
    try {
      const { status, agentNotes, confirmedDate, confirmedTime } = req.body;
      if (!["confirmed", "declined", "rescheduled"].includes(status)) {
        return res.status(400).json({ message: "status must be confirmed, declined, or rescheduled" });
      }
      // Verify the booking belongs to this agent
      const existingBooking = await storage.getBooking(req.params.id);
      if (!existingBooking) return res.status(404).json({ message: "Booking not found" });
      if (existingBooking.agentId !== req.agentProfile.id) return res.status(403).json({ message: "Access denied" });
      const booking = await storage.updateBookingStatus(req.params.id, status, agentNotes, confirmedDate, confirmedTime);
      res.json(booking);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Agent sends a message
  app.post("/api/agent-portal/messages", isAuthenticated, isAgent, async (req: any, res) => {
    try {
      const data = insertMessageSchema.parse({ ...req.body, senderId: req.user.id, senderType: "agent" });
      // Verify the match belongs to this agent before allowing a write
      const match = await storage.getMatch(data.matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });
      if (match.agentId !== req.agentProfile.id) return res.status(403).json({ message: "Access denied" });
      const msg = await storage.createMessage(data);
      io.to(`match-${data.matchId}`).emit("new-message", msg);
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Agent portal stats overview
  app.get("/api/agent-portal/stats", isAuthenticated, isAgent, async (req: any, res) => {
    try {
      const agentId = req.agentProfile.id;
      const [matchList, bookingList, reviewList] = await Promise.all([
        storage.getMatchesByAgent(agentId),
        storage.getBookingsByAgent(agentId),
        storage.getReviewsByAgent(agentId),
      ]);
      res.json({
        totalMatches: matchList.length,
        pendingBookings: bookingList.filter(b => b.status === "pending").length,
        confirmedBookings: bookingList.filter(b => b.status === "confirmed").length,
        totalReviews: reviewList.length,
        averageRating: req.agentProfile.rating ?? 0,
        isApproved: req.agentProfile.isApproved,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch agent stats" });
    }
  });

  // ─── ADMIN ─────────────────────────────────────────────────────────────────

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/pending-agents", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pending = await storage.getPendingAgents();
      res.json(pending);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pending agents" });
    }
  });

  app.post("/api/admin/agents/:id/approve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.approveAgent(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to approve agent" });
    }
  });

  return httpServer;
}
