import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_DB = {
  users: [],
  pendingUsers: [],
  sessions: [],
  notebooks: [],
  pages: [],
  passwordResets: [],
};

const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), "server", "data", "db.json");

let writeQueue = Promise.resolve();

const ensureDbFile = async () => {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
};

export const readDb = async () => {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return {
    ...DEFAULT_DB,
    ...parsed,
  };
};

const writeDb = async (data) => {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf8");
};

export const updateDb = async (updater) => {
  writeQueue = writeQueue.then(async () => {
    const db = await readDb();
    const next = await updater(db);
    await writeDb(next || db);
    return next || db;
  });

  return writeQueue;
};
