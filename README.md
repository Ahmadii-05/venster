# Workflow-Embedded Micro-Hubs

A workflow-embedded collaboration platform that lets development teams create, discuss, and resolve code-level issues (called "capsules") directly tied to source code artifacts. When a capsule is resolved, an AI knowledge engine automatically extracts structured knowledge and enables semantic search across resolutions.

## What It Does

Developers select a code snippet in VS Code, create a "capsule" attached to that exact code location, and invite teammates to discuss and resolve it. When resolved, the system uses an LLM (Groq) to automatically extract a structured knowledge item (title, summary, root cause, solution, tags) and stores it with a vector embedding for semantic search — turning every resolved issue into searchable team knowledge.

## Prerequisites

- **Docker Desktop** (with Docker Compose)
- **Java 17+** (only needed for local development without Docker)
- **Node.js 20+** (only needed for local frontend development)
- **VS Code** (for the extension)

## Quick Start

1. **Clone the repo** and navigate to the project root:
   ```bash
   git clone <repo-url> && cd venster
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your values:
   - `JWT_SECRET` — any random string (min 32 characters)
   - `LLM_API_KEY` — your Groq API key from [console.groq.com](https://console.groq.com)

3. **Start everything:**
   ```bash
   docker compose up --build
   ```

4. **Open in browser:**
   - **Dashboard**: http://localhost:4173
   - **Backend API**: http://localhost:8082

## Default Credentials

After starting, register a new account through the dashboard at http://localhost:3001/register.

For testing, you can register multiple users and create workspaces/projects through the UI.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | `default-secret-change-in-production` | Secret key for JWT token signing |
| `LLM_API_KEY` | Yes | — | Groq API key for AI knowledge extraction |
| `LLM_BASE_URL` | No | `https://api.groq.com/openai/v1` | LLM API base URL |
| `VITE_API_BASE_URL` | No | `http://localhost:8082` | Backend API URL for the frontend |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend  │────▶│    Backend   │────▶│  PostgreSQL +     │
│  (React/Vite│     │ (Spring Boot)│     │  pgvector        │
│   nginx)    │     │   :8082      │     │  :5432           │
│   :4173     │     │              │     │                  │
└─────────────┘     └──────────────┘     └──────────────────┘
       ▲                                        │
       │            ┌──────────────┐           │
       └────────────│  VS Code     │           │
                    │  Extension   │───────────┘
                    └──────────────┘
```

## VS Code Extension

The extension provides in-editor capsule management.

### Install for Development

1. Open the `vscode-extension/` folder in VS Code
2. Press **F5** to launch the Extension Development Host
3. In the new VS Code window, open any file, select some code, and run:
   - `Micro-Hubs: Create Capsule from Selection`
   - `Micro-Hubs: View Capsules for Current File`
   - `Micro-Hubs: Reply to Capsule`
   - `Micro-Hubs: Search Knowledge`

### How It Works

- On first use, the extension prompts for login (email/password)
- Tokens are stored securely in VS Code's SecretStorage API
- Create a capsule → it appears in both VS Code and the web dashboard
- Status bar shows unread notification count (polls every 30s)

## Local Development (without Docker)

### Backend

```bash
cd microhubs-backend
mvn clean package -DskipTests
java -jar target/microhubs-backend-1.0.0.jar
```

Requires PostgreSQL with pgvector running on `localhost:5432`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:3000 with hot reload.

## Capsule Lifecycle

```
OPEN → IN_REVIEW → ANSWERED → RESOLVED
                ↘            ↗
                ARCHIVED (terminal)
```

- **OPEN**: New capsule, waiting for discussion
- **IN_REVIEW**: Discussion active (auto-set on first comment)
- **ANSWERED**: Solution proposed, awaiting resolution
- **RESOLVED**: Final resolution by assigned reviewer or workspace admin/owner
- **ARCHIVED**: Closed without resolution

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| Backend | Java 17, Spring Boot 3.2, Spring Security, JPA |
| Database | PostgreSQL 16 + pgvector (vector similarity search) |
| AI | Groq API (LLM extraction) + local n-gram embeddings |
| Extension | TypeScript, VS Code Extension API |
| Infrastructure | Docker Compose, nginx |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces` | List user's workspaces |
| POST | `/api/workspaces/{id}/members` | Add member |
| POST | `/api/projects?workspaceId=X` | Create project |
| GET | `/api/projects?workspaceId=X` | List projects |
| POST | `/api/artifacts` | Create artifact |
| POST | `/api/capsules` | Create capsule |
| GET | `/api/capsules?projectId=X` | List capsules (filterable by status) |
| PATCH | `/api/capsules/{id}` | Update status/reviewer |
| POST | `/api/capsules/{id}/comments` | Add comment |
| POST | `/api/capsules/{id}/resolve` | Resolve capsule |
| GET | `/api/knowledge/search?q=X` | Semantic knowledge search |
| GET | `/api/notifications` | List notifications |

## License

Built for the 4-day MVP hackathon.
