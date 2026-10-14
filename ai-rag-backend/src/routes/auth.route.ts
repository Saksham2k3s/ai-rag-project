import { Router } from "express";
import {
  register,
  userLogin,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", userLogin);

export default router;