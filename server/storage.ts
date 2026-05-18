import { db } from "./db";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import {
  users, agents, likes, matches, messages, bookings, notifications, reviews,
  type User, type InsertUser, type Agent, type InsertAgent,
  type Like, type InsertLike, type Match, type InsertMatch,
  type Message, type InsertMessage, type Booking, type InsertBooking,
  type Notification, type Review, type InsertReview,
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

export async function sendPushNotification(userId: string, title: string, body: string) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.expoPushToken) return;
    const expo = await getExpo();
    const { default: Expo } = await import("expo-server-sdk");
    if (!Expo.isExpoPushToken(user.expoPushToken)) return;
    await expo.sendPushNotificationsAsync([{ to: user.expoPushToken, title, body, sound: "default" }]);
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
  upsertUser(user: Partial<InsertUser> & { id: string }): Promise<User>;
  updateUserPreferences(id: string, prefs: Partial<InsertUser>): Promise<User>;

  getAgents(filters?: AgentFilters, userId?: string): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, agent: Partial<InsertAgent>): Promise<Agent>;
  getScoredAgents(userId: string, filters?: AgentFilters): Promise<Agent[]>;
  getAgentByUserId(userId: string): Promise<Agent | undefined>;

  createLike(like: InsertLike): Promise<Like>;
  getLikesByUser(userId: string): Promise<Like[]>;

  createMatch(match: InsertMatch): Promise<Match>;
  getMatchesByUser(userId: string): Promise<(Match & { agent: Agent })[]>;
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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  async getScoredAgents(userId: string, filters?: AgentFilters): Promise<Agent[]> {
    const user = await this.getUser(userId);
    const allAgents = await this.getAgents(filters, userId);

    return allAgents.sort((a, b) => {
      let scoreA = 0, scoreB = 0;

      scoreA += (a.rating || 0) * 20;
      scoreB += (b.rating || 0) * 20;
      scoreA += Math.min((a.transactionCount || 0), 50) * 0.5;
      scoreB += Math.min((b.transactionCount || 0), 50) * 0.5;
      scoreA += (a.saleToListRatio || 0.95) * 10;
      scoreB += (b.saleToListRatio || 0.95) * 10;
      scoreA += Math.max(0, 30 - (a.avgDaysOnMarket || 30)) * 0.3;
      scoreB += Math.max(0, 30 - (b.avgDaysOnMarket || 30)) * 0.3;

      if (user?.preferredStyle && a.personalityTags?.includes(user.preferredStyle)) scoreA += 15;
      if (user?.preferredStyle && b.personalityTags?.includes(user.preferredStyle)) scoreB += 15;

      return scoreB - scoreA;
    });
  }

  async createLike(like: InsertLike): Promise<Like> {
    const [created] = await db.insert(likes).values(like as any).returning();
    if (like.liked) {
      const match = await this.createMatch({ userId: like.userId, agentId: like.agentId });
      const agent = await this.getAgent(like.agentId);
      const user = await this.getUser(like.userId);
      const msg = `You matched with ${agent?.name || "an agent"}. Start chatting!`;
      sendPushNotification(like.userId, "New Match! 🎉", msg);
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
          sendPushNotification(agentUser.id, "New Client Match! 🎉", `${clientName} liked your profile.`);
        }
      }
    }
    return created;
  }

  async getLikesByUser(userId: string): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.userId, userId));
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const existing = await db.select().from(matches)
      .where(and(eq(matches.userId, match.userId), eq(matches.agentId, match.agentId)));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(matches).values(match as any).returning();
    return created;
  }

  async getMatchesByUser(userId: string): Promise<(Match & { agent: Agent })[]> {
    const userMatches = await db.select().from(matches).where(eq(matches.userId, userId)).orderBy(desc(matches.createdAt));
    const result = [];
    for (const m of userMatches) {
      const agent = await this.getAgent(m.agentId);
      if (agent) result.push({ ...m, agent });
    }
    return result;
  }

  async getMatchesByAgent(agentId: string): Promise<(Match & { user: User })[]> {
    const agentMatches = await db.select().from(matches).where(eq(matches.agentId, agentId)).orderBy(desc(matches.createdAt));
    const result = [];
    for (const m of agentMatches) {
      const user = await this.getUser(m.userId);
      if (user) result.push({ ...m, user });
    }
    return result;
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
        const recipientId = msg.senderType === "user" ? null : match.userId;
        if (recipientId) {
          await this.createNotification({ userId: recipientId, type: "message", title: "New Message", body: msg.content.slice(0, 80), referenceId: msg.matchId });
          if (msg.senderType === "agent") {
            const [recipient] = await db.select().from(users).where(eq(users.id, recipientId));
            const agent = await this.getAgent(match.agentId);
            if (recipient?.email && agent) {
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
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [agentCount] = await db.select({ count: sql<number>`count(*)` }).from(agents);
    const [matchCount] = await db.select({ count: sql<number>`count(*)` }).from(matches);
    const [subCount] = await db.select({ count: sql<number>`count(*)` }).from(agents).where(eq(agents.subscriptionStatus, "active"));
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
    sendPushNotification(booking.userId, "Booking Requested 📅", msg);
    await this.createNotification({ userId: booking.userId, type: "booking", title: "Booking Requested 📅", body: msg, referenceId: created.id });

    // Notify the agent
    if (agent?.userId) {
      const clientName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "A client";
      const agentMsg = `${clientName} requested a consultation on ${booking.proposedDate} at ${booking.proposedTime}.`;
      await this.createNotification({ userId: agent.userId, type: "booking", title: "New Booking Request 📅", body: agentMsg, referenceId: created.id });
      sendPushNotification(agent.userId, "New Booking Request 📅", agentMsg);
    }

    return created;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
    return b;
  }

  async getBookingsByUser(userId: string): Promise<(Booking & { agent: Agent })[]> {
    const userBookings = await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt));
    const result = [];
    for (const b of userBookings) {
      const agent = await this.getAgent(b.agentId);
      if (agent) result.push({ ...b, agent });
    }
    return result;
  }

  async getBookingsByAgent(agentId: string): Promise<(Booking & { user: User })[]> {
    const agentBookings = await db.select().from(bookings).where(eq(bookings.agentId, agentId)).orderBy(desc(bookings.createdAt));
    const result = [];
    for (const b of agentBookings) {
      const user = await this.getUser(b.userId);
      if (user) result.push({ ...b, user });
    }
    return result;
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
      sendPushNotification(updated.userId, "Booking Confirmed ✅", body);
      if (user?.email && agent) {
        import("./integrations/resend").then(({ sendBookingConfirmedEmail }) =>
          sendBookingConfirmedEmail(user.email!, user.firstName || "", agent.name, dateStr, timeStr, agentNotes).catch(() => {})
        );
      }
    } else if (status === "declined") {
      const body = `${agent?.name} is unavailable at the requested time. Please propose a new time.`;
      await this.createNotification({ userId: updated.userId, type: "booking_update", title: "Booking Declined", body, referenceId: id });
      sendPushNotification(updated.userId, "Booking Update", body);
      if (user?.email && agent) {
        import("./integrations/resend").then(({ sendBookingDeclinedEmail }) =>
          sendBookingDeclinedEmail(user.email!, user.firstName || "", agent.name, agentNotes).catch(() => {})
        );
      }
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
    return created;
  }

  async getReviewsByAgent(agentId: string): Promise<(Review & { user: Pick<User, "firstName" | "lastName"> })[]> {
    const agentReviews = await db.select().from(reviews).where(eq(reviews.agentId, agentId)).orderBy(desc(reviews.createdAt));
    const result = [];
    for (const r of agentReviews) {
      const user = await this.getUser(r.userId);
      if (user) result.push({ ...r, user: { firstName: user.firstName, lastName: user.lastName } });
    }
    return result;
  }

  async getReviewByUserAndAgent(userId: string, agentId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.agentId, agentId)));
    return review;
  }
}

export const storage = new DatabaseStorage();
