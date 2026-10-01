import { Router } from "express";
import multer from "multer";
import { deleteDocument, getDocuments, searchDocuments, uploadDocument } from "../controllers/document.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/documents/upload",
  authenticate,
  upload.single("file"),
  uploadDocument
);

router.get(
  "/documents",
  authenticate,
  getDocuments
);

router.delete(
  "/documents/:id",
  authenticate,
  deleteDocument
);

router.post(
  "/documents/search",
  authenticate,
  searchDocuments
);

export default router;