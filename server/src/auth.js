import crypto from "node:crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14;

const randomId = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

export const nowIso = () => new Date().toISOString();

export const makeUser = ({ email, role = "member", passwordHash }) => ({
  id: randomId("user"),
  email,
  role,
  passwordHash,
  created_at: nowIso(),
});

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
};

export const createSession = (userId) => ({
  token: randomId("token"),
  user_id: userId,
  expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  created_at: nowIso(),
});

export const createPendingUser = (email, passwordHash) => ({
  email,
  passwordHash,
  otpCode: "123456",
  expires_at: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
  created_at: nowIso(),
});

export const createResetToken = (email) => ({
  email,
  token: randomId("reset"),
  expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
});

export const sanitizeUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role || "member",
  };
};
