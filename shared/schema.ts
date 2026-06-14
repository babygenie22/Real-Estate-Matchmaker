import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("consumer"), // "consumer" | "agent" | "admin"
  location: varchar("location"),
  budget: varchar("budget"),
  propertyType: varchar("property_type"),
  preferredStyle: varchar("preferred_style"),
  communicationStyle: varchar("communication_style"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  expoPushToken: varchar("expo_push_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  photo: varchar("photo"),
  bio: text("bio"),
  licenseNumber: varchar("license_number"),
  phone: varchar("phone"),
  website: varchar("website"),
  linkedinUrl: varchar("linkedin_url"),
  googlePlaceId: varchar("google_place_id"), // for real agents imported from Google Places
  specialties: text("specialties").array(),
  serviceAreas: text("service_areas").array(),
  languages: text("languages").array(),
  priceRangeMin: integer("price_range_min"),
  priceRangeMax: integer("price_range_max"),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  transactionCount: integer("transaction_count").default(0),
  avgDaysOnMarket: integer("avg_days_on_market"),
  saleToListRatio: real("sale_to_list_ratio"),
  yearsExperience: integer("years_experience"),
  subscriptionStatus: varchar("subscription_status").default("active"),
  personalityTags: text("personality_tags").array(),
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  liked: boolean("liked").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  senderId: varchar("sender_id").notNull(),
  senderType: varchar("sender_type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // "match" | "message" | "booking" | "booking_update"
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  referenceId: varchar("reference_id"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  matchId: varchar("match_id").references(() => matches.id),
  proposedDate: varchar("proposed_date").notNull(),
  proposedTime: varchar("proposed_time").notNull(),
  notes: text("notes"),
  status: varchar("status").default("pending"), // "pending" | "confirmed" | "declined" | "rescheduled"
  agentNotes: text("agent_notes"),
  confirmedDate: varchar("confirmed_date"),
  confirmedTime: varchar("confirmed_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings)
  .omit({ id: true, createdAt: true })
  .extend({
    proposedDate: z.string().min(1).max(60),
    proposedTime: z.string().min(1).max(30),
    notes: z.string().max(1000).optional().nullable(),
    agentNotes: z.string().max(1000).optional().nullable(),
  });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Reviews: clients leave reviews for agents after a match/booking
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  matchId: varchar("match_id").references(() => matches.id),
  rating: integer("rating").notNull(), // 1-5
  text: text("text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews)
  .omit({ id: true, createdAt: true })
  .extend({ rating: z.number().int().min(1).max(5), text: z.string().max(2000).optional().nullable() });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Favorites: a buyer's saved shortlist of agents (separate from swipe likes/matches)
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, passwordHash: true, createdAt: true, updatedAt: true });
export const insertAgentSchema = createInsertSchema(agents)
  .omit({ id: true, createdAt: true })
  .extend({
    name: z.string().min(1).max(120),
    bio: z.string().max(3000).optional().nullable(),
    licenseNumber: z.string().max(60).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    // ~6mb data-URI photos allowed; cap so a single field can't bloat the row unbounded.
    photo: z.string().max(8_000_000).optional().nullable(),
    specialties: z.array(z.string().max(80)).max(30).optional().nullable(),
    serviceAreas: z.array(z.string().max(80)).max(50).optional().nullable(),
    languages: z.array(z.string().max(40)).max(20).optional().nullable(),
    personalityTags: z.array(z.string().max(40)).max(20).optional().nullable(),
  });
export const insertLikeSchema = createInsertSchema(likes).omit({ id: true, createdAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, createdAt: true })
  .extend({ content: z.string().min(1).max(5000) });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type AgentWithMatch = Agent & { matchId?: string };

/** Discriminates who sent a message — used in both server routes and client rendering. */
export const SENDER = {
  USER: "user",
  AGENT: "agent",
} as const;
export type SenderType = typeof SENDER[keyof typeof SENDER];

/** Notification category values — used in storage, routes, and the notifications UI. */
export const NOTIF_TYPE = {
  MATCH: "match",
  MESSAGE: "message",
  BOOKING: "booking",
  BOOKING_UPDATE: "booking_update",
} as const;
export type NotifType = typeof NOTIF_TYPE[keyof typeof NOTIF_TYPE];

/** User roles. */
export const ROLE = {
  CONSUMER: "consumer",
  AGENT: "agent",
  ADMIN: "admin",
} as const;
