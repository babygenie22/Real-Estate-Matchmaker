import { users, type User } from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export interface UpsertUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  passwordHash?: string | null;
  expoPushToken?: string | null;
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(data: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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

  async createUser(data: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(data as any)
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
