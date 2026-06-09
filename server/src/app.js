import express from "express";
import cors from "cors";
import { adminAuth } from "./firebaseAdmin.js";
import {
  getUserMetadata,
  recordLogin,
  sanitizeUserMetadata,
  upsertUserMetadata,
} from "./firestoreMetadata.js";
import {
  createNotebook,
  createPage,
  deleteNotebook,
  deletePage,
  ensureUserDrive,
  getNotebook,
  listNotebooks,
  listPages,
  updateNotebook,
  updatePage,
} from "./driveStore.js";
import { migrateLegacyUserData } from "./migration.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "https://ryu-s28.github.io",
];

const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([
  ...defaultAllowedOrigins,
  ...configuredOrigins,
]));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json());

const getBearerToken = (req) => {
  const value = req.header("authorization") || "";
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7);
};

const getGoogleAccessToken = (req) => req.header("x-google-access-token") || null;

const authRequired = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const metadata = await getUserMetadata(decodedToken.uid);
    req.auth = {
      token,
      decodedToken,
      metadata,
      googleAccessToken: getGoogleAccessToken(req),
    };
    next();
  } catch (error) {
    res.status(401).json({ message: error.message || "Invalid Firebase token" });
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "leafnote-api" });
});

app.post("/api/auth/session", authRequired, async (req, res) => {
  try {
    const driveContext = req.auth.googleAccessToken
      ? await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId)
      : null;

    const metadata = await upsertUserMetadata({
      decodedToken: req.auth.decodedToken,
      provider: req.body?.provider,
      userAgent: req.header("user-agent"),
      driveFolderId: driveContext?.rootFolderId,
      appVersion: "drive-v1",
    });

    await recordLogin({
      decodedToken: req.auth.decodedToken,
      provider: req.body?.provider,
      userAgent: req.header("user-agent"),
    });

    let migration = metadata.migration || null;
    if (req.auth.googleAccessToken && metadata.email && (!migration || migration.status !== "completed")) {
      migration = await migrateLegacyUserData({
        uid: metadata.uid,
        email: metadata.email,
        accessToken: req.auth.googleAccessToken,
        existingDriveFolderId: metadata.driveFolderId,
      });
    }

    const nextMetadata = await upsertUserMetadata({
      decodedToken: req.auth.decodedToken,
      provider: req.body?.provider,
      userAgent: req.header("user-agent"),
      driveFolderId: driveContext?.rootFolderId || metadata.driveFolderId,
      appVersion: "drive-v1",
      migration,
    });

    res.json(sanitizeUserMetadata(nextMetadata));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to initialize session" });
  }
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  try {
    const metadata = await upsertUserMetadata({
      decodedToken: req.auth.decodedToken,
      userAgent: req.header("user-agent"),
      driveFolderId: req.auth.metadata?.driveFolderId,
      appVersion: "drive-v1",
      migration: req.auth.metadata?.migration,
    });
    res.json(sanitizeUserMetadata(metadata));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to load user" });
  }
});

app.post("/api/auth/logout", authRequired, async (req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", (_req, res) => {
  res.status(410).json({ message: "LeafNote now uses Firebase Auth. Create accounts in the frontend auth flow." });
});

app.post("/api/auth/verify-otp", (_req, res) => {
  res.status(410).json({ message: "Email OTP verification has been replaced by Firebase Auth." });
});

app.post("/api/auth/resend-otp", (_req, res) => {
  res.status(410).json({ message: "Email OTP verification has been replaced by Firebase Auth." });
});

app.post("/api/auth/login", (_req, res) => {
  res.status(410).json({ message: "LeafNote now uses Firebase Auth. Sign in from the frontend." });
});

app.post("/api/auth/provider", (_req, res) => {
  res.status(410).json({ message: "Provider sign-in now happens in the frontend via Firebase Auth." });
});

app.post("/api/auth/reset-password-request", (_req, res) => {
  res.status(410).json({ message: "Password resets now happen through Firebase Auth." });
});

app.post("/api/auth/reset-password", (_req, res) => {
  res.status(410).json({ message: "Password resets now happen through Firebase Auth." });
});

app.post("/api/migration/legacy", authRequired, async (req, res) => {
  try {
    const email = req.auth.decodedToken.email;
    if (!email) {
      res.status(400).json({ message: "Authenticated email is required for migration" });
      return;
    }
    const migration = await migrateLegacyUserData({
      uid: req.auth.decodedToken.uid,
      email,
      accessToken: req.auth.googleAccessToken,
      existingDriveFolderId: req.auth.metadata?.driveFolderId,
    });
    res.json(migration);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Migration failed" });
  }
});

app.get("/api/notebooks", authRequired, async (req, res) => {
  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    const notebooks = await listNotebooks(req.auth.googleAccessToken, drive, req.auth.decodedToken.uid);
    res.json(notebooks);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to load notebooks" });
  }
});

app.get("/api/notebooks/:id", authRequired, async (req, res) => {
  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    const notebook = await getNotebook(req.auth.googleAccessToken, drive, req.auth.decodedToken.uid, req.params.id);
    res.json(notebook);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to load notebook" });
  }
});

app.post("/api/notebooks", authRequired, async (req, res) => {
  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    const result = await createNotebook(req.auth.googleAccessToken, drive, req.auth.decodedToken.uid, req.body || {});
    res.status(201).json(result.notebook);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to create notebook" });
  }
});

app.patch("/api/notebooks/:id", authRequired, async (req, res) => {
  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    const result = await updateNotebook(
      req.auth.googleAccessToken,
      drive,
      req.auth.decodedToken.uid,
      req.params.id,
      req.body || {},
    );
    if (!result) {
      res.status(404).json({ message: "Notebook not found" });
      return;
    }
    res.json(result.notebook);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to update notebook" });
  }
});

app.delete("/api/notebooks/:id", authRequired, async (req, res) => {
  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    await deleteNotebook(req.auth.googleAccessToken, drive, req.auth.decodedToken.uid, req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to delete notebook" });
  }
});

app.get("/api/pages", authRequired, async (req, res) => {
  const notebookId = req.query.notebook_id;
  if (!notebookId) {
    res.json([]);
    return;
  }

  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    const pages = await listPages(req.auth.googleAccessToken, drive, req.auth.decodedToken.uid, notebookId);
    res.json(pages);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to load pages" });
  }
});

app.post("/api/pages", authRequired, async (req, res) => {
  const payload = req.body || {};
  if (!payload.notebook_id) {
    res.status(400).json({ message: "notebook_id is required" });
    return;
  }

  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    const result = await createPage(req.auth.googleAccessToken, drive, req.auth.decodedToken.uid, payload);
    res.status(201).json(result.page);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to create page" });
  }
});

app.patch("/api/pages/:id", authRequired, async (req, res) => {
  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    const result = await updatePage(
      req.auth.googleAccessToken,
      drive,
      req.auth.decodedToken.uid,
      req.params.id,
      req.body || {},
    );
    if (!result) {
      res.status(404).json({ message: "Page not found" });
      return;
    }
    res.json(result.page);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to update page" });
  }
});

app.delete("/api/pages/:id", authRequired, async (req, res) => {
  try {
    const drive = await ensureUserDrive(req.auth.googleAccessToken, req.auth.metadata?.driveFolderId);
    await deletePage(req.auth.googleAccessToken, drive, req.auth.decodedToken.uid, req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to delete page" });
  }
});

app.use((error, _req, res, _next) => {
  res.status(500).json({ message: error.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Leafnote API running on port ${PORT}`);
});