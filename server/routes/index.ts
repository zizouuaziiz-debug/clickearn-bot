import { Router } from "express";
import authRouter from "./auth";
import walletRouter from "./wallet";
import tasksRouter from "./tasks";
import { adsRouter } from "./ads";
import surveysRouter from "./surveys";
import vipRouter from "./vip";
import offersRouter from "./offers";
import referralRouter from "./referral";
import adminRouter from "./admin";

const router = Router();

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.use("/auth", authRouter);
router.use("/wallet", walletRouter);
router.use("/tasks", tasksRouter);
router.use("/ads", adsRouter);
router.use("/surveys", surveysRouter);
router.use("/vip", vipRouter);
router.use("/offers", offersRouter);
router.use("/referral", referralRouter);
router.use("/admin", adminRouter);

export default router;
