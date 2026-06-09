import { firestore } from "./firebaseAdmin.js";

const usersRef = firestore.collection("users");
const loginLogsRef = firestore.collection("loginLogs");

const nowIso = () => new Date().toISOString();

const inferProvider = (decodedToken, fallbackProvider) => {
  if (fallbackProvider) return fallbackProvider;
  const provider = decodedToken.firebase?.sign_in_provider;
  if (provider === "google.com") return "google";
  if (provider) return provider;
  return "firebase";
};

export const sanitizeUserMetadata = (metadata) => {
  if (!metadata) return null;
  return {
    uid: metadata.uid,
    id: metadata.uid,
    email: metadata.email || null,
    displayName: metadata.displayName || metadata.email || "LeafNote User",
    photoURL: metadata.photoURL || null,
    provider: metadata.provider || "firebase",
    created_at: metadata.created_at || null,
    last_login: metadata.last_login || null,
    driveFolderId: metadata.driveFolderId || null,
    appVersion: metadata.appVersion || null,
    migration: metadata.migration || null,
  };
};

export const getUserMetadata = async (uid) => {
  const snapshot = await usersRef.doc(uid).get();
  return snapshot.exists ? snapshot.data() : null;
};

export const upsertUserMetadata = async ({
  decodedToken,
  provider,
  userAgent,
  driveFolderId,
  appVersion,
  migration,
}) => {
  const uid = decodedToken.uid;
  const existing = await getUserMetadata(uid);
  const now = nowIso();
  const next = {
    uid,
    email: decodedToken.email || existing?.email || null,
    displayName: decodedToken.name || existing?.displayName || decodedToken.email || "LeafNote User",
    photoURL: decodedToken.picture || existing?.photoURL || null,
    provider: inferProvider(decodedToken, provider || existing?.provider),
    created_at: existing?.created_at || now,
    last_login: now,
    driveFolderId: driveFolderId ?? existing?.driveFolderId ?? null,
    appVersion: appVersion || existing?.appVersion || "drive-v1",
    migration: migration || existing?.migration || null,
    last_user_agent: userAgent || existing?.last_user_agent || null,
  };

  await usersRef.doc(uid).set(next, { merge: true });
  return next;
};

export const recordLogin = async ({ decodedToken, provider, userAgent }) => {
  await loginLogsRef.add({
    uid: decodedToken.uid,
    email: decodedToken.email || null,
    provider: inferProvider(decodedToken, provider),
    userAgent: userAgent || null,
    login_at: nowIso(),
  });
};

export const markMigration = async (uid, migration) => {
  await usersRef.doc(uid).set({ migration }, { merge: true });
};