import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "jira-clone-jwt-super-secret-key-12345!";

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function getUserIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  
  const decoded = verifyJWT(token);
  return decoded ? decoded.userId : null;
}
