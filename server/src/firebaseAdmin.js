import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const parseServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
    } catch {
      const resolvedPath = path.resolve(process.cwd(), trimmed);
      if (fs.existsSync(resolvedPath)) {
        return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
      }
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON, base64-encoded JSON, or a path to a JSON file",
      );
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

const firebaseApp = ensureFirebaseApp();

export const adminAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);