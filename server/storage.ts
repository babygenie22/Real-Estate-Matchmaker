import { db } from "./db";
import { eq, and, ne, notInArray, desc, sql, ilike, or } from "drizzle-orm";
import {
  users, agents, likes, matches, messages, bookings, notifications,
  type User, type InsertUser, type Agent, type InsertAgent,
  type Like, type InsertLike, type Match, type InsertMatch,
  type Message, type InsertMessage, type Booking, type InsertBooking,
  type Notification
} from "@shared/schema";
import Expo from "expo-server-sdk";

const expo = new Expo();

export async function sendPushNotification(userId: string, title: string, body: string) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) return;
    await expo.sendPushNotificationsAsync([{ to: user.expoPushToken, title, body, sound: "default" }]);
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: Partial<InsertUser> & { id: string }): Promise<User>;
  updateUserPreferences(id: string, prefs: Partial<InsertUser>): Promise<User>;

  getAgents(filters?: AgentFilters, userId?: string): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, agent: Partial<InsertAgent>): Promise<Agent>;
  getScoredAgents(userId: string): Promise<Agent[]>;

  createLike(like: InsertLike): Promise<Like>;
  getLikesByUser(userId: string): Promise<Like[]>;

  createMatch(match: InsertMatch): Promise<Match>;
  getMatchesByUser(userId: string): Promise<(Match & { agent: Agent })[]>;
  getMatch(id: string): Promise<Match | undefined>;

  createMessage(msg: InsertMessage): Promise<Message>;
  getMessagesByMatch(matchId: string): Promise<Message[]>;

  getAdminStats(): Promise<{ totalUsers: number; totalAgents: number; totalMatches: number; activeSubscriptions: number }>;
  getPendingAgents(): Promise<Agent[]>;
  approveAgent(id: string): Promise<void>;

  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByUser(userId: string): Promise<(Booking & { agent: Agent })[]>;

  createNotification(n: { userId: string; type: string; title: string; body: string; referenceId?: string }): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
}

export interface AgentFilters {
  zipCode?: string;
  specialty?: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
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
    let query = db.select().from(agents).where(eq(agents.isApproved, true));

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

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [created] = await db.insert(agents).values(agent as any).returning();
    return created;
  }

  async updateAgent(id: string, agent: Partial<InsertAgent>): Promise<Agent> {
    const [updated] = await db.update(agents).set(agent as any).where(eq(agents.id, id)).returning();
    return updated;
  }

  async getScoredAgents(userId: string): Promise<Agent[]> {
    const user = await this.getUser(userId);
    const allAgents = await this.getAgents(undefined, userId);

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
      const msg = `You matched with ${agent?.name || "an agent"}. Start chatting!`;
      sendPushNotification(like.userId, "New Match! 🎉", msg);
      await this.createNotification({ userId: like.userId, type: "match", title: "New Match! 🎉", body: msg, referenceId: match.id });
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

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(msg as any).returning();
    // notify the other party
    try {
      const match = await this.getMatch(msg.matchId);
      if (match) {
        const recipientId = msg.senderType === "user" ? null : match.userId;
        if (recipientId) {
          await this.createNotification({ userId: recipientId, type: "message", title: "New Message", body: msg.content.slice(0, 80), referenceId: msg.matchId });
        }
      }
    } catch {}
    return created;
  }

  async getMessagesByMatch(matchId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.matchId, matchId)).orderBy(messages.createdAt);
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
    const msg = `Your consultation request with ${agent?.name || "an agent"} on ${booking.proposedDate} at ${booking.proposedTime} has been received.`;
    sendPushNotification(booking.userId, "Booking Requested 📅", msg);
    await this.createNotification({ userId: booking.userId, type: "booking", title: "Booking Requested 📅", body: msg, referenceId: created.id });
    return created;
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

  async createNotification(n: { userId: string; type: string; title: string; body: string; referenceId?: string }): Promise<Notification> {
    const [created] = await db.insert(notifications).values(n as any).returning();
    return created;
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
}

export const storage = new DatabaseStorage();
