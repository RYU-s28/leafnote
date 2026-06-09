const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const toQueryString = (query) => {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
};

const parseResponse = async (response) => {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") && text ? JSON.parse(text) : text;
  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.error?.message || response.statusText || "Drive request failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
};

const driveRequest = async (accessToken, path, options = {}) => {
  if (!accessToken) {
    const error = new Error("Google Drive access is required. Sign in with Google to continue.");
    error.status = 403;
    throw error;
  }

  const { method = "GET", query, body, headers = {}, upload = false } = options;
  const base = upload ? DRIVE_UPLOAD_BASE : DRIVE_API_BASE;

  const response = await fetch(`${base}${path}${toQueryString(query)}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...headers,
    },
    body,
  });

  return parseResponse(response);
};

export const listDriveFiles = async (accessToken, query) => {
  const data = await driveRequest(accessToken, "/files", {
    query: {
      pageSize: 1000,
      fields: "files(id,name,mimeType,parents,appProperties,modifiedTime,trashed)",
      spaces: "drive",
      ...query,
    },
  });
  return data.files || [];
};

export const getDriveFile = async (accessToken, fileId, fields = "id,name,mimeType,parents,modifiedTime") => {
  return driveRequest(accessToken, `/files/${fileId}`, {
    query: { fields },
  });
};

export const createDriveFolder = async (accessToken, { name, parentId, appProperties }) => {
  return driveRequest(accessToken, "/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
      appProperties,
    }),
    query: { fields: "id,name,parents,appProperties" },
  });
};

const multipartBody = (metadata, content, mimeType) => {
  const boundary = `leafnote_${Date.now().toString(36)}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return {
    boundary,
    body,
  };
};

export const createJsonDriveFile = async (accessToken, { name, parentId, data, appProperties }) => {
  const { boundary, body } = multipartBody({
    name,
    mimeType: "application/json",
    parents: parentId ? [parentId] : undefined,
    appProperties,
  }, JSON.stringify(data, null, 2), "application/json");

  return driveRequest(accessToken, "/files", {
    method: "POST",
    upload: true,
    query: { uploadType: "multipart", fields: "id,name,parents,appProperties" },
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
};

export const updateJsonDriveFile = async (accessToken, fileId, data) => {
  const { boundary, body } = multipartBody({}, JSON.stringify(data, null, 2), "application/json");

  return driveRequest(accessToken, `/files/${fileId}`, {
    method: "PATCH",
    upload: true,
    query: { uploadType: "multipart", fields: "id,name,parents,appProperties,modifiedTime" },
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
};

export const readJsonDriveFile = async (accessToken, fileId) => {
  return driveRequest(accessToken, `/files/${fileId}`, {
    query: { alt: "media" },
  });
};

export const deleteDriveFile = async (accessToken, fileId) => {
  await driveRequest(accessToken, `/files/${fileId}`, {
    method: "DELETE",
  });
};

export const FOLDER_MIME_TYPE = FOLDER_MIME;