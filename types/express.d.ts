import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        telegramId: string;
        isAdmin?: boolean;
        authMethod?: "telegram" | "web-admin";
        adminUsername?: string;
      };
    }
  }
}
