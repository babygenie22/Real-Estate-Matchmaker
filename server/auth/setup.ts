import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import MemoryStore from "memorystore";
import type { Express, RequestHandler } from "express";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { storage } from "../storage";
import { verifyToken } from "../jwt";

const MemStore = MemoryStore(session);

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const newHash = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, newHash);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET env var is required in production");
  }
  return session({
    secret: secret || "homematch-dev-secret-change-in-production",
    store: new MemStore({ checkPeriod: sessionTtl }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email.toLowerCase().trim());
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid email or password" });
        }
        if (!verifyPassword(password, user.passwordHash)) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      cb(null, user ?? false);
    } catch (err) {
      cb(err);
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (req.isAuthenticated()) return next();

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload) {
      const user = await storage.getUser(payload.userId);
      if (user) {
        (req as any).user = user;
        return next();
      }
    }
  }

  res.status(401).json({ message: "Unauthorized" });
};
