import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.SESSION_SECRET || "clickearn-secret-change-me";

/**
 * 🔐 Auth payload
 */
export interface AuthPayload {
  userId: number;
  telegramId: string;
  isAdmin?: boolean;
  authMethod?: "telegram" | "web-admin";
  adminUsername?: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

/**
 * 🔐 التحقق من التوكن
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = verifyToken(token);

    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

/**
 * 👑 Admin (RESTORE ORIGINAL BEHAVIOR)
 * يعتمد على JWT فقط (مثل النسخة التي كانت تعمل عندك)
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.user;

  if (!user) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (user.isAdmin !== true) {
    return res.status(403).json({ error: "Admin only" });
  }

  return next();
}

/**
 * 🔑 إنشاء توكن
 */
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}
