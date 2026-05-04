import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "homematch-jwt-secret-change-in-production";
const JWT_EXPIRES = "30d";

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
