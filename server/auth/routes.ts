import type { Express } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { isAuthenticated, hashPassword } from "./setup";
import { signToken } from "../jwt";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// Throttle credential endpoints to blunt brute-force / credential-stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // per IP across login+register — far below brute-force scale, demo-friendly
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email.toLowerCase().trim());
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      const passwordHash = hashPassword(data.password);
      const raw = await storage.createUser({
        email: data.email.toLowerCase().trim(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      req.login(raw, (err) => {
        if (err) return res.status(500).json({ message: "Login after register failed" });
        const { passwordHash: _, ...user } = raw as any;
        res.json(user);
      });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { passwordHash: _, ...safeUser } = user as any;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ success: true }));
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });

  // Mobile JWT endpoints
  app.post("/api/auth/mobile/register", authLimiter, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email.toLowerCase().trim());
      if (existing) return res.status(400).json({ message: "An account with this email already exists" });
      const passwordHash = hashPassword(data.password);
      const raw = await storage.createUser({ email: data.email.toLowerCase().trim(), passwordHash, firstName: data.firstName, lastName: data.lastName });
      const { passwordHash: _, ...user } = raw as any;
      const token = signToken(user.id);
      res.json({ token, user });
    } catch (err: any) {
      if (err.name === "ZodError") return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      console.error("Mobile register error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/mobile/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const { verifyPassword } = await import("./setup");
      const raw = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!raw || !raw.passwordHash) return res.status(401).json({ message: "Invalid email or password" });
      if (!verifyPassword(password, raw.passwordHash)) return res.status(401).json({ message: "Invalid email or password" });
      const { passwordHash: _, ...user } = raw as any;
      const token = signToken(user.id);
      res.json({ token, user });
    } catch (err) {
      console.error("Mobile login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/push-token", isAuthenticated, async (req: any, res) => {
    try {
      // Only accept well-formed Expo push tokens, not arbitrary strings.
      const token = z.string().regex(/^Expo(nent)?PushToken\[[^\]]+\]$/).parse(req.body?.token);
      await storage.upsertUser({ id: req.user.id, expoPushToken: token });
      res.json({ success: true });
    } catch {
      res.status(400).json({ message: "Invalid push token" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const raw = await storage.getUser(req.user.id);
      if (!raw) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _, ...user } = raw as any;
      res.json(user);
    } catch {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
