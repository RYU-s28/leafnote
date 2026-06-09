# LeafNote Drive Architecture

## Current backend shape

- Firebase Auth is the source of truth for identity.
- Firestore stores only lightweight metadata in `users/{uid}` and `loginLogs/{logId}`.
- Google Drive stores notebook, page, and attachment payloads inside the user's own `LeafNote` folder.

## Firestore collections

### `users/{uid}`

```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "displayName": "LeafNote User",
  "photoURL": "https://...",
  "provider": "google.com",
  "created_at": "2026-06-09T00:00:00.000Z",
  "last_login": "2026-06-09T00:00:00.000Z",
  "driveFolderId": "drive-folder-id",
  "appVersion": "drive-v1",
  "migration": {
    "status": "completed",
    "legacy_owner_id": "user_123",
    "migrated_notebook_count": 3,
    "migrated_page_count": 12,
    "migrated_at": "2026-06-09T00:00:00.000Z"
  }
}
```

### `loginLogs/{logId}`

```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "provider": "google.com",
  "userAgent": "Mozilla/...",
  "login_at": "2026-06-09T00:00:00.000Z"
}
```

## Google Drive layout

```text
LeafNote/
  manifest.json
  notebooks/
    notebook_{id}.json
  pages/
    page_{id}.json
  attachments/
    image_{id}.png
    file_{id}.pdf
```

## `manifest.json`

```json
{
  "schema_version": 1,
  "sync_version": 4,
  "last_updated_at": "2026-06-09T00:00:00.000Z",
  "folders": {
    "root": "drive-root-id",
    "notebooks": "drive-notebooks-id",
    "pages": "drive-pages-id",
    "attachments": "drive-attachments-id"
  },
  "notebooks": [],
  "notebook_files": {},
  "page_files": {},
  "page_order": {},
  "deleted_items": []
}
```

## Migration path

1. User signs in with Firebase Auth and grants Google Drive scope.
2. Backend upserts `users/{uid}` and ensures the Drive folder structure exists.
3. Backend matches the legacy Firestore single-document user by email.
4. Legacy notebooks and pages are exported into Drive JSON files while preserving IDs.
5. Legacy `notebooks` and `pages` entries are removed from the single-document store after successful import.
6. Firestore keeps only metadata and migration state.

## Required frontend env vars

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID` if your Firebase setup requires it
- `VITE_API_BASE_URL` when the backend is hosted on another origin