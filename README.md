# Leafnote

Leafnote is a Vite + React notes app with a Node.js backend API.

## Tech Stack

- Frontend: React 18, Vite 6, Tailwind CSS, TanStack Query
- Backend: Express 4, JSON file persistence

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run backend API

```bash
npm run server:dev
```

Backend runs at:

```text
http://localhost:8787
```

Health check:

```text
http://localhost:8787/api/health
```

### Run frontend app

In a second terminal:

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

The frontend proxies `/api/*` requests to `http://localhost:8787` in development.

## Environment Variables

Copy `.env.example` to `.env` if needed.

- `VITE_API_BASE_URL`:
	- Optional for local development (proxy handles it)
	- Required for deployed frontend if backend is on another domain
	- Example: `https://leafnote-backend.onrender.com/api`

- `CORS_ORIGIN` (backend):
	- Comma-separated allow-list for browser origins
	- Local example: `http://localhost:5173`

## Deploy Backend on Render

This repo includes `render.yaml` for the backend web service.

### Option A: Blueprint deploy (recommended)

1. Push this repository to GitHub.
2. In Render, create a Blueprint from the repo.
3. Render reads `render.yaml` and creates `leafnote-backend`.
4. Set `CORS_ORIGIN` in Render to your frontend URL.

### Option B: Manual web service

Use these settings in Render:

- Environment: `Node`
- Build command: `npm install`
- Start command: `npm run server`

Then set env var:

- `CORS_ORIGIN=https://your-frontend-domain.com`

## Frontend + Backend Hosting

If frontend is hosted on Render Static Site, set:

- `VITE_API_BASE_URL=https://leafnote-backend.onrender.com/api`

If frontend is hosted elsewhere (for example GitHub Pages), use the same pattern with your backend URL.

## Build and Preview Frontend

```bash
npm run build
npm run preview
```
