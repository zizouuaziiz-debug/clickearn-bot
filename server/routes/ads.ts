/**
 * TADS ads integration has been removed.
 * This file is kept as an empty stub for reference only.
 * All ad functionality is now handled by AdsGram via /api/adsgram.
 */

import { Router } from "express";

export const adsRouter = Router();

adsRouter.all("*", (_req, res) => {
  res.status(410).json({
    error: "410 Gone — TADS integration has been removed. Use /api/adsgram for ad functionality.",
  });
});

export default adsRouter;
