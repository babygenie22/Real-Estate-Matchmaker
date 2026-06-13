import { db } from "./db";
import { eq, and, desc, sql, asc, inArray } from "drizzle-orm";
import {
  users, agents, likes, matches, messages, bookings, notifications, reviews, favorites,
  type User, type InsertUser, type Agent, type InsertAgent,
  type Like, type InsertLike, type Match, type InsertMatch,
  type Message, type InsertMessage, type Booking, type InsertBooking,
  type Notification, type Review, type InsertReview, type Favorite,
} from "@shared/schema";
// expo-server-sdk is loaded lazily to avoid blocking server startup
let _expo: any = null;
async function getExpo() {
  if (!_expo) {
    const { default: Expo } = await import("expo-server-sdk");
    _expo = new Expo();
    _expo.Expo = Expo;
  }
  return _expo;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: { type?: string; referenceId?: string },
) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.expoPushToken) return;
    const expo = await getExpo();
    const { default: Expo } = await import("expo-server-sdk");
    if (!Expo.isExpoPushToken(user.expoPushToken)) return;
    await expo.sendPushNotificationsAsync([
      { to: user.expoPushToken, title, body, sound: "default", ...(data ? { data } : {}) },
    ]);
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

export interface AgentFilters {
  zipCode?: string;
  specialty?: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: { email: string; passwordHash: string; firstName?: string; lastName?: string; role?: string; onboardingCompleted?: boolean }): Promise<User>;
  upsertUser(user: Partial<InsertUser> & { id: string }): Promise<User>;
  updateUserPreferences(id: string, prefs: Partial<InsertUser>): Promise<User>;

  getAgents(filters?: AgentFilters, userId?: string): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, agent: Partial<InsertAgent>): Promise<Agent>;
  getScoredAgents(userId: string, filters?: AgentFilters): Promise<(Agent & { matchScore: number })[]>;
  getAgentByUserId(userId: string): Promise<Agent | undefined>;

  createLike(like: InsertLike): Promise<Like>;
  getLikesByUser(userId: string): Promise<Like[]>;
  resetLikesByUser(userId: string): Promise<void>;

  createMatch(match: InsertMatch): Promise<Match>;
  getMatchesByUser(userId: string): Promise<(Match & { agent: Agent; lastMessage?: Message })[]>;
  getMatchesByAgent(agentId: string): Promise<(Match & { user: User })[]>;
  getMatch(id: string): Promise<Match | undefined>;

  createMessage(msg: InsertMessage): Promise<Message>;
  getMessagesByMatch(matchId: string): Promise<Message[]>;

  getAdminStats(): Promise<{ totalUsers: number; totalAgents: number; totalMatches: number; activeSubscriptions: number }>;
  getPendingAgents(): Promise<Agent[]>;
  approveAgent(id: string): Promise<void>;

  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByUser(userId: string): Promise<(Booking & { agent: Agent })[]>;
  getBookingsByAgent(agentId: string): Promise<(Booking & { user: User })[]>;
  updateBookingStatus(id: string, status: string, agentNotes?: string, confirmedDate?: string, confirmedTime?: string): Promise<Booking>;

  createNotification(n: { userId: string; type: string; title: string; body: string; referenceId?: string }): Promise<Notification>;
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  createReview(review: InsertReview): Promise<Review>;
  getReviewsByAgent(agentId: string): Promise<(Review & { user: Pick<User, "firstName" | "lastName"> })[]>;
  getReviewByUserAndAgent(userId: string, agentId: string): Promise<Review | undefined>;

  addFavorite(userId: string, agentId: string): Promise<Favorite>;
  removeFavorite(userId: string, agentId: string): Promise<void>;
  getFavoriteAgents(userId: string): Promise<Agent[]>;
  getFavoriteAgentIds(userId: string): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(data: { email: string; passwordHash: string; firstName?: string; lastName?: string; role?: string; onboardingCompleted?: boolean }): Promise<User> {
    const [user] = await db.insert(users).values(data as any).returning();
    return user;
  }

  async upsertUser(userData: Partial<InsertUser> & { id: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData as any)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async updateUserPreferences(id: string, prefs: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...prefs, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAgents(filters?: AgentFilters, userId?: string): Promise<Agent[]> {
    const allAgents = await db.select().from(agents).where(eq(agents.isApproved, true));
    let filtered = allAgents;

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(s) ||
        a.bio?.toLowerCase().includes(s) ||
        a.serviceAreas?.some(area => area.toLowerCase().includes(s))
      );
    }

    if (filters?.specialty) {
      filtered = filtered.filter(a =>
        a.specialties?.some(sp => sp.toLowerCase().includes(filters.specialty!.toLowerCase()))
      );
    }

    if (filters?.language) {
      filtered = filtered.filter(a =>
        a.languages?.some(lang => lang.toLowerCase().includes(filters.language!.toLowerCase()))
      );
    }

    if (filters?.zipCode) {
      filtered = filtered.filter(a =>
        a.serviceAreas?.some(area => area.includes(filters.zipCode!))
      );
    }

    if (filters?.minPrice) {
      filtered = filtered.filter(a => !a.priceRangeMax || a.priceRangeMax >= filters.minPrice!);
    }

    if (filters?.maxPrice) {
      filtered = filtered.filter(a => !a.priceRangeMin || a.priceRangeMin <= filters.maxPrice!);
    }

    if (userId) {
      const userLikes = await db.select().from(likes).where(eq(likes.userId, userId));
      const likedAgentIds = new Set(userLikes.map(l => l.agentId));
      filtered = filtered.filter(a => !likedAgentIds.has(a.id));
    }

    return filtered;
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async getAgentByUserId(userId: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.userId, userId));
    return agent;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [created] = await db.insert(agents).values(agent as any).returning();
    return created;
  }

  async updateAgent(id: string, agent: Partial<InsertAgent>): Promise<Agent> {
    const [updated] = await db.update(agents).set(agent as any).where(eq(agents.id, id)).returning();
    return updated;
  }

  async getScoredAgents(userId: string, filters?: AgentFilters): Promise<(Agent & { matchScore: number })[]> {
    const user = await this.getUser(userId);
    const allAgents = await this.getAgents(filters, userId);

    // Theoretical max: rating 5.0*20=100, transactions 50*0.5=25, S/L ratio ~1.0*10=10, DOM 0d → 30*0.3=9, style bonus=15 → ~159
    const MAX_SCORE = 159;

    const scored = allAgents.map(agent => {
      let score = 0;
      score += (agent.rating || 0) * 20;
      score += Math.min((agent.transactionCount || 0), 50) * 0.5;
      score += (agent.saleToListRatio || 0.95) * 10;
      score += Math.max(0, 30 - (agent.avgDaysOnMarket || 30)) * 0.3;
      if (user?.preferredStyle && agent.personalityTags?.includes(user.preferredStyle)) score += 15;
      const matchScore = Math.min(100, Math.max(1, Math.round((score / MAX_SCORE) * 100)));
      return { ...agent, matchScore };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore);
  }

  async createLike(like: InsertLike): Promise<Like> {
    // Idempotent: return the existing like if already recorded
    const [existing] = await db.select().from(likes)
      .where(and(eq(likes.userId, like.userId), eq(likes.agentId, like.agentId)));
    if (existing) return existing;
    const [created] = await db.insert(likes).values(like as any).returning();
    if (like.liked) {
      const match = await this.createMatch({ userId: like.userId, agentId: like.agentId });
      const agent = await this.getAgent(like.agentId);
      const user = await this.getUser(like.userId);
      const msg = `You matched with ${agent?.name || "an agent"}. Start chatting!`;
      sendPushNotification(like.userId, "New Match! 🎉", msg, { type: "match", referenceId: match.id });
      await this.createNotification({ userId: like.userId, type: "match", title: "New Match! 🎉", body: msg, referenceId: match.id });

      // Email notification for client
      if (user?.email && agent) {
        import("./integrations/resend").then(({ sendMatchEmail }) =>
          sendMatchEmail(user.email!, user.firstName || "", agent.name).catch(() => {})
        );
      }

      // Notify agent if they have a user account
      if (agent?.userId) {
        const agentUser = await this.getUser(agent.userId);
        if (agentUser) {
          const clientName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "A client";
          await this.createNotification({
            userId: agentUser.id,
            type: "match",
            title: "New Client Match! 🎉",
            body: `${clientName} liked your profile and wants to connect.`,
            referenceId: match.id,
          });
          sendPushNotification(agentUser.id, "New Client Match! 🎉", `${clientName} liked your profile.`, { type: "match", referenceId: match.id });
        }
      }
    }
    return created;
  }

  async getLikesByUser(userId: string): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.userId, userId));
  }

  async resetLikesByUser(userId: string): Promise<void> {
    // Delete likes (swipe history) so the deck refreshes — matches are in a separate table and are preserved
    await db.delete(likes).where(eq(likes.userId, userId));
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const existing = await db.select().from(matches)
      .where(and(eq(matches.userId, match.userId), eq(matches.agentId, match.agentId)));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(matches).values(match as any).returning();
    return created;
  }

  async getMatchesByUser(userId: string): Promise<(Match & { agent: Agent; lastMessage?: Message })[]> {
    const userMatches = await db.select().from(matches).where(eq(matches.userId, userId)).orderBy(desc(matches.createdAt));
    if (userMatches.length === 0) return [];

    const agentIds = Array.from(new Set(userMatches.map(m => m.agentId)));
    const matchIds = userMatches.map(m => m.id);

    // Batch-fetch agents and all recent messages in parallel (no N+1)
    const [agentRows, allMessages] = await Promise.all([
      db.select().from(agents).where(inArray(agents.id, agentIds)),
      db.select().from(messages).where(inArray(messages.matchId, matchIds)).orderBy(desc(messages.createdAt)),
    ]);

    const agentMap = new Map(agentRows.map(a => [a.id, a]));
    // Keep only the most-recent message per match (messages are DESC, so first hit wins)
    const lastMsgMap = new Map<string, Message>();
    for (const msg of allMessages) {
      if (!lastMsgMap.has(msg.matchId)) lastMsgMap.set(msg.matchId, msg);
    }

    return userMatches
      .filter(m => agentMap.has(m.agentId))
      .map(m => ({ ...m, agent: agentMap.get(m.agentId)!, lastMessage: lastMsgMap.get(m.id) }));
  }

  async getMatchesByAgent(agentId: string): Promise<(Match & { user: User; lastMessage?: Message })[]> {
    const agentMatches = await db.select().from(matches).where(eq(matches.agentId, agentId)).orderBy(desc(matches.createdAt));
    if (agentMatches.length === 0) return [];
    const userIds = Array.from(new Set(agentMatches.map(m => m.userId)));
    const userRows = await db.select().from(users).where(inArray(users.id, userIds));
    const userMap = new Map(userRows.map(u => [u.id, u]));

    // Attach the most recent message per match (mirrors getMatchesByUser).
    const matchIds = agentMatches.map(m => m.id);
    const allMessages = await db.select().from(messages).where(inArray(messages.matchId, matchIds)).orderBy(desc(messages.createdAt));
    const lastMsgMap = new Map<string, Message>();
    for (const msg of allMessages) {
      if (!lastMsgMap.has(msg.matchId)) lastMsgMap.set(msg.matchId, msg);
    }

    return agentMatches
      .filter(m => userMap.has(m.userId))
      .map(m => ({ ...m, user: userMap.get(m.userId)!, lastMessage: lastMsgMap.get(m.id) }));
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(msg as any).returning();
    try {
      const match = await this.getMatch(msg.matchId);
      if (match) {
        const agent = await this.getAgent(match.agentId);
        // Resolve the recipient for BOTH directions: a buyer's message goes to
        // the agent's user account; an agent's reply goes to the buyer.
        const recipientId = msg.senderType === "user" ? agent?.userId : match.userId;
        if (recipientId && recipientId !== msg.senderId) {
          const title = msg.senderType === "agent" ? (agent?.name || "Your agent") : "New message";
          const preview = msg.content.slice(0, 80);

          await this.createNotification({ userId: recipientId, type: "message", title, body: preview, referenceId: msg.matchId });
          sendPushNotification(recipientId, title, preview, { type: "message", referenceId: msg.matchId });

          // Email only the buyer when an agent replies (agents work in the portal).
          if (msg.senderType === "agent" && agent) {
            const [recipient] = await db.select().from(users).where(eq(users.id, recipientId));
            if (recipient?.email) {
              import("./integrations/resend").then(({ sendNewMessageEmail }) =>
                sendNewMessageEmail(recipient.email!, recipient.firstName || "", agent.name, msg.content.slice(0, 120)).catch(() => {})
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("createMessage side-effect error:", err);
    }
    return created;
  }

  async getMessagesByMatch(matchId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.matchId, matchId)).orderBy(asc(messages.createdAt));
  }

  async getAdminStats() {
    const [[userCount], [agentCount], [matchCount], [subCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(agents),
      db.select({ count: sql<number>`count(*)` }).from(matches),
      db.select({ count: sql<number>`count(*)` }).from(agents).where(eq(agents.subscriptionStatus, "active")),
    ]);
    return {
      totalUsers: Number(userCount.count),
      totalAgents: Number(agentCount.count),
      totalMatches: Number(matchCount.count),
      activeSubscriptions: Number(subCount.count),
    };
  }

  async getPendingAgents(): Promise<Agent[]> {
    return db.select().from(agents).where(eq(agents.isApproved, false));
  }

  async approveAgent(id: string): Promise<void> {
    await db.update(agents).set({ isApproved: true }).where(eq(agents.id, id));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking as any).returning();
    const agent = await this.getAgent(booking.agentId);
    const user = await this.getUser(booking.userId);
    const msg = `Your consultation request with ${agent?.name || "an agent"} on ${booking.proposedDate} at ${booking.proposedTime} has been received.`;
    sendPushNotification(booking.userId, "Booking Requested 📅", msg, { type: "booking", referenceId: created.id });
    await this.createNotification({ userId: booking.userId, type: "booking", title: "Booking Requested 📅", body: msg, referenceId: created.id });

    // Notify the agent
    if (agent?.userId) {
      const clientName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "A client";
      const agentMsg = `${clientName} requested a consultation on ${booking.proposedDate} at ${booking.proposedTime}.`;
      await this.createNotification({ userId: agent.userId, type: "booking", title: "New Booking Request 📅", body: agentMsg, referenceId: created.id });
      sendPushNotification(agent.userId, "New Booking Request 📅", agentMsg, { type: "booking", referenceId: created.id });
    }

    return created;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
    return b;
  }

  async getBookingsByUser(userId: string): Promise<(Booking & { agent: Agent })[]> {
    const userBookings = await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt));
    if (userBookings.length === 0) return [];
    const agentIds = Array.from(new Set(userBookings.map(b => b.agentId)));
    const agentRows = await db.select().from(agents).where(inArray(agents.id, agentIds));
    const agentMap = new Map(agentRows.map(a => [a.id, a]));
    return userBookings.filter(b => agentMap.has(b.agentId)).map(b => ({ ...b, agent: agentMap.get(b.agentId)! }));
  }

  async getBookingsByAgent(agentId: string): Promise<(Booking & { user: User })[]> {
    const agentBookings = await db.select().from(bookings).where(eq(bookings.agentId, agentId)).orderBy(desc(bookings.createdAt));
    if (agentBookings.length === 0) return [];
    const userIds = Array.from(new Set(agentBookings.map(b => b.userId)));
    const userRows = await db.select().from(users).where(inArray(users.id, userIds));
    const userMap = new Map(userRows.map(u => [u.id, u]));
    return agentBookings.filter(b => userMap.has(b.userId)).map(b => ({ ...b, user: userMap.get(b.userId)! }));
  }

  async updateBookingStatus(id: string, status: string, agentNotes?: string, confirmedDate?: string, confirmedTime?: string): Promise<Booking> {
    const updateData: any = { status };
    if (agentNotes !== undefined) updateData.agentNotes = agentNotes;
    if (confirmedDate) updateData.confirmedDate = confirmedDate;
    if (confirmedTime) updateData.confirmedTime = confirmedTime;

    const [updated] = await db.update(bookings).set(updateData).where(eq(bookings.id, id)).returning();

    // Notify client
    const agent = await this.getAgent(updated.agentId);
    const user = await this.getUser(updated.userId);

    if (status === "confirmed") {
      const dateStr = confirmedDate || updated.proposedDate;
      const timeStr = confirmedTime || updated.proposedTime;
      const body = `Your consultation with ${agent?.name} on ${dateStr} at ${timeStr} is confirmed!`;
      await this.createNotification({ userId: updated.userId, type: "booking_update", title: "Booking Confirmed ✅", body, referenceId: id });
      sendPushNotification(updated.userId, "Booking Confirmed ✅", body, { type: "booking_update", referenceId: id });
      if (user?.email && agent) {
        import("./integrations/resend").then(({ sendBookingConfirmedEmail }) =>
          sendBookingConfirmedEmail(user.email!, user.firstName || "", agent.name, dateStr, timeStr, agentNotes).catch(() => {})
        );
      }
    } else if (status === "declined") {
      const body = `${agent?.name} is unavailable at the requested time. Please propose a new time.`;
      await this.createNotification({ userId: updated.userId, type: "booking_update", title: "Booking Declined", body, referenceId: id });
      sendPushNotification(updated.userId, "Booking Update", body, { type: "booking_update", referenceId: id });
      if (user?.email && agent) {
        import("./integrations/resend").then(({ sendBookingDeclinedEmail }) =>
          sendBookingDeclinedEmail(user.email!, user.firstName || "", agent.name, agentNotes).catch(() => {})
        );
      }
    } else if (status === "rescheduled") {
      const dateStr = confirmedDate || updated.proposedDate;
      const timeStr = confirmedTime || updated.proposedTime;
      const body = `${agent?.name} proposed a new time: ${dateStr} at ${timeStr}.`;
      await this.createNotification({ userId: updated.userId, type: "booking_update", title: "New Time Proposed 🔄", body, referenceId: id });
      sendPushNotification(updated.userId, "New Time Proposed 🔄", body, { type: "booking_update", referenceId: id });
    }

    return updated;
  }

  async createNotification(n: { userId: string; type: string; title: string; body: string; referenceId?: string }): Promise<Notification> {
    const [created] = await db.insert(notifications).values(n as any).returning();
    return created;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [n] = await db.select().from(notifications).where(eq(notifications.id, id));
    return n;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review as any).returning();
    // Recalculate agent rating from all real reviews
    const agentReviews = await db.select().from(reviews).where(eq(reviews.agentId, review.agentId));
    const avg = agentReviews.reduce((sum, r) => sum + r.rating, 0) / agentReviews.length;
    await db.update(agents)
      .set({ rating: Math.round(avg * 10) / 10, reviewCount: agentReviews.length })
      .where(eq(agents.id, review.agentId));

    // Notify the agent of the new review (no-op for seeded agents without a user account).
    try {
      const agent = await this.getAgent(review.agentId);
      if (agent?.userId) {
        const stars = "★".repeat(Math.max(0, Math.min(5, Math.round(created.rating))));
        const body = `You received a ${created.rating}-star review. ${stars}`;
        await this.createNotification({ userId: agent.userId, type: "review", title: "New Review ⭐", body, referenceId: created.id });
        sendPushNotification(agent.userId, "New Review ⭐", body, { type: "review", referenceId: created.id });
      }
    } catch (err) {
      console.error("createReview notify error:", err);
    }
    return created;
  }

  async getReviewsByAgent(agentId: string): Promise<(Review & { user: Pick<User, "firstName" | "lastName"> })[]> {
    const agentReviews = await db.select().from(reviews).where(eq(reviews.agentId, agentId)).orderBy(desc(reviews.createdAt));
    if (agentReviews.length === 0) return [];
    const userIds = Array.from(new Set(agentReviews.map(r => r.userId)));
    const userRows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(inArray(users.id, userIds));
    const userMap = new Map(userRows.map(u => [u.id, u]));
    return agentReviews
      .filter(r => userMap.has(r.userId))
      .map(r => ({ ...r, user: { firstName: userMap.get(r.userId)!.firstName, lastName: userMap.get(r.userId)!.lastName } }));
  }

  async getReviewByUserAndAgent(userId: string, agentId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.agentId, agentId)));
    return review;
  }

  async addFavorite(userId: string, agentId: string): Promise<Favorite> {
    // Idempotent — return the existing favorite if already saved
    const [existing] = await db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.agentId, agentId)));
    if (existing) return existing;
    const [fav] = await db.insert(favorites).values({ userId, agentId }).returning();
    return fav;
  }

  async removeFavorite(userId: string, agentId: string): Promise<void> {
    await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.agentId, agentId)));
  }

  async getFavoriteAgents(userId: string): Promise<Agent[]> {
    const rows = await db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
    if (rows.length === 0) return [];
    const agentIds = rows.map(r => r.agentId);
    const agentRows = await db.select().from(agents).where(inArray(agents.id, agentIds));
    const agentMap = new Map(agentRows.map(a => [a.id, a]));
    // Preserve favorite order (most-recently-saved first)
    return rows.map(r => agentMap.get(r.agentId)).filter((a): a is Agent => Boolean(a));
  }

  async getFavoriteAgentIds(userId: string): Promise<string[]> {
    const rows = await db.select({ agentId: favorites.agentId }).from(favorites)
      .where(eq(favorites.userId, userId));
    return rows.map(r => r.agentId);
  }
}

export const storage = new DatabaseStorage();
