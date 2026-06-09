import { Buffer } from "node:buffer";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_DB = {
  users: [],
  pendingUsers: [],
  sessions: [],
  notebooks: [],
  pages: [],
  passwordResets: [],
};

const FIREBASE_COLLECTION = process.env.FIREBASE_COLLECTION || "leafnote";
const FIREBASE_DOC_ID = process.env.FIREBASE_DOC_ID || "main";

const parseServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON or base64-encoded JSON");
    }
  }
};

const ensureFirebaseApp = () => {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = parseServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
};

const firestore = getFirestore(ensureFirebaseApp());
const stateRef = firestore.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_ID);

const normalizeDb = (data) => ({
  ...DEFAULT_DB,
  ...(data || {}),
});

const cloneDb = (data) => JSON.parse(JSON.stringify(data));

export const readDb = async () => {
  const snapshot = await stateRef.get();
  if (!snapshot.exists) {
    const initial = cloneDb(DEFAULT_DB);
    await stateRef.set(initial, { merge: false });
    return initial;
  }
  return normalizeDb(snapshot.data());
};

export const updateDb = async (updater) => firestore.runTransaction(async (transaction) => {
  const snapshot = await transaction.get(stateRef);
  const current = snapshot.exists ? normalizeDb(snapshot.data()) : cloneDb(DEFAULT_DB);
  const draft = cloneDb(current);
  const next = await updater(draft);
  const finalData = normalizeDb(next || draft);
  transaction.set(stateRef, finalData, { merge: false });
  return finalData;
});
