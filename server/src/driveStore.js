import {
  createDriveFolder,
  createJsonDriveFile,
  deleteDriveFile,
  getDriveFile,
  listDriveFiles,
  readJsonDriveFile,
  updateJsonDriveFile,
  FOLDER_MIME_TYPE,
} from "./driveClient.js";

const ROOT_FOLDER_NAME = "LeafNote";
const MANIFEST_FILE_NAME = "manifest.json";
const NOTEBOOKS_FOLDER_NAME = "notebooks";
const PAGES_FOLDER_NAME = "pages";
const ATTACHMENTS_FOLDER_NAME = "attachments";

const nowIso = () => new Date().toISOString();
const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const makeEmptyManifest = () => ({
  schema_version: 1,
  sync_version: 1,
  last_updated_at: nowIso(),
  notebooks: [],
  page_order: {},
  notebook_files: {},
  page_files: {},
  deleted_items: [],
  folders: {},
});

const touchManifest = (manifest) => ({
  ...manifest,
  sync_version: Number(manifest.sync_version || 0) + 1,
  last_updated_at: nowIso(),
});

const requireJson = (value, fallback) => {
  if (!value || typeof value !== "object") return fallback;
  return value;
};

const byName = (files, name) => files.find((file) => file.name === name && !file.trashed);

const normalizeNotebook = (notebook, ownerId) => {
  const timestamp = notebook.updated_at || notebook.updated_date || nowIso();
  return {
    id: notebook.id,
    owner_id: ownerId,
    title: notebook.title || "Untitled notebook",
    subject: notebook.subject || "",
    cover_type: notebook.cover_type || "solid",
    cover_color1: notebook.cover_color1 || "#007AFF",
    cover_color2: notebook.cover_color2 || "#5856D6",
    cover_pattern: notebook.cover_pattern || "none",
    cover_icon: notebook.cover_icon || "📓",
    is_favorite: Boolean(notebook.is_favorite),
    is_trashed: Boolean(notebook.is_trashed),
    page_count: Number(notebook.page_count || 0),
    default_template: notebook.default_template || "blank",
    created_at: notebook.created_at || timestamp,
    updated_at: timestamp,
    updated_date: timestamp,
  };
};

const normalizePage = (page, ownerId) => {
  const timestamp = page.updated_at || nowIso();
  return {
    id: page.id,
    owner_id: ownerId,
    notebook_id: page.notebook_id,
    title: page.title || "Untitled page",
    page_order: Number(page.page_order || 0),
    template: page.template || "blank",
    strokes_data: page.strokes_data || "[]",
    text_boxes_data: page.text_boxes_data || "[]",
    embedded_images: Array.isArray(page.embedded_images) ? page.embedded_images : [],
    attachments: Array.isArray(page.attachments) ? page.attachments : [],
    created_at: page.created_at || timestamp,
    updated_at: timestamp,
  };
};

const sortNotebooks = (notebooks) => [...notebooks].sort(
  (left, right) => new Date(right.updated_date).getTime() - new Date(left.updated_date).getTime(),
);

const getFileMapValue = (manifest, mapName, id) => requireJson(manifest[mapName], {})[id] || null;

const setFileMapValue = (manifest, mapName, id, fileId) => ({
  ...manifest,
  [mapName]: {
    ...requireJson(manifest[mapName], {}),
    [id]: fileId,
  },
});

const removeFileMapValue = (manifest, mapName, id) => {
  const next = { ...requireJson(manifest[mapName], {}) };
  delete next[id];
  return {
    ...manifest,
    [mapName]: next,
  };
};

const updateNotebookSummary = (manifest, notebook) => {
  const normalized = normalizeNotebook(notebook, notebook.owner_id);
  const notebooks = (manifest.notebooks || []).filter((item) => item.id !== normalized.id);
  notebooks.push(normalized);
  return {
    ...manifest,
    notebooks,
  };
};

const removeNotebookSummary = (manifest, notebookId) => ({
  ...manifest,
  notebooks: (manifest.notebooks || []).filter((item) => item.id !== notebookId),
});

const getPageOrder = (manifest, notebookId) => {
  const pageOrder = requireJson(manifest.page_order, {});
  return Array.isArray(pageOrder[notebookId]) ? [...pageOrder[notebookId]] : [];
};

const setPageOrder = (manifest, notebookId, order) => ({
  ...manifest,
  page_order: {
    ...requireJson(manifest.page_order, {}),
    [notebookId]: order,
  },
});

const removePageFromOrder = (manifest, notebookId, pageId) => {
  const next = getPageOrder(manifest, notebookId).filter((id) => id !== pageId);
  return setPageOrder(manifest, notebookId, next);
};

const markDeleted = (manifest, type, id) => ({
  ...manifest,
  deleted_items: [
    ...(Array.isArray(manifest.deleted_items) ? manifest.deleted_items : []),
    { type, id, deleted_at: nowIso() },
  ],
});

const ensureFolder = async (accessToken, name, parentId, appProperties) => {
  const q = parentId
    ? `mimeType='${FOLDER_MIME_TYPE}' and trashed=false and '${parentId}' in parents and name='${name.replace(/'/g, "\\'")}'`
    : `mimeType='${FOLDER_MIME_TYPE}' and trashed=false and 'root' in parents and name='${name.replace(/'/g, "\\'")}'`;
  const existing = byName(await listDriveFiles(accessToken, { q }), name);
  if (existing) return existing;
  return createDriveFolder(accessToken, { name, parentId, appProperties });
};

const ensureManifest = async (accessToken, rootFolderId) => {
  const q = `trashed=false and '${rootFolderId}' in parents and name='${MANIFEST_FILE_NAME}'`;
  const existing = byName(await listDriveFiles(accessToken, { q }), MANIFEST_FILE_NAME);
  if (existing) {
    const data = await readJsonDriveFile(accessToken, existing.id);
    return {
      manifestFileId: existing.id,
      manifest: {
        ...makeEmptyManifest(),
        ...requireJson(data, {}),
      },
    };
  }

  const manifest = makeEmptyManifest();
  const file = await createJsonDriveFile(accessToken, {
    name: MANIFEST_FILE_NAME,
    parentId: rootFolderId,
    data: manifest,
    appProperties: {
      leafnoteType: "manifest",
    },
  });
  return {
    manifestFileId: file.id,
    manifest,
  };
};

export const ensureUserDrive = async (accessToken, driveFolderId) => {
  const rootFolder = driveFolderId
    ? await getDriveFile(accessToken, driveFolderId, "id,name,parents")
    : await ensureFolder(accessToken, ROOT_FOLDER_NAME, null, { leafnoteRoot: "true" });

  const notebooksFolder = await ensureFolder(accessToken, NOTEBOOKS_FOLDER_NAME, rootFolder.id, {
    leafnoteType: "notebooks-folder",
  });
  const pagesFolder = await ensureFolder(accessToken, PAGES_FOLDER_NAME, rootFolder.id, {
    leafnoteType: "pages-folder",
  });
  const attachmentsFolder = await ensureFolder(accessToken, ATTACHMENTS_FOLDER_NAME, rootFolder.id, {
    leafnoteType: "attachments-folder",
  });
  const { manifest, manifestFileId } = await ensureManifest(accessToken, rootFolder.id);

  const nextManifest = {
    ...manifest,
    folders: {
      root: rootFolder.id,
      notebooks: notebooksFolder.id,
      pages: pagesFolder.id,
      attachments: attachmentsFolder.id,
    },
  };
  await updateJsonDriveFile(accessToken, manifestFileId, nextManifest);

  return {
    rootFolderId: rootFolder.id,
    notebooksFolderId: notebooksFolder.id,
    pagesFolderId: pagesFolder.id,
    attachmentsFolderId: attachmentsFolder.id,
    manifestFileId,
    manifest: nextManifest,
  };
};

const saveManifest = async (accessToken, context, manifest) => {
  const next = touchManifest(manifest);
  await updateJsonDriveFile(accessToken, context.manifestFileId, next);
  return next;
};

const readNotebookFile = async (accessToken, manifest, notebookId, ownerId) => {
  const fileId = getFileMapValue(manifest, "notebook_files", notebookId);
  if (!fileId) return null;
  const data = await readJsonDriveFile(accessToken, fileId);
  return normalizeNotebook(data, ownerId);
};

const readPageFile = async (accessToken, manifest, pageId, ownerId) => {
  const fileId = getFileMapValue(manifest, "page_files", pageId);
  if (!fileId) return null;
  const data = await readJsonDriveFile(accessToken, fileId);
  return normalizePage(data, ownerId);
};

const saveNotebookFile = async (accessToken, context, manifest, notebook) => {
  const fileId = getFileMapValue(manifest, "notebook_files", notebook.id);
  const normalized = normalizeNotebook(notebook, notebook.owner_id);
  if (fileId) {
    await updateJsonDriveFile(accessToken, fileId, normalized);
    return { manifest: updateNotebookSummary(manifest, normalized), notebook: normalized };
  }

  const file = await createJsonDriveFile(accessToken, {
    name: `notebook_${normalized.id}.json`,
    parentId: context.notebooksFolderId,
    data: normalized,
    appProperties: {
      leafnoteType: "notebook",
      notebookId: normalized.id,
    },
  });

  let nextManifest = setFileMapValue(manifest, "notebook_files", normalized.id, file.id);
  nextManifest = updateNotebookSummary(nextManifest, normalized);
  return { manifest: nextManifest, notebook: normalized };
};

const savePageFile = async (accessToken, context, manifest, page) => {
  const fileId = getFileMapValue(manifest, "page_files", page.id);
  const normalized = normalizePage(page, page.owner_id);
  if (fileId) {
    await updateJsonDriveFile(accessToken, fileId, normalized);
    return { manifest, page: normalized };
  }

  const file = await createJsonDriveFile(accessToken, {
    name: `page_${normalized.id}.json`,
    parentId: context.pagesFolderId,
    data: normalized,
    appProperties: {
      leafnoteType: "page",
      pageId: normalized.id,
      notebookId: normalized.notebook_id,
    },
  });

  const nextManifest = setFileMapValue(manifest, "page_files", normalized.id, file.id);
  return { manifest: nextManifest, page: normalized };
};

const syncNotebookPageCount = async (accessToken, context, manifest, notebookId, ownerId) => {
  const notebook = await readNotebookFile(accessToken, manifest, notebookId, ownerId);
  if (!notebook) return manifest;
  const nextNotebook = {
    ...notebook,
    page_count: getPageOrder(manifest, notebookId).length,
    updated_at: nowIso(),
    updated_date: nowIso(),
  };
  const result = await saveNotebookFile(accessToken, context, manifest, nextNotebook);
  return result.manifest;
};

export const listNotebooks = async (accessToken, context, ownerId) => {
  const notebooks = await Promise.all((context.manifest.notebooks || []).map(async (summary) => {
    const notebook = await readNotebookFile(accessToken, context.manifest, summary.id, ownerId);
    return notebook || normalizeNotebook(summary, ownerId);
  }));
  return sortNotebooks(notebooks);
};

export const getNotebook = async (accessToken, context, ownerId, notebookId) => {
  const notebook = await readNotebookFile(accessToken, context.manifest, notebookId, ownerId);
  return notebook ? [notebook] : [];
};

export const createNotebook = async (accessToken, context, ownerId, payload) => {
  const notebook = normalizeNotebook({
    ...payload,
    id: payload.id || createId("notebook"),
    owner_id: ownerId,
    created_at: nowIso(),
    updated_at: nowIso(),
    updated_date: nowIso(),
  }, ownerId);

  const result = await saveNotebookFile(accessToken, context, context.manifest, notebook);
  const manifest = await saveManifest(accessToken, context, result.manifest);
  return {
    notebook: result.notebook,
    manifest,
  };
};

export const updateNotebook = async (accessToken, context, ownerId, notebookId, payload) => {
  const existing = await readNotebookFile(accessToken, context.manifest, notebookId, ownerId);
  if (!existing) return null;

  const nextNotebook = normalizeNotebook({
    ...existing,
    ...payload,
    id: notebookId,
    owner_id: ownerId,
    updated_at: nowIso(),
    updated_date: nowIso(),
  }, ownerId);

  const result = await saveNotebookFile(accessToken, context, context.manifest, nextNotebook);
  const manifest = await saveManifest(accessToken, context, result.manifest);
  return {
    notebook: result.notebook,
    manifest,
  };
};

export const deleteNotebook = async (accessToken, context, ownerId, notebookId) => {
  const notebookFileId = getFileMapValue(context.manifest, "notebook_files", notebookId);
  if (notebookFileId) {
    await deleteDriveFile(accessToken, notebookFileId);
  }

  let manifest = removeNotebookSummary(context.manifest, notebookId);
  manifest = removeFileMapValue(manifest, "notebook_files", notebookId);

  const pageIds = getPageOrder(manifest, notebookId);
  for (const pageId of pageIds) {
    const pageFileId = getFileMapValue(manifest, "page_files", pageId);
    if (pageFileId) {
      await deleteDriveFile(accessToken, pageFileId);
    }
    manifest = removeFileMapValue(manifest, "page_files", pageId);
    manifest = markDeleted(manifest, "page", pageId);
  }

  const nextPageOrder = { ...requireJson(manifest.page_order, {}) };
  delete nextPageOrder[notebookId];
  manifest = {
    ...manifest,
    page_order: nextPageOrder,
  };
  manifest = markDeleted(manifest, "notebook", notebookId);
  await saveManifest(accessToken, context, manifest);
};

export const listPages = async (accessToken, context, ownerId, notebookId) => {
  const order = getPageOrder(context.manifest, notebookId);
  const pages = await Promise.all(order.map((pageId) => readPageFile(accessToken, context.manifest, pageId, ownerId)));
  return pages.filter(Boolean).sort((left, right) => (left.page_order ?? 0) - (right.page_order ?? 0));
};

export const createPage = async (accessToken, context, ownerId, payload) => {
  const page = normalizePage({
    ...payload,
    id: payload.id || createId("page"),
    owner_id: ownerId,
    created_at: nowIso(),
    updated_at: nowIso(),
  }, ownerId);

  let result = await savePageFile(accessToken, context, context.manifest, page);
  const nextOrder = getPageOrder(result.manifest, page.notebook_id).filter((id) => id !== page.id);
  nextOrder.splice(Math.max(0, Math.min(page.page_order, nextOrder.length)), 0, page.id);
  result.manifest = setPageOrder(result.manifest, page.notebook_id, nextOrder);
  result.manifest = await syncNotebookPageCount(accessToken, context, result.manifest, page.notebook_id, ownerId);
  const manifest = await saveManifest(accessToken, context, result.manifest);
  return {
    page: result.page,
    manifest,
  };
};

export const updatePage = async (accessToken, context, ownerId, pageId, payload) => {
  const existing = await readPageFile(accessToken, context.manifest, pageId, ownerId);
  if (!existing) return null;

  const nextPage = normalizePage({
    ...existing,
    ...payload,
    id: pageId,
    owner_id: ownerId,
    updated_at: nowIso(),
  }, ownerId);

  const result = await savePageFile(accessToken, context, context.manifest, nextPage);
  let manifest = result.manifest;

  if (payload.page_order !== undefined) {
    const reordered = getPageOrder(manifest, nextPage.notebook_id).filter((id) => id !== pageId);
    reordered.splice(Math.max(0, Math.min(nextPage.page_order, reordered.length)), 0, pageId);
    manifest = setPageOrder(manifest, nextPage.notebook_id, reordered);
  }

  manifest = await saveManifest(accessToken, context, manifest);
  return {
    page: result.page,
    manifest,
  };
};

export const deletePage = async (accessToken, context, ownerId, pageId) => {
  const existing = await readPageFile(accessToken, context.manifest, pageId, ownerId);
  if (!existing) return;

  const fileId = getFileMapValue(context.manifest, "page_files", pageId);
  if (fileId) {
    await deleteDriveFile(accessToken, fileId);
  }

  let manifest = removeFileMapValue(context.manifest, "page_files", pageId);
  manifest = removePageFromOrder(manifest, existing.notebook_id, pageId);
  manifest = markDeleted(manifest, "page", pageId);
  manifest = await syncNotebookPageCount(accessToken, context, manifest, existing.notebook_id, ownerId);
  await saveManifest(accessToken, context, manifest);
};