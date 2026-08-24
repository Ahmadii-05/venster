# Code Review — Workflow-Embedded Micro-Hubs (`venster`)

**Date:** 2026-08-23
**Scope:** Whole project — `microhubs-backend/` (live Spring Boot backend), `frontend/` (React/Vite), `vscode-extension/` (TypeScript), `backend/` (legacy), database schema, Docker/infra, CI/CD, and repo hygiene.
**Method:** Static review of all source under each component (excluding build artifacts). Every finding below cites the file and line it was observed in. The four headline findings (capsule IDOR, clean-deploy boot failure, default JWT secret, frontend build break) were independently re-verified against the source before publishing.

---

## Executive Summary

This is a genuinely impressive amount of coherent, well-layered software for a 4-day hackathon MVP: a clean feature-package backend, stateless JWT auth, a pgvector-backed knowledge engine with LLM extraction, a React dashboard, and a VS Code extension that all speak the same API. The fundamentals are mostly sound — no SQL injection, BCrypt password hashing, an enforced capsule state machine, React auto-escaping (no XSS surface), and secrets kept out of git.

However, there are **two issues that should block any real deployment**, and a cluster of high-severity problems around them:

1. **Broken access control on capsules (IDOR).** Any logged-in user can read *and modify* any capsule in any workspace — including reading other teams' private source-code snippets and user emails. This is a real, exploitable authorization hole, not a theoretical one.
2. **The stack does not boot from a clean checkout.** `docker compose up` seeds the database with an outdated `schema.sql` that is missing columns and tables the JPA entities require, while the backend runs `ddl-auto: validate` — so Hibernate aborts startup. CI passes only because it uses a *different*, complete test schema.

On top of that: a publicly-known default JWT secret, the frontend production build is currently broken by a scope bug, the core semantic-search feature has no vector index, and ~75% of the files tracked in git are build artifacts, backups, or a fully duplicated dead backend (which also carries hardcoded credentials in history).

None of this is unusual for a hackathon MVP, and the good news is that the two critical items and most of the highs are small, localized fixes. A prioritized plan is at the end.

### Findings by severity

| Severity | Count | Examples |
|----------|-------|----------|
| **Critical** | 2 | Capsule IDOR (read + write); clean deploy fails to boot |
| **High** | 6 | Default JWT secret; comment/resolution IDOR reads; JWT in localStorage; frontend build break; no DB indexes; dead `backend/` with committed secrets |
| **Medium** | ~16 | Async/transaction race; no LLM timeouts; JSON injection; broken delete cascades; Docker/compose gaps; email lost on refresh; webview CSP |
| **Low** | ~25 | Dead code, validation gaps, accessibility, CI hardening, duplication |

### Remediation status — follow-up pass (2026-08-23)

A remediation pass after the initial review fixed **both Critical findings and most of the High cluster** (scoped deliberately to Critical + High). Backend edits are code-verified by read-back (the backend cannot be compiled in the review sandbox — no Maven/Docker); the **frontend type-checks clean** (`tsc -b --force` exits 0). Two things still need the author's machine: run `mvn test` for the backend, and boot the full stack once from an empty volume to confirm C2 end-to-end.

| ID | Finding | Status |
|----|---------|--------|
| C1 | Capsule IDOR (read + write) | ✅ Fixed — membership check on `getCapsule`/`listCapsules`/`updateCapsule` + reviewer validation |
| C2 | Clean deploy fails to boot (schema/entity mismatch) | ✅ Fixed — `schema.sql` rewritten to the full entity set; Flyway still recommended long-term |
| H1 | Publicly-known default JWT secret | ✅ Fixed — default removed, fail-fast on unset/weak secret |
| H2 | Comment/resolution IDOR reads | ✅ Fixed — same membership check as the write paths |
| H3 | JWT in `localStorage` | ◐ Hardened — persisted surface minimized + dead code removed; httpOnly-cookie migration deferred (documented) |
| H4 | Frontend build break (`ws` scope) | ✅ Fixed — `ws` hoisted; `tsc -b` now passes |
| H5 | No DB indexes / no vector ANN index | ✅ Fixed — FK/lookup btree indexes + HNSW `vector_cosine_ops` |
| H6 | Dead `backend/` folder | ✅ Removed — deleted from the tree (rotate its historical secrets) |
| H7 | Committed build artifacts | ◐ `.gitignore` extended + `.gitattributes` added; `git rm --cached` pending (commands supplied) |
| M4 | JSON injection into notification context | ✅ Fixed — payload built with Jackson |
| M17 | `request()` parses JSON unconditionally | ◐ Fixed in web frontend; the VS Code extension mirror is still open |

Everything else (remaining Medium/Low) is unchanged and open by design. Individual findings below carry an inline **Status** line where addressed.

---

## Critical

### [C1] Broken object-level authorization on capsules (IDOR — read and write)
**Where:** `microhubs-backend/src/main/java/com/microhubs/capsule/CapsuleService.java:84` (`listCapsules`), `:108` (`getCapsule`), `:116` (`updateCapsule`)

The service has a `verifyWorkspaceMembership(...)` helper (line 198) and `createCapsule` calls it correctly (line 67) — but the read and update paths do not.

- `getCapsule(id)` (line 108) loads a capsule by UUID and returns the **full entity** with no membership check. Because all `@ManyToOne` relations are `EAGER` and only `passwordHash` is `@JsonIgnore`, the JSON response serializes the entire object graph: the anchor's `selectedText` (**the raw source-code snippet**), file path, the owning workspace, and author/reviewer/creator **email addresses**. Any authenticated user can read any other team's private code and enumerate user emails by iterating capsule IDs.
- `listCapsules(projectId, …)` (line 84) does the same for every capsule under an arbitrary `projectId`.
- `updateCapsule(id, …)` (line 116) loads the caller at line 118 but **never uses it for authorization**. Any logged-in user can drive the state machine of, retitle, re-prioritize, or assign a reviewer to *any* capsule in *any* workspace. The reviewer-assignment branch (line 141) also accepts *any* `reviewerId` with no membership validation and fires a notification at them — usable to spam arbitrary users.

**Fix:** In all three methods, resolve the capsule's workspace via the anchor chain (`anchor.getArtifactVersion().getArtifact().getProject().getWorkspace()`, exactly as `createCapsule` does) and call `verifyWorkspaceMembership(workspace, user)` before returning or mutating. Validate that any supplied `reviewerId` is a member of that workspace. Consider returning a DTO that omits `selectedText` and the full user/workspace graph. This same one-line-per-method omission is the root of findings H2 and H3 below — fixing the pattern closes the entire IDOR cluster.

**Status (2026-08-23): ✅ Fixed.** `getCapsule`, `listCapsules`, and `updateCapsule` now resolve the workspace via the anchor chain (new `workspaceOf(capsule)` helper) and call `verifyWorkspaceMembership` before returning or mutating; the reviewer-assignment branch validates the `reviewerId` is a member of the same workspace. The DTO-shaping suggestion (omitting `selectedText`/full graph) is not yet done — a sensible defense-in-depth follow-up.

### [C2] The stack cannot boot from a clean `docker compose up` (entity/schema mismatch)
**Where:** `microhubs-backend/src/main/resources/application.yml:12` (`ddl-auto: validate`); `docker-compose.yml:10` (mounts only `schema.sql` as the DB init script); `microhubs-backend/database/schema.sql` (the "Phase 0" schema); entities `knowledge/KnowledgeItem.java:62,67,70,74`, `auth/User.java:23`, `globalqa/GlobalQuestion.java:11`, `globalqa/GlobalAnswer.java:9`, `globalqa/GlobalReport.java:8`

With `ddl-auto: validate`, Hibernate refuses to start if any mapped column or table is missing. The compose-mounted `schema.sql` is an early "Phase 0" draft and is missing everything added later, all of which the entities map:

- `users.platform_moderator` (mapped `NOT NULL` at `User.java:23`)
- `knowledge_items.visibility`, `published_by`, `published_at`, `global_answer_id` (`KnowledgeItem.java:62–74`)
- the `global_questions`, `global_answers`, `global_reports` tables (the entire `globalqa` package)

The `V2__add_knowledge_visibility.sql` migration that would add most of these is **never run** (there is no Flyway/Liquibase dependency, and compose doesn't apply it), and even V2 omits `global_answer_id`. That column exists only in `src/test/resources/schema-test.sql`, which is why the Testcontainers-based CI passes while a real clean boot fails.

**Fix:** Establish one authoritative schema. Preferred: add Flyway (`spring-boot-starter` + `flyway-core`), move a complete `V1__init.sql` (superset of the current test schema, including `global_answer_id`) plus `V2…` into `src/main/resources/db/migration`, and let Flyway own creation at startup. Then delete the divergent hand-maintained `schema.sql`/`schema-test.sql`. Verify by booting the full stack from an empty volume — not just by running tests.

**Status (2026-08-23): ✅ Fixed (interim).** `microhubs-backend/database/schema.sql` (the compose-mounted init script) has been rewritten to the full, entity-accurate schema — it now mirrors `schema-test.sql` (all 16 tables incl. `platform_moderator`, the knowledge visibility columns, and the `global_*` tables) so `ddl-auto: validate` passes on a clean boot. `knowledge_items.resolution_id` is `UUID UNIQUE` (nullable) to match the entity. Flyway was **not** adopted — the two hand-maintained schemas still coexist (now aligned), so the "single source of truth" recommendation stands as a follow-up. Verify by booting from an empty volume before relying on it.

---

## High

### [H1] Publicly-known default JWT signing secret
**Where:** `microhubs-backend/src/main/resources/application.yml:29`; `docker-compose.yml:27`; `microhubs-backend/src/main/java/com/microhubs/security/JwtUtil.java:26`; local `.env` (JWT_SECRET still set to the placeholder)

The HMAC key falls back to the literal string `default-secret-change-in-production`, which is committed to the repo and long enough (35 bytes) that `Keys.hmacShaKeyFor` accepts it, so the app boots on the default without complaint. If the service is ever deployed without `JWT_SECRET` set, **anyone can forge a valid token for any user** (`generateToken` only needs the subject email), fully bypassing auth. Worth noting: your local `.env` still contains the example placeholder (`change-me-to-a-random-32-char-string`), so even local tokens are signed with a predictable, public value.

**Fix:** Remove the default entirely and fail fast at startup if `JWT_SECRET` is unset. Require a random 256-bit+ secret per environment. (Also: `JwtUtil.java:6` imports `Decoders` but never base64-decodes the key, and `getBytes()` uses the platform default charset — minor, but decode a base64 secret explicitly.)

**Status (2026-08-23): ✅ Fixed.** `application.yml` now uses `${JWT_SECRET}` with no default; `docker-compose.yml` uses `${JWT_SECRET:?…}` so compose aborts if it is unset. `JwtUtil` gained a `@PostConstruct` check that throws if the secret is missing or under 32 bytes, and `getSigningKey()`/token signing now use an explicit `StandardCharsets.UTF_8` (no platform-default charset). Note: the local `.env` placeholder should still be replaced with a real random secret, and the CI integration test sets its own 45-char test secret so it is unaffected.

### [H2] IDOR read on comments and resolutions
**Where:** `discussion/DiscussionService.java:84` (`listComments`); `resolution/ResolutionService.java:102` (`getResolution`)

Same class of bug as C1. `listComments` returns a capsule's full discussion thread with no membership check (even though its sibling `postComment` correctly calls `verifyWorkspaceMembership`). `getResolution` returns the resolution `finalSolution` for any capsule ID, while the resolve/write path is properly guarded. Any authenticated user can read any discussion or resolution.

**Fix:** Apply the same `verifyWorkspaceMembership` check used on the corresponding write paths.

**Status (2026-08-23): ✅ Fixed.** `DiscussionService.listComments` now loads the capsule and calls `verifyWorkspaceMembership` before returning the thread; `ResolutionService.getResolution` gained a member-any-role `verifyWorkspaceMembership(capsule, user)` check (mirroring the resolve-write path). Both controllers now pass the caller's email through.

### [H3] Web frontend stores the JWT in `localStorage`
**Where:** `frontend/src/services/api.ts:24,37`

The token is persisted to `localStorage`. Any script running in the origin — an XSS, a compromised npm dependency in the bundle, or a malicious browser extension — can read `localStorage.token` and impersonate the user. Unlike an `httpOnly` cookie, the JS runtime has full access, and the token persists indefinitely with no expiry handling.

**Fix:** Prefer an `httpOnly; Secure; SameSite` cookie set by the backend. If it must stay client-side, keep it in memory only and add token-expiry handling. (The XSS *surface* is currently small — see positives — but this remains the highest-value client-side hardening item.)

**Status (2026-08-23): ◐ Partially hardened.** The token still lives in `localStorage` (the full fix is an httpOnly cookie, a coordinated backend+frontend change, deferred and documented inline in `api.ts`). This pass minimized the persisted surface: the dead `getStoredUser`/`_user` state and the redundant `localStorage["user"]` write were removed (`setAuthToken` now stores only the token), and a `SECURITY NOTE` documents the cookie migration. The module-load `JSON.parse` that could brick app boot on corrupted storage is gone as a side effect.

### [H4] Frontend production build is broken (variable out of scope)
**Where:** `frontend/src/pages/DashboardPage.tsx:74` vs `:125`

`const ws` is declared inside the `try` block that closes at line 119; it is then referenced at line 125 (`if (ws && ws.length > 0)`), outside that block. `const` is block-scoped, so this is a TypeScript compile error (`TS2304: Cannot find name 'ws'`) — `npm run build` (`tsc -b && vite build`) fails. In `vite dev` (no type-check) it throws a runtime `ReferenceError`, so the Knowledge-Health panel silently never renders. (`ProfilePage.tsx:42` uses the same pattern correctly, inside its try block.)

**Fix:** Hoist `let ws` above the `try`, or move the knowledge-health block inside it.

**Status (2026-08-23): ✅ Fixed.** `ws` is now declared as `let ws: Workspace[] = []` at the function scope above the `try` (so the non-blocking knowledge-health fetch after the `finally` can read it). `npm run build`'s type-check step (`tsc -b --force`) now exits 0. (The subsequent `vite build` fails in the review sandbox only because `node_modules` was installed on Windows and the Linux `rolldown` native binary is absent — not a code issue.)

### [H5] No database indexes anywhere — including no vector ANN index
**Where:** `microhubs-backend/database/schema.sql` (no `CREATE INDEX` in any SQL file)

`knowledge_items.embedding vector(1536)` has no `ivfflat`/`hnsw` index, so every similarity search sequentially scans and distance-computes the whole table — the product's core "find similar knowledge" feature will not scale past a demo. No foreign-key column is indexed either (`workspace_members`, `projects.workspace_id`, `comments.capsule_id`, `notifications.user_id`, `global_answers.question_id`, …), causing full scans on joins and slow cascade deletes.

**Fix:** Add an ANN index matching the query's distance operator, e.g. `CREATE INDEX ON knowledge_items USING hnsw (embedding vector_cosine_ops);`, plus btree indexes on every FK column and hot filters (`capsules.status`, `knowledge_items.visibility`).

**Status (2026-08-23): ✅ Fixed.** The rewritten `schema.sql` adds an HNSW index `USING hnsw (embedding vector_cosine_ops)` — `vector_cosine_ops` was chosen because `KnowledgeRepository`'s similarity queries order by the cosine-distance operator `<=>`. It also adds btree indexes on the FK/lookup columns (`workspace_members`, `projects.workspace_id`, the artifact chain, `capsules.*`, `comments.*`, `notifications(user_id, read)`, the `global_*` tables, `audit_log`) and hot filters (`capsules.status`, `knowledge_items.visibility`/`category`).

### [H6] Dead `backend/` folder committed — with hardcoded credentials in history
**Where:** `backend/` (a full, obsolete duplicate of the backend); secrets at `backend/src/main/resources/application.yml:8` (DB password `041410`) and `:22` (hardcoded JWT secret)

`backend/` is an abandoned earlier copy (30 source files, the pre-knowledge subset, port 8083, `ddl-auto: update`, no pgvector dependency). It is not built by compose and not referenced anywhere in the README — pure dead code. It also commits a personal DB password and a hardcoded JWT secret into git history, and it invites edits to the wrong tree.

**Fix:** `git rm -r backend/` and commit. Rotate `041410` and that JWT secret if either is reused in any real environment (git history retains them). See H7 for the broader hygiene cleanup.

**Status (2026-08-23): ✅ Removed.** The `backend/` folder has been deleted from the working tree and is no longer tracked (`git ls-files` reports 0 files under `backend/`); `/backend/` was also added to `.gitignore` to prevent it returning. ⚠️ The DB password `041410` and the hardcoded JWT secret still exist in **git history** — rotate both if they were ever used in a real environment, since deletion does not purge history.

---

## Medium

Backend / correctness:

- **[M1] Async knowledge extraction races the resolving transaction.** `knowledge/KnowledgeService.java:60` listener is `@Async` but the event is published inside the still-open resolve transaction (`resolution/ResolutionService.java:87`). The async thread reloads the resolution and typically can't see the uncommitted row → "Resolution not found", swallowed and logged → knowledge silently never generated. **Fix:** `@TransactionalEventListener(phase = AFTER_COMMIT)` + `@Async`.
- **[M2] `@Async` self-invocation is a no-op.** `globalqa/GlobalQAService.java:212` is called via `this.` from `acceptAnswer` (line 127), bypassing the Spring proxy — so the slow LLM call runs synchronously on the HTTP thread and blocks the response. **Fix:** move it to a separate bean or trigger via an event.
- **[M3] LLM HTTP client has no timeouts.** `knowledge/OpenAiLlmClient.java:27,83` — no connect or request timeout. A stalled Groq call hangs indefinitely and can exhaust the small async pool (`application.yml:18`, max 4). **Fix:** set `connectTimeout` and per-request `timeout`.
- **[M4] JSON injection into notification context.** `capsule/CapsuleService.java:149` builds JSONB by string-concatenating the user-controlled capsule title. A `"` in a title breaks the JSON (500s on reviewer assignment); a crafted title injects arbitrary keys the frontend later renders. **Fix:** build the payload with Jackson. **✅ Fixed (2026-08-23):** the reviewer-assignment notification context is now serialized with a Jackson `ObjectMapper` (`toJson(Map.of("capsuleId", …, "title", …))`), so titles are safely escaped.
- **[M5] Error handler leaks internals + wrong status codes.** `common/GlobalExceptionHandler.java:67` returns `"…" + ex.getMessage()` as HTTP 500; expected "not found" cases are thrown as bare `RuntimeException`, so legitimate 404s surface as 500s echoing internal messages. `show-sql: true` (`application.yml:13`) is also on. **Fix:** typed `NotFoundException → 404`, don't reflect raw messages, disable SQL logging outside dev.
- **[M6] Prompt injection + unmoderated auto-PUBLIC knowledge.** User text is concatenated into the LLM prompt (`knowledge/OpenAiLlmClient.java:44`). `category` is not validated against its enum (`KnowledgeService` `validateLlmResponse` checks presence only), and accepted global answers are written `visibility = PUBLIC` with `approved = false` (`globalqa/GlobalQAService.java:271`). `SecretRedactor` is correctly applied first but is regex-based and doesn't redact author names/PII. **Fix:** enforce the enum, keep auto-generated items non-public until moderated, delimit untrusted context.
- **[M7] Broken delete cascades.** `schema.sql:72` — `capsules.artifact_anchor_id` references `artifact_anchors` with no `ON DELETE`, while the whole workspace→anchor chain cascades. Deleting a workspace/project cascades down to the anchor, then is blocked by any capsule → the entire delete fails. **Fix:** make the FK lifecycle consistent (e.g. `ON DELETE CASCADE`) or adopt soft-deletes.

Infra / config:

- **[M8] Migrations not wired to deployment; two divergent schemas.** Root cause of C2 (see there). `schema.sql` and `schema-test.sql` have drifted (nullable vs `NOT NULL` on `knowledge_items.resolution_id`, missing tables/columns). **Fix:** adopt Flyway; single source of truth.
- **[M9] Backend Dockerfile isn't self-contained.** `microhubs-backend/Dockerfile` copies a pre-built `target/*.jar`, so `docker compose up --build` fails on a fresh clone unless `mvn package` ran first; also runs as root, ships a full JDK, no `HEALTHCHECK`. **Fix:** multi-stage (Maven build → JRE runtime), non-root `USER`, add healthcheck, pin base images.
- **[M10] Compose lacks restart policies, resource limits, and a backend healthcheck.** `docker-compose.yml` — only `db` has a healthcheck; `frontend` uses `depends_on: backend` without `condition: service_healthy`. **Fix:** add `restart: unless-stopped`, backend healthcheck + gated dependency, and mem/cpu limits.
- **[M11] Live Groq API key sits in the working tree.** `.env:7` (`LLM_API_KEY=gsk_…`). Confirmed **not** committed and **not** in history (`.gitignore` covers `.env`) — good. But a real key in a plaintext file leaks if the folder is zipped/shared for judging. **Fix:** treat as potentially exposed and rotate it; keep only the placeholder in `.env.example` (which is correct today).
- **[M12] `stringtype=unspecified` masks type safety.** `application.yml:6`, `docker-compose.yml:24`. Relied on to write `TEXT[]`/`JSONB`/`vector`/enums as strings; disables server-side type checking. **Fix:** acceptable pragmatically, but document it; longer term bind proper SQL types.
- **[M13] Frontend API base URL is baked into the bundle at build.** `frontend/Dockerfile:7`, `docker-compose.yml:37` — Vite inlines `VITE_API_BASE_URL` (default `http://localhost:8082`) into static JS, so any non-local deployment ships a broken frontend without a rebuild. **Fix:** serve runtime config (nginx-templated `/config.js`) or reverse-proxy `/api`.

Frontend / extension:

- **[M14] User email lost on refresh → breaks permission-gated UI.** `frontend/src/context/AuthContext.tsx:17` restores the token but initializes `email` to `null`; `getStoredUser()` (`api.ts:48`) exists but is never called. After a hard refresh, `isReviewer`/`canResolve`/the ADMIN publish toggle (`CapsuleDetailPage.tsx:74`) and `isAuthor` checks (`GlobalQAPage.tsx:260`) silently fail. **Fix:** initialize `email` from `getStoredUser()` or decode the JWT.
- **[M15] Extension webview: no CSP + several unescaped fields.** `vscode-extension/src/extension.ts` builds raw HTML with no CSP/nonce; author name/email (`:195,208,211`), knowledge `category` (`:368`), `tags` (`:376`), `status`/`priority` (`:207`) are interpolated unescaped. `enableScripts:false` blocks JS execution (so impact is limited to HTML injection / remote image loads / phishing), but the missing CSP is an anti-pattern. **Fix:** add a strict CSP meta tag and run every interpolated value through `escapeHtml`.
- **[M16] Uncancelled recursive knowledge poll.** `frontend/src/pages/CapsuleDetailPage.tsx:50` re-schedules `setTimeout` up to 10× at 3s; the id is never stored and the effect (`:89`) has no cleanup → setState-after-unmount and overlapping polls. **Fix:** store the timeout id in a ref, clear it on cleanup.
- **[M17] `request()` parses JSON unconditionally.** `frontend/src/services/api.ts:77` (mirrored in the extension `api.ts:106`) always calls `res.json()`, throwing on `204`/empty/HTML responses (e.g. `notificationApi.markAsRead`, the report/hide endpoints, backend 500 pages). **Fix:** guard on status/`content-type`, fall back to `res.text()`. **◐ Fixed in web frontend (2026-08-23):** `request()` now reads `res.text()` first, returns `undefined` for empty bodies (e.g. `204`), and throws a clear status-carrying error on non-JSON responses instead of an opaque parse error. The VS Code extension's mirrored `api.ts` was out of scope and is still open.
- **[M18] Extension 401 doesn't clear the stored token.** `vscode-extension/src/api.ts:98` nulls the in-memory token but leaves `microhubs.token` in SecretStorage, so the next activation restores the expired token and the 30s poller keeps hitting the API with it. **Fix:** delete the secret and stop the poller on 401.

---

## Low

Grouped for brevity; each is a small, isolated cleanup.

**Backend:** duplicate/uncoordinated CORS config (`SecurityConfig.java:102` + `ApplicationConfig.java:10`); dead role system — `User.role` is `@Transient`, always `MEMBER`, the JWT `role` claim is unused (`User.java:26`, `AuthController.java:66`); `acceptAnswer` doesn't verify the answer belongs to the question (`GlobalQAService.java:96`); inconsistent login validation — min length 6 vs 8, no `@NotBlank` (`LoginRequest.java:8`); global Q&A write endpoints lack `@Valid` (`GlobalQAController.java:24`); workspace-scoped knowledge search ignores `workspaceId` then filters by all memberships (`KnowledgeService.java:229`); JWT has no issuer/audience/revocation and a token for a deleted user throws a 500 from `JwtAuthFilter.java:44`; dead code — unused autowires/vars/imports (`KnowledgeService.java:50`, `CapsuleService.java:118`, `JwtUtil.java:6`).

**Frontend:** N+1 sequential fetches in nested loops (`DashboardPage.tsx:80`, `ProfilePage.tsx:30`); fake/non-deterministic UI data — random tags/upvotes, hardcoded "Public" badge (`CapsuleCard.tsx:40,75`, `DashboardPage.tsx:297`); dead logic in `NewCapsuleModal` — `visibility` collected but never sent, no real debounce despite the comment (`:29,103`); pervasive accessibility gaps — no `aria-*`/`role`, `Modal` has no focus trap or Escape-to-close; `target="_blank"` without `rel="noopener"` (`NewCapsuleModal.tsx:486`); `any` abuse (`CapsuleDetailPage.tsx:30`, `api.ts:81`); duplicated `timeAgo`/`STATUS_COLORS`; `RegisterPage` ignores the theme (hardcoded Tailwind colors).

**Extension:** sends the absolute local file path incl. OS username (`extension.ts:106`) and requires pasting a raw project UUID (`:124`); empty `activationEvents` (`package.json:11`); `escapeHtml` doesn't escape `'` (`:387`).

**Infra / CI:** no explicit `permissions:` block in `ci.yml` (defaults to read-write `GITHUB_TOKEN`); actions pinned by tag not SHA, and a privileged docker-in-docker service; `modernize` hook script builds a file path from untrusted stdin `session_id` with no sanitizing and no `set -euo pipefail` (`.github/modernize/.../recordToolUse.sh:19`); nginx serves no security headers (`frontend/nginx.conf`); frontend Dockerfile uses `npm install` instead of `npm ci`; stale untracked duplicate frontend inside `microhubs-backend/frontend/`; dead `audit_log` table (`schema.sql:123`) with no entity or code reference.

**[H7 / hygiene] Committed build artifacts dominate the repo.** At review time ~576 of 769 tracked files were junk (`jar-check/`, `.class`, `target/`, `src_backup/`, `vscode-extension/out/`). After the author's cleanup the tree is smaller but still artifact-heavy: **278 of 443 tracked files (~63%)** are junk — 207 under `jar-check/`, 56 under `microhubs-backend/src_backup/` (a backup-of-a-backup), 8 under `vscode-extension/out/`, and 7 Eclipse project files (`.classpath`, `.project`, `.settings/`). `target/` and the duplicate `microhubs-backend/frontend/` are already clean. `.gitignore` listed `target/`/`*.class`/`*.jar` but these were committed before the rules took effect; `jar-check/`, `src_backup/`, `out/`, and the Eclipse files weren't ignored at all. **Fix:** `git rm -r --cached` those trees, add the missing patterns to `.gitignore`, and confirm `git status` is clean.

**Status (2026-08-23): ◐ In progress.** `.gitignore` was extended (Eclipse files, `jar-check/`, `src_backup/`, `vscode-extension/out/`, `/backend/`) and a new `.gitattributes` (`* text=auto eol=lf`) was added to stop the CRLF↔LF churn that was polluting diffs. The patterns are verified to match (`git check-ignore --no-index`). The actual **untracking is left to the author** — the `git rm --cached` commands are provided in the hand-off — because it is an index/commit operation. No source is deleted from disk; only the git index changes.

---

## What's done well

A fair review should be clear about what's solid — and a lot is:

- **No SQL injection.** Every native query uses bound named parameters, including the pgvector similarity queries (`knowledge/KnowledgeRepository.java`) and capsule/global-question queries. The embedding vector is built in code but passed as a JDBC parameter, never concatenated.
- **Password handling is correct.** BCrypt via `SecurityConfig`, login through `AuthenticationManager`, `passwordHash` is `@JsonIgnore`.
- **JWT role claim is not trusted for authorization.** Authorities are rebuilt from the DB in `JwtAuthFilter`/`UserDetailsServiceImpl`, so a forged `role` claim cannot escalate privileges. (The real fix for C1 is object-level checks, not role checks — but this design choice prevents a whole separate class of bug.)
- **Most service layers enforce membership correctly** — workspace, project, artifact, `createCapsule`, `postComment`, resolve-write, knowledge, and notification paths all check. The IDOR cluster is an *inconsistency* in a few read/update methods, not a systemic absence — which makes it cheap to fix.
- **Capsule state machine is properly enforced** via an explicit `ALLOWED_TRANSITIONS` map on both the public and internal transition paths.
- **The frontend has effectively no stored-XSS surface** — no `dangerouslySetInnerHTML`/`innerHTML`/`eval`; all user content renders through JSX text nodes (React auto-escaping).
- **The extension stores its token in `SecretStorage`** (as the README claims), not plaintext or `globalState`; no `child_process`/command-injection surface.
- **Secrets are kept out of git.** `.env` is genuinely gitignored and absent from history; `application.yml` externalizes all credentials (only the insecure *defaults* are the issue).
- **Good bones elsewhere:** consistent 1536-dim embeddings across schema/entity/client, a multi-stage frontend Dockerfile, a reasonable `smoke-test.sh`, `CSRF` correctly disabled for a stateless API, and CI with no `pull_request_target` misuse or script injection.

---

## Prioritized action plan

**Before any deployment (do first):**
1. ✅ **Done** — `verifyWorkspaceMembership` added to `getCapsule`, `listCapsules`, `updateCapsule`, `listComments`, `getResolution` (C1, H2). The whole IDOR cluster is closed.
2. ✅ **Done (interim)** — `schema.sql` rewritten to the full entity set so the stack boots clean (C2). Still worth adopting Flyway for a single source of truth, and booting from an empty volume to confirm.
3. ✅ **Done** — default `JWT_SECRET` removed, fail-fast on unset/weak (H1). ⚠️ Author still needs to set a real random secret in each environment (incl. local `.env`).
4. ✅ **Done** — `ws` scope bug fixed; frontend type-checks clean (H4).

**This week:**
5. ✅ **Done** — pgvector HNSW ANN index + FK/lookup indexes added (H5).
6. ✅/◐ **Partly done** — dead `backend/` deleted (H6); ⚠️ rotate its historical credentials; `.gitignore`/`.gitattributes` updated, and `git rm --cached` for the remaining artifacts is staged for the author to run (H7).
7. ◐ **Hardened, not complete** — JWT storage surface minimized; the `localStorage → httpOnly cookie` migration remains the real fix (H3).
8. ☐ **Open (Medium, out of this pass's scope)** — fix the async/transaction race so knowledge actually generates (M1), and add LLM timeouts (M3).

**Hardening backlog:** the remaining Medium items (Docker/compose robustness, webview CSP, JSON injection, error-handling, moderation of auto-public knowledge) and the Low cleanups.

---

*Prepared as a static review. The four headline findings were re-verified against source; dynamic testing (actually running the exploit paths, load-testing the vector search) was not performed and would be a sensible next step for the security items.*
