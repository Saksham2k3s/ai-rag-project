import { Router } from "express";
import multer from "multer";
import {
  deleteDocument,
  getDocumentStatus,
  getDocuments,
  searchDocuments,
  uploadDocument,
} from "../controllers/document.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

router.post(
  "/documents/upload",
  authenticate,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "File size exceeds the 12MB limit",
          });
        }
        return res.status(400).json({
          message: err.message || "Failed to upload file",
        });
      }
      next();
    });
  },
  uploadDocument,
);

router.get("/documents", authenticate, getDocuments);

router.get("/documents/:documentId/status", authenticate, getDocumentStatus);

router.delete("/documents/:id", authenticate, deleteDocument);

router.post("/documents/search", authenticate, searchDocuments);

export default router;
