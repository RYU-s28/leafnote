import express from "express";
import cors from "cors";
import {
  createPendingUser,
  createResetToken,
  createSession,
  hashPassword,
  makeUser,
  nowIso,
  sanitizeUser,
  verifyPassword,
} from "./auth.js";
import { readDb, updateDb } from "./db.js";

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

const authRequired = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const db = await readDb();
  const session = db.sessions.find((item) => item.token === token);
  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    res.status(401).json({ message: "Session expired" });
    return;
  }

  const user = db.users.find((item) => item.id === session.user_id);
  if (!user) {
    res.status(401).json({ message: "Invalid session" });
    return;
  }

  req.auth = {
    token,
    user,
  };
  next();
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "leafnote-api" });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ message: "Enter an email and password" });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  await updateDb((db) => {
    const exists = db.users.some((user) => user.email === normalizedEmail);
    if (exists) {
      const error = new Error("Account already exists");
      error.status = 409;
      throw error;
    }

    db.pendingUsers = db.pendingUsers.filter((item) => item.email !== normalizedEmail);
    db.pendingUsers.push(createPendingUser(normalizedEmail, hashPassword(password)));
    return db;
  });

  res.json({ email: normalizedEmail });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otpCode } = req.body || {};
  if (!email || !otpCode || String(otpCode).length < 6) {
    res.status(400).json({ message: "Enter the verification code" });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    let responsePayload;

    await updateDb((db) => {
      const pending = db.pendingUsers.find((item) => item.email === normalizedEmail);
      if (!pending) {
        const error = new Error("No pending registration found");
        error.status = 404;
        throw error;
      }

      const user = makeUser({
        email: pending.email,
        passwordHash: pending.passwordHash,
      });
      db.users.push(user);
      db.pendingUsers = db.pendingUsers.filter((item) => item.email !== normalizedEmail);

      const session = createSession(user.id);
      db.sessions = db.sessions.filter((item) => item.user_id !== user.id);
      db.sessions.push(session);
      responsePayload = { session, user };
      return db;
    });

    res.json({
      access_token: responsePayload.session.token,
      user: sanitizeUser(responsePayload.user),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Invalid verification code" });
  }
});

app.post("/api/auth/resend-otp", async (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ message: "Enter an email and password" });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    let responsePayload;

    await updateDb((db) => {
      let user = db.users.find((item) => item.email === normalizedEmail);

      if (!user && normalizedEmail === "guest@leafnote.local" && password === "guest") {
        user = makeUser({
          email: normalizedEmail,
          role: "guest",
          passwordHash: hashPassword(password),
        });
        db.users.push(user);
      }

      if (!user || !verifyPassword(password, user.passwordHash)) {
        const error = new Error("Invalid email or password");
        error.status = 401;
        throw error;
      }

      const session = createSession(user.id);
      db.sessions = db.sessions.filter((item) => item.user_id !== user.id);
      db.sessions.push(session);
      responsePayload = { session, user };
      return db;
    });

    res.json({
      access_token: responsePayload.session.token,
      user: sanitizeUser(responsePayload.user),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Login failed" });
  }
});

app.post("/api/auth/provider", async (req, res) => {
  const { provider } = req.body || {};
  const safeProvider = provider || "google";
  const email = `${safeProvider}@leafnote.local`;

  let responsePayload;

  await updateDb((db) => {
    let user = db.users.find((item) => item.email === email);
    if (!user) {
      user = makeUser({
        email,
        passwordHash: hashPassword("provider-auth"),
      });
      db.users.push(user);
    }

    const session = createSession(user.id);
    db.sessions = db.sessions.filter((item) => item.user_id !== user.id);
    db.sessions.push(session);
    responsePayload = { user, session };
    return db;
  });

  res.json({
    access_token: responsePayload.session.token,
    user: sanitizeUser(responsePayload.user),
  });
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  res.json(sanitizeUser(req.auth.user));
});

app.post("/api/auth/logout", authRequired, async (req, res) => {
  await updateDb((db) => {
    db.sessions = db.sessions.filter((session) => session.token !== req.auth.token);
    return db;
  });
  res.json({ ok: true });
});

app.post("/api/auth/reset-password-request", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  await updateDb((db) => {
    db.passwordResets = db.passwordResets.filter((item) => item.email !== email);
    db.passwordResets.push(createResetToken(email));
    return db;
  });

  res.json({ ok: true });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  if (!resetToken || !newPassword) {
    res.status(400).json({ message: "Invalid reset request" });
    return;
  }

  try {
    await updateDb((db) => {
      const resetItem = db.passwordResets.find((item) => item.token === resetToken);
      if (!resetItem) {
        const error = new Error("Reset token not found");
        error.status = 404;
        throw error;
      }

      db.users = db.users.map((user) => {
        if (user.email !== resetItem.email) return user;
        return {
          ...user,
          passwordHash: hashPassword(newPassword),
          updated_at: nowIso(),
        };
      });
      db.passwordResets = db.passwordResets.filter((item) => item.token !== resetToken);
      return db;
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to reset password" });
  }
});

const normalizeNotebook = (notebook) => ({
  is_favorite: false,
  is_trashed: false,
  page_count: 0,
  default_template: "blank",
  updated_date: nowIso(),
  ...notebook,
});

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

app.get("/api/notebooks", authRequired, async (req, res) => {
  const db = await readDb();
  const notebooks = db.notebooks
    .filter((item) => item.owner_id === req.auth.user.id)
    .sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime());
  res.json(notebooks);
});

app.get("/api/notebooks/:id", authRequired, async (req, res) => {
  const db = await readDb();
  const notebook = db.notebooks.find(
    (item) => item.id === req.params.id && item.owner_id === req.auth.user.id,
  );
  if (!notebook) {
    res.json([]);
    return;
  }
  res.json([notebook]);
});

app.post("/api/notebooks", authRequired, async (req, res) => {
  const payload = req.body || {};
  const notebook = normalizeNotebook({
    ...payload,
    id: createId("notebook"),
    owner_id: req.auth.user.id,
  });

  await updateDb((db) => {
    db.notebooks.unshift(notebook);
    return db;
  });

  res.status(201).json(notebook);
});

app.patch("/api/notebooks/:id", authRequired, async (req, res) => {
  const payload = req.body || {};
  const id = req.params.id;

  let updated = null;

  await updateDb((db) => {
    db.notebooks = db.notebooks.map((notebook) => {
      if (notebook.id !== id || notebook.owner_id !== req.auth.user.id) {
        return notebook;
      }
      updated = normalizeNotebook({
        ...notebook,
        ...payload,
        updated_date: nowIso(),
      });
      return updated;
    });
    return db;
  });

  if (!updated) {
    res.status(404).json({ message: "Notebook not found" });
    return;
  }

  res.json(updated);
});

app.delete("/api/notebooks/:id", authRequired, async (req, res) => {
  const id = req.params.id;

  await updateDb((db) => {
    db.notebooks = db.notebooks.filter(
      (notebook) => !(notebook.id === id && notebook.owner_id === req.auth.user.id),
    );
    db.pages = db.pages.filter((page) => page.notebook_id !== id || page.owner_id !== req.auth.user.id);
    return db;
  });

  res.status(204).send();
});

app.get("/api/pages", authRequired, async (req, res) => {
  const notebookId = req.query.notebook_id;
  if (!notebookId) {
    res.json([]);
    return;
  }

  const db = await readDb();
  const pages = db.pages
    .filter((page) => page.notebook_id === notebookId && page.owner_id === req.auth.user.id)
    .sort((a, b) => (a.page_order ?? 0) - (b.page_order ?? 0));
  res.json(pages);
});

app.post("/api/pages", authRequired, async (req, res) => {
  const payload = req.body || {};
  if (!payload.notebook_id) {
    res.status(400).json({ message: "notebook_id is required" });
    return;
  }

  const page = {
    id: createId("page"),
    title: payload.title || "Untitled page",
    page_order: payload.page_order ?? 0,
    template: payload.template || "blank",
    strokes_data: payload.strokes_data || "[]",
    text_boxes_data: payload.text_boxes_data || "[]",
    ...payload,
    owner_id: req.auth.user.id,
  };

  await updateDb((db) => {
    db.pages.push(page);
    return db;
  });

  res.status(201).json(page);
});

app.patch("/api/pages/:id", authRequired, async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  let updated = null;

  await updateDb((db) => {
    db.pages = db.pages.map((page) => {
      if (page.id !== id || page.owner_id !== req.auth.user.id) return page;
      updated = { ...page, ...payload };
      return updated;
    });
    return db;
  });

  if (!updated) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  res.json(updated);
});

app.delete("/api/pages/:id", authRequired, async (req, res) => {
  const id = req.params.id;

  await updateDb((db) => {
    db.pages = db.pages.filter((page) => !(page.id === id && page.owner_id === req.auth.user.id));
    return db;
  });

  res.status(204).send();
});

app.use((error, _req, res, _next) => {
  res.status(500).json({ message: error.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Leafnote API running on port ${PORT}`);
});
