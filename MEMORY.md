# AstraFinance-AI: Project Memory & Progress Tracker

This file serves as a persistent context memory for the AI agent. It tracks the current state of the project, what has been implemented, and what the overall architecture looks like.

## Current Project State
The project is currently a functional scaffold with a polished Next.js frontend and a FastAPI backend. The core UI flows for authentication, workspace management, document uploading, and research chat are implemented.

## What Has Been Completed So Far

### 1. Authentication
- Integrated **Firebase Authentication**.
- Supported login methods: **Email/Password**, **Google OAuth**, and **GitHub OAuth**.
- Created dedicated Login and Register pages under `frontend/app/(auth)/`.
- Backend `auth_routes.py` handles token verification and user syncing to MongoDB.

### 2. Frontend Architecture & UI
- Moved to Next.js **App Router** (`app/(app)` for protected routes, `app/(auth)` for public routes).
- Implemented a modern, responsive UI using **Tailwind CSS** and custom components.
- Built a **Dashboard** (`/dashboard`) with user profile, metric cards, and quick actions.
- Built a **Workspace Manager** (`/workspace`) to group documents, chats, and reports.
- Cleaned up legacy directories (`hooks/`, `services/`, `store/`, etc.) to streamline the codebase into `app/`, `components/`, and `lib/`.

### 3. Core Features: Chat & Document Uploads
- Implemented a **Research Chat Interface** (`ChatTab`) inside workspaces.
- Added support for **File & Image Attachments** directly in the chat input. Users can attach multiple files which are previewed and then sent as `multipart/form-data`.
- Built the backend endpoint `POST /workspaces/{id}/chat` to accept Form data (message) and File data (attachments) simultaneously.
- Implemented **Document Processing UI**, allowing users to upload financial PDFs and track their indexing status.

### 4. Backend Architecture
- **FastAPI** scaffold running on `uvicorn`.
- MongoDB client setup for persistence (`mongo_client.py`).
- API routes structured logically (`auth_routes.py`, `workspace_routes.py`, `health_routes.py`).
- Setup for the Multi-Agent pipeline (Document, Extraction, Research, Comparison, Red Flag, Report agents) is scaffolded in `backend/app/agents/` but awaits full LLM/RAG wiring.

### 5. Documentation
- Comprehensive documentation exists in the `docs/` folder.
- Contains architecture diagrams, DFDs, sequence diagrams, API flows, and PRDs.
- `README.md` serves as the primary entry point outlining the product vision and component architecture.

---

## Agent Guidelines for Future Tasks
1. **Check this file first**: Before starting a new feature, review `MEMORY.md` to understand the current capabilities.
2. **Backend Changes**: Keep logic encapsulated in its respective domain (e.g., `app/rag/`, `app/agents/`, `app/api/`).
3. **Frontend Changes**: Ensure new components follow the existing UI design system (Tailwind, clean cards, modern aesthetics).
4. **Updates**: Whenever a significant feature is completed, update this `MEMORY.md` file so the context remains fresh.
