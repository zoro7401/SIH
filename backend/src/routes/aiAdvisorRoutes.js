import express from "express";
import {
  askCareerAdvisor,
  generateSkillRoadmap,
  getConversationHistory,
  clearConversationHistory,
  analyzeLatestSkillRun,
} from "../controllers/aiAdvisorController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { aiAdvisorLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Not rate-limited — reads/deletes already-persisted history, not a Gemini call.
router.get("/history", authMiddleware, getConversationHistory);
router.delete("/history", authMiddleware, clearConversationHistory);
router.post("/ask", aiAdvisorLimiter, authMiddleware, askCareerAdvisor);
router.post("/roadmap", aiAdvisorLimiter, authMiddleware, generateSkillRoadmap);
router.get("/analyze-latest-run", aiAdvisorLimiter, authMiddleware, analyzeLatestSkillRun);

export default router;
