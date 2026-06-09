import { readDb, updateDb } from "./db.js";
import { markMigration } from "./firestoreMetadata.js";
import {
  createNotebook,
  createPage,
  ensureUserDrive,
  listNotebooks,
} from "./driveStore.js";

const nowIso = () => new Date().toISOString();

export const migrateLegacyUserData = async ({ uid, email, accessToken, existingDriveFolderId }) => {
  const legacyDb = await readDb();
  const legacyUser = legacyDb.users.find((user) => user.email === email);

  if (!legacyUser) {
    const migration = {
      status: "skipped",
      reason: "no-legacy-user",
      migrated_at: nowIso(),
    };
    await markMigration(uid, migration);
    return migration;
  }

  const context = await ensureUserDrive(accessToken, existingDriveFolderId);
  const existingNotebooks = await listNotebooks(accessToken, context, uid);
  const existingIds = new Set(existingNotebooks.map((item) => item.id));

  const notebooks = legacyDb.notebooks.filter((item) => item.owner_id === legacyUser.id);
  const pages = legacyDb.pages.filter((item) => item.owner_id === legacyUser.id);

  for (const notebook of notebooks) {
    if (!existingIds.has(notebook.id)) {
      await createNotebook(accessToken, context, uid, {
        ...notebook,
        id: notebook.id,
        owner_id: uid,
      });
    }
  }

  const freshContext = await ensureUserDrive(accessToken, context.rootFolderId);
  for (const page of pages) {
    await createPage(accessToken, freshContext, uid, {
      ...page,
      id: page.id,
      owner_id: uid,
    });
  }

  await updateDb((db) => {
    db.notebooks = db.notebooks.filter((item) => item.owner_id !== legacyUser.id);
    db.pages = db.pages.filter((item) => item.owner_id !== legacyUser.id);
    return db;
  });

  const migration = {
    status: "completed",
    legacy_owner_id: legacyUser.id,
    migrated_notebook_count: notebooks.length,
    migrated_page_count: pages.length,
    migrated_at: nowIso(),
  };
  await markMigration(uid, migration);
  return migration;
};