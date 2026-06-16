import type { NextApiRequest, NextApiResponse } from "next";
import app from "../../server/app";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.url?.startsWith("/api")) {
    req.url = "/api" + (req.url || "/");
  }
  return app(req as any, res as any);
}
