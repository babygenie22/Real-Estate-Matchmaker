import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth/replitAuth";
import { registerAuthRoutes } from "./replit_integrations/auth/routes";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { insertLikeSchema, insertMessageSchema, insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import { Server as SocketIOServer } from "socket.io";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  await seedDatabase();

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    socket.on("join-match", (matchId: string) => {
      socket.join(`match-${matchId}`);
    });

    socket.on("send-message", async (data: { matchId: string; content: string; senderId: string; senderType: string }) => {
      try {
        const msg = await storage.createMessage({
          matchId: data.matchId,
          senderId: data.senderId,
          senderType: data.senderType,
          content: data.content,
        });
        io.to(`match-${data.matchId}`).emit("new-message", msg);
      } catch (err) {
        console.error("Socket message error:", err);
      }
    });
  });

  app.get("/api/agents", isAuthenticated, async (req: any, res) => {
    try {
      const { search, specialty, language, zipCode, minPrice, maxPrice, scored } = req.query;
      const userId = req.user.id;

      let agentList;
      if (scored === "true") {
        agentList = await storage.getScoredAgents(userId);
      } else {
        agentList = await storage.getAgents(
          { search, specialty, language, zipCode, minPrice: minPrice ? Number(minPrice) : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined },
          userId
        );
      }
      res.json(agentList);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch agents" });
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
      const msg = await storage.createMessage(data);
      io.to(`match-${data.matchId}`).emit("new-message", msg);
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/users/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.updateUserPreferences(userId, { ...req.body, onboardingCompleted: true });
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/pending-agents", isAuthenticated, async (req: any, res) => {
    try {
      const pending = await storage.getPendingAgents();
      res.json(pending);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pending agents" });
    }
  });

  app.post("/api/admin/agents/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      await storage.approveAgent(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to approve agent" });
    }
  });

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
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update notification" });
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

  return httpServer;
}
