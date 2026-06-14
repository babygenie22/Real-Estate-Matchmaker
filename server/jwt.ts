import jwt from "jsonwebtoken";

// Require a real secret everywhere except explicit local development. A missing
// or default secret lets anyone forge a token for any user, so we only fall
// back to a throwaway value when NODE_ENV === "development".
const IS_DEV = process.env.NODE_ENV === "development";
if (!process.env.JWT_SECRET && !IS_DEV) {
  throw new Error("JWT_SECRET env var is required");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";
const JWT_EXPIRES = "7d";

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}
