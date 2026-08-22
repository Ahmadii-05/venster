# Demo Script — Workflow-Embedded Micro-Hubs

**Duration**: ~5 minutes  
**Prerequisites**: `docker compose up --build` completed, all 3 services running  
**Screens needed**: VS Code (left half), Browser (right half)

---

## Pre-Demo Checklist (30 seconds before starting)

Run the smoke test to confirm everything is healthy:

```bash
bash scripts/smoke-test.sh
```

Open browser to http://localhost:4173. Have VS Code open with any source file.

---

## Step 1 — Login & Dashboard (30 seconds)

**Browser**: http://localhost:4173/login

1. Show the login page — clean, minimal UI
2. Click "Register" → create account "Demo User" / demo@test.com / password123
3. Land on the Dashboard showing "My Workspaces" (empty)

> **Say**: *"This is the web dashboard — think of it as your team's capsule hub. Let's create a workspace and project."*

---

## Step 2 — Create Workspace & Project (30 seconds)

**Browser**: Dashboard page

1. Click "+ New Workspace" → name it "Demo Workspace"
2. Click into the workspace → see empty project list
3. Click "+ New Project" → name it "Demo Project"
4. Project appears in the list

> **Say**: *"Workspace = team. Project = repo. Now let's create a capsule from VS Code."*

---

## Step 3 — Create Capsule from VS Code (45 seconds)

**VS Code**: Open any source file (e.g., a `.java` or `.ts` file)

1. Select a block of code (3-5 lines)
2. Open Command Palette (`Ctrl+Shift+P`) → run **"Micro-Hubs: Create Capsule from Selection"**
3. Extension prompts for a title → type "Bug in this method"
4. Extension prompts for priority → select "HIGH"
5. Console log shows: "Capsule created: <id>"

> **Say**: *"The capsule is now attached to this exact code location. Let's check the dashboard."*

---

## Step 4 — Capsule Appears in Dashboard (15 seconds)

**Browser**: Navigate to Demo Workspace → Demo Project

1. Click the project to see the capsule list
2. Show the new capsule with **OPEN** status (green badge)
3. Show the anchor context: file path, line range, selected code snippet

> **Say**: *"It appears live — same capsule, same code context, created from VS Code."*

---

## Step 5 — Comment & Auto-Transition (30 seconds)

**Browser**: Click into the capsule detail view

1. Post a comment: "I think the issue is a null reference"
2. Show that status auto-moved from **OPEN** → **IN_REVIEW** (blue badge)

> **Say**: *"The first comment automatically moves it to IN_REVIEW — the lifecycle is enforced server-side."*

---

## Step 6 — Resolve the Capsule (30 seconds)

**Browser**: Capsule detail view

1. Click "→ ANSWERED" status button (only valid next-states shown)
2. Show status is now **ANSWERED**
3. Click "✓ Resolve" button (visible because current user is the owner)
4. Enter final solution: "Added null check before accessing the object"
5. Click confirm → status becomes **RESOLVED** (green badge)

> **Say**: *"Only the reviewer or workspace admin can resolve. The AI knowledge engine kicks in automatically now."*

---

## Step 7 — AI Knowledge Appears (30 seconds)

**Browser**: Capsule detail view (still on the resolved capsule)

1. Wait ~5-10 seconds for async AI processing
2. Show the "📚 View generated knowledge" link appear (or "⏳ Generating..." if still processing)
3. Click the link → Knowledge detail view shows:
   - **Title**: AI-generated title
   - **Summary**: What the issue was about
   - **Root Cause**: Why it happened
   - **Solution**: How it was fixed
   - **Category**: BUG, PERFORMANCE, etc.
   - **Tags**: auto-extracted

> **Say**: *"The LLM analyzed the capsule context, comments, and resolution — and generated structured knowledge automatically."*

> **Fallback**: If the LLM call is slow (>15s), say *"In production with a faster model, this takes 2-3 seconds"* and move on. The knowledge will appear on refresh.

---

## Step 8 — Semantic Search (30 seconds)

**Browser**: Click "🔍 Knowledge" in the sidebar

1. Type a query using **different phrasing** than the original capsule:
   - If capsule was about "null reference" → search "how to handle missing values"
2. Show the knowledge item appears in search results
3. Show the relevance — pgvector cosine similarity found it despite different words

> **Say**: *"This isn't keyword search — it's semantic search using vector embeddings. Different words, same concept."*

**VS Code**: Run "Micro-Hubs: Search Knowledge" command

1. Type the same query
2. Show results in quick pick → same results as the dashboard

> **Say**: *"Same knowledge base, accessible from both the dashboard and the editor."*

---

## Step 9 — Notifications (15 seconds)

**Browser**: Point to the bell icon 🔔 in the top-right header

1. Show the unread count badge
2. Click to expand notification dropdown
3. Show notifications: "Capsule assigned", "Capsule resolved"

> **Say**: *"Real-time notifications for assignments, comments, and resolutions."*

---

## Step 10 (Optional) — Isolation Demo (20 seconds)

If time permits, show that a non-member sees nothing:

1. Open incognito/private browser window
2. Register a new user "Outsider" 
3. Show the dashboard is empty — no workspaces, no projects, no capsules

> **Say**: *"Complete workspace isolation — outsiders see nothing."*

---

## Timing Summary

| Step | Duration | Running Total |
|------|----------|:-------------:|
| 1. Login | 0:30 | 0:30 |
| 2. Workspace + Project | 0:30 | 1:00 |
| 3. VS Code capsule | 0:45 | 1:45 |
| 4. Dashboard sync | 0:15 | 2:00 |
| 5. Comment + auto-transition | 0:30 | 2:30 |
| 6. Resolve | 0:30 | 3:00 |
| 7. AI knowledge | 0:30 | 3:30 |
| 8. Semantic search | 0:30 | 4:00 |
| 9. Notifications | 0:15 | 4:15 |
| 10. Isolation (optional) | 0:20 | 4:35 |

**Total: ~4 minutes 35 seconds** (with buffer for pauses and transitions)

---

## Key Points to Emphasize

1. **Workflow-embedded**: Capsules are tied to exact code locations, not separate issue trackers
2. **Full lifecycle enforcement**: Status transitions are validated server-side — can't skip steps
3. **Cross-client sync**: VS Code ↔ Dashboard are always in sync via the same API
4. **AI-powered knowledge**: Every resolution automatically generates searchable knowledge
5. **Semantic search**: Vector embeddings enable concept-level search, not just keywords
6. **Security**: Workspace isolation, role-based access, JWT auth

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend shows "Failed to fetch" | Backend not running — check `docker ps` |
| Capsule doesn't appear in dashboard | Refresh the page — polling is every 30s |
| "⏳ Generating..." stays forever | Check `docker logs venster-backend-1` for LLM errors — may need valid `LLM_API_KEY` |
| VS Code extension can't connect | Ensure backend is on `localhost:8082`, check extension settings |
| Knowledge search returns empty | AI knowledge generation may not have run — check if capsule was actually resolved |
