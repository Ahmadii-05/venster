# venster — Product Strategy & Feature Backlog

**Workflow-Embedded Micro-Hubs → the institutional memory layer for engineering**

_Prepared 2026-08-23. Companion to `CODE_REVIEW.md`._

---

## TL;DR — the bet

Every engineering org is quietly bleeding the *why* behind its code: the reason a weird workaround exists, the dead-end someone already tried, the decision made in a Slack thread that nobody can find six months later. Wikis, Q&A sites, and now AI assistants all try to plug this hole and mostly fail for two reasons: **nobody wants to stop working to write things down (the contribution tax), and whatever does get written rots and can no longer be trusted (staleness → trust decay).**

venster's core mechanic — a **code-anchored capsule** (file + line range + commit) that captures a real question at the moment it's asked, and an LLM that structures the resolution into searchable knowledge — is aimed at exactly the right target. But the current shape is one good idea away from being "another internal Q&A tool," a category with a graveyard behind it.

The single most important strategic move: lean into the one thing venster can do that no wiki, no Q&A tool, and no general AI assistant can — **because it anchors knowledge to a specific commit, it can detect when that knowledge goes stale and heal itself.** That, plus making the *first reuse feel magical* (deflection + answers with provenance at the moment of asking), plus feeding the org's existing AI assistants instead of fighting them, is a defensible product. This document lays out the landscape, the positioning, and a ranked, buildable backlog mapped to the current Spring Boot + pgvector + Groq + React + VS Code stack.

**One prerequisite gates everything below:** the semantic search is currently powered by character n-gram hashing, not neural embeddings, so it matches words rather than meaning. Swapping in a real embedding model (the `EmbeddingClient` interface is already built for this) is the foundation the entire "find the answer someone already gave" thesis stands on — see the ⚠ note in §5.

---

## Method & confidence note

Live web verification was **not available** while preparing this doc (the environment's web search/fetch returned no live results). Everything here is drawn from product knowledge through roughly mid-2025. Product **capabilities and category dynamics are high-confidence**; anything about **current pricing, funding, discontinuations, or 2026 pivots is flagged "verify"** and should be confirmed before it goes in a pitch deck or fundraising narrative.

---

## 1. The market reality — four forces that kill tools in this space

Any product here lives or dies against four forces. venster's design should be read as a set of answers to them.

**1. The contribution tax.** The number-one killer of knowledge tools. Stack Overflow for Teams, Confluence, Notion, Slab, Tettra, Swimm — all require an engineer to *stop what they're doing and write*. Adoption stalls the moment the writing feels like overhead with a delayed, uncertain payoff. **Answer:** capture must be a byproduct of work already happening (a real question, a PR comment, an incident), and the payoff must be near-immediate.

**2. Staleness → trust decay.** Detached docs rot silently. The deeper problem isn't that one answer is wrong — it's that *the first time someone gets burned by a stale answer, they stop trusting the entire corpus* and revert to asking humans. Trust is the real asset, and it's brittle. **Answer:** knowledge must carry visible freshness/confidence, and the system must proactively detect and flag decay.

**3. AI commoditization of "answering."** GitHub Copilot, Cursor, and Sourcegraph Cody already answer "what does this code do" over your repo. The collapse of public Stack Overflow traffic post-LLM proves people now ask the model, not a Q&A UI. **The answering interface is not defensible.** **Answer:** the value must live in *proprietary, org-specific "why"* the model cannot know, and venster should *feed* those assistants rather than compete on chat UX.

**4. Platform-consolidation risk.** Point tools get absorbed and killed — CodeStream (in-IDE code discussion, acquired by New Relic, subsequently wound down as a collaboration tool — _verify current status_) is the cautionary tale most directly analogous to venster. **Answer:** build a proprietary, compounding data asset (the corpus) and an integration surface that's painful to rip out.

---

## 2. Competitive landscape

### 2a. Internal knowledge / engineering Q&A / code-coupled docs

| Product | What it is | Wedge (what it nails) | Where it falls short |
|---|---|---|---|
| **Stack Overflow for Teams** | Private Q&A on SO's engine; tags, search, reputation, IDE/Slack integrations, semantic search (OverflowAI) | Familiar Q&A format; best-in-class search for the "why"; structured & reusable | Requires deliberate ask/answer effort → adoption stalls; no code-sync so answers rot; free tier retired, per-seat pricing (_verify_) |
| **Swimm** | Code-coupled docs that live in-repo; tokens auto-flag when referenced code changes; CI "doc coverage" | **Directly attacks staleness** by binding docs to code and breaking CI on drift | Still requires writing docs (adoption tax); detects drift but doesn't fix content; reported pivot toward legacy/mainframe comprehension (_verify_) |
| **Unblocked** | AI Q&A that mines existing sources (code, PRs, Slack, Jira, Confluence) to answer "why was this built this way" | **Near-zero contribution burden** — extracts from work already done; strong onboarding | Retrieval, not durable curation; can be confidently wrong; squeezed by Copilot/Cursor repo chat |
| **CodeStream** | In-IDE code discussion & PR review; acquired by New Relic | Proved in-IDE discussion is desirable; venster's closest ancestor | Wound down as a collaboration tool after acquisition (_verify_) — the consolidation cautionary tale |
| **Tettra** | Slack-first lightweight wiki + Q&A routing + verification/ownership + AI answer bot | Low-friction Slack capture; explicit staleness-verification workflow | Not code-aware; SMB-oriented; shallow for deep engineering knowledge |
| **Slab** | Polished wiki with unified cross-tool search and freshness/verification badges | Clean UX; trust signals for freshness | General-purpose, not code-coupled; another place docs rot; crowded |
| **Notion / Confluence (+AI)** | All-in-one docs / enterprise wiki standard, now with AI search (Notion AI, Atlassian Rovo) | Ubiquity; AI retrieval over existing content | No code anchoring; notorious staleness; engineer resistance to writing; AI helps *finding*, not *capture* or *freshness* |

### 2b. AI-native developer tools (how they capture & serve codebase knowledge)

| Product | Approach | Wedge | Key weakness / lesson for venster |
|---|---|---|---|
| **Sourcegraph Cody** | RAG + code search over the whole repo for context | Precise code retrieval at enterprise scale | Answers "how the code works" (derivable from code), not "why" (tribal). The "why" is the gap venster owns. |
| **Cursor** (Rules / memories) | Persistent `.cursorrules` / memories the AI applies to future work | **Developers *will* write things down if the payoff is instant** (the AI immediately behaves better) | Rules are for AI behavior, not team knowledge — but the *capture-with-instant-reward* pattern is the adoption lesson to steal |
| **Windsurf / Codeium** (Memories) | Auto + manual memories that improve future output | Low-friction memory that compounds | Same lesson: memory that visibly improves the next action gets created |
| **Greptile** | Builds a graph of the codebase for AI Q&A + PR review | Whole-repo structural understanding | Derived from code, not human decisions; complements rather than captures tribal "why" |
| **Dosu** | Auto-answers GitHub issues; maintains docs/labels; learns from maintainer replies | **Turns Q&A into auto-captured, reusable knowledge** at the source | The closest philosophical cousin — validates "capture at the point of asking, reuse automatically" |
| **Continue.dev** | Open-source IDE assistant w/ custom context providers | Extensible, self-hostable context | DIY; no opinion on team knowledge capture |
| **GitHub Copilot** (Enterprise KBs, Spaces, repo chat) | Chat over repo + curated markdown "knowledge bases" | The 800-lb gorilla; distribution everywhere | **Makes "chat over your repo" table-stakes.** venster must not compete here — it must *supply* Copilot the org-specific "why." |
| **Mintlify** | AI-native, partially auto-generated docs | Beautiful docs with low authoring effort | Doc-site shaped; not point-of-work capture |

### Cross-cutting lessons

The pattern is stark. **Passive mining (Unblocked, Dosu) wins adoption but yields un-curated, sometimes-wrong retrieval. Active curation (Swimm, SO Teams, wikis) yields trustworthy knowledge but loses the adoption fight.** venster's model — *capture effortlessly at a real moment of friction, then have an LLM structure only the high-value resolved bits* — is the synthesis both camps are missing. **Proximity to code is the only demonstrated defense against staleness** (Swimm's whole thesis), and venster's file+line+commit anchoring is a stronger version of it — but anchoring only helps if you *act* on drift. And the defensible asset across every winner is **the org-specific "why," not the "how"** — LLMs know general coding; they cannot know your team's decisions and gotchas tied to specific lines.

---

## 3. Where venster wins — positioning, wedge, moat

**Positioning statement.** venster is *the institutional memory layer for engineering* — it captures the **why** behind your code, where the code lives, and keeps it from going stale. It is **not** a wiki, **not** another Q&A site, and **not** another AI code-chat assistant. It is the connective tissue that makes those AI assistants actually know *your* codebase's decisions.

**The wedge (where to start).** The code-anchored capsule created at the single highest-frequency, highest-pain moment in an engineer's day: **"why is this code like this?"** — asked during PR review and while reading unfamiliar code. Own that moment first; everything else expands from it.

**The moat (why it compounds and can't be copied).**

1. **Data network effect.** Every resolved capsule makes search and answer-drafting better. The corpus of permission-aware, code-anchored, org-specific decisions grows more valuable with each resolution and cannot be reconstructed by a general LLM or a competitor starting fresh.
2. **Freshness as trust.** Because knowledge is anchored to a commit, venster can keep the corpus *trustworthy* over time — the thing every other tool loses. Trust is what keeps the corpus in use, which is what keeps it growing.
3. **Be the backend, not just the UI.** Expose the corpus to Cursor / Copilot / Claude via MCP/API. Once the org's other AI tools depend on venster for the "why," venster is infrastructure — painful to rip out, and immune to "but Copilot already has chat."

---

## 4. The four differentiating bets

Everything in the backlog ladders up to these four.

**Bet 1 — Self-healing knowledge (the moat-maker).** When subsequent commits change the anchored code, flag the capsule's knowledge as "possibly stale," ping the resolver/owner to confirm or update, and show a freshness state in search. **No Q&A tool does this** — and venster is already most of the way there: the schema *already* captures everything the detection loop needs. `ArtifactVersion.commitHash` records the commit the knowledge was pinned to, `ArtifactAnchor.contentHash` is a hash of the exact selected code (re-hash the current code at that location and compare → instant drift signal), and `ArtifactAnchor.symbolName` lets you re-anchor by symbol when line numbers shift. The capture plumbing exists; only the *detection loop* is missing. It's the direct antidote to trust decay.

**Bet 2 — Make the first reuse magical (the adoption engine).** At the moment someone starts asking, semantic search surfaces "3 resolved capsules likely answer this" *before* they finish (deflection), and the global Q&A drafts an answer that **cites specific resolved capsules and the exact code+commit**, or says "not covered." Time-to-first-value is everything; this is the moment that converts a skeptic.

**Bet 3 — Capture at the source (distribution).** Meet knowledge where it's born: a PR review comment → capsule; a Slack thread → capsule; an incident postmortem → capsule; a "why is this here?" hover at a line in VS Code. Each integration lowers the contribution tax to near zero and is a distribution channel.

**Bet 4 — Feed the assistants (anti-commoditization).** Ship an MCP server / API so the org's existing AI tools query venster's resolved decisions. Don't win the chat-UI war; supply the ammunition and become infrastructure.

---

## 5. Ranked feature backlog (mapped to the stack)

Ranking heuristic: **(impact on the core thesis × defensibility) ÷ build cost on the current stack.** Tier 0 is foundational and should ship first; tiers descend in urgency, not importance. Effort assumes the existing Java/Spring Boot + Postgres/pgvector + Groq + React + VS Code stack. Backend can't be compiled in-sandbox (no Maven/JDK) and any new entity column must be nullable/defaulted — see `CODE_REVIEW.md` and project memory for the migration + rebuild gotchas.

### Tier 0 — Make the core loop undeniable

> **⚠ Foundational prerequisite — do this before anything else in Tier 0.** The semantic search that the entire product thesis rests on is currently **not semantic**. `LocalEmbeddingClient` generates its 1536-dim vectors by SHA-256-hashing character n-grams (its own comment: _"This is a MVP approach… similarity quality is lower than neural embeddings"_). That captures **lexical** overlap, not meaning — "the login token expires too early" and "auth sessions time out prematurely" will **not** land near each other, so deflection (#1), grounded answers (#2), duplicate detection, and clustering are all built on sand until this is replaced. Groq is an LLM inference provider and does **not** serve embeddings, so the swap targets a real embedding model (OpenAI `text-embedding-3-small`, Voyage, Cohere, or a local ONNX / sentence-transformers model). Effort is **moderate and low-risk** because `EmbeddingClient` is already a swappable interface — implement a new `@Component`, keep 1536 dims (or migrate the `vector(n)` column) and **re-embed existing rows** as a one-off backfill. _Nothing else in this document works well until retrieval is genuinely semantic._

| # | Feature | Impact | Effort | Stack touchpoints |
|---|---|---|---|---|
| 1 | **Ask-time deflection.** Before a capsule is created, run pgvector similarity over resolved capsules and show "this may already be answered." | ★★★★★ | ●● | Reuse existing embedding + duplicate-detection; new `search/similar` call wired into the VS Code create-capsule flow and the web create form. `EmbeddingClient.embed()` → pgvector cosine top-k. **Depends on the neural-embedding swap above.** |
| 2 | **Answer-with-provenance (grounded RAG).** Global Q&A retrieves top-k resolved capsules, feeds Groq a strict "cite capsule IDs + code locations, else say 'I don't know'" prompt, renders sources. | ★★★★★ | ●●● | pgvector retrieval → Groq completion w/ citation-forcing system prompt; React answer view with source cards linking to capsule + file@commit; guardrail against hallucination. |
| 3 | **Fix the CRITICAL priority inconsistency** (frontend still offers `CRITICAL`; backend/DB allow only LOW/MEDIUM/HIGH). | ★★ | ● | `types.ts` `CapsulePriority`, create-capsule form; align to LOW/MEDIUM/HIGH (edit form already correct). Small, but it's a latent 400-error bug. |

### Tier 1 — The moat: self-healing knowledge

| # | Feature | Impact | Effort | Stack touchpoints |
|---|---|---|---|---|
| 4 | **Code-anchored staleness detection.** Detect when a resolved capsule's anchored code has changed and mark its knowledge "possibly stale." | ★★★★★ | ●●● | **Cheap MVP (start here):** VS Code extension re-hashes the code at each anchor on file open and compares to the stored `ArtifactAnchor.contentHash` — pure client-side, no git integration, ships fast. **Full version:** GitHub App/webhook on push → diff changed files against anchors → server-side re-hash. Needs a `staleness_state` column (nullable/defaulted) on the knowledge/capsule + a notification hook. **The differentiator — and the capture data already exists (`contentHash`, `commitHash`, `symbolName`).** |
| 5 | **Freshness & confidence signals in search/results.** Every knowledge result shows last-verified date, resolver, "confirmed current as of commit X," and a confidence score. | ★★★★ | ●● | Read-side: extend knowledge DTO + React result cards + search ranking (down-weight stale). Cheap once #4 exists; huge trust payoff. |
| 6 | **One-click re-verification.** On a flagged capsule: "Still accurate" / "Needs update" → re-pins to the new commit (re-anchor by `symbolName`, refresh `contentHash`) or re-runs Groq extraction. | ★★★★ | ●● | Capsule service transition + endpoint; React action; optional Groq re-extraction on update. Keeps the corpus trustworthy. |

### Tier 2 — Capture at the source

| # | Feature | Impact | Effort | Stack touchpoints |
|---|---|---|---|---|
| 7 | **"Why is this here?" at the line.** VS Code CodeLens/hover shows capsules anchored near a line + blame link; one keystroke to ask a new capsule pre-filled with file@line@commit. | ★★★★★ | ●●● | VS Code extension (CodeLens provider + hover); backend `capsules?path=&line=` lookup. Puts venster in the exact moment the "why" question is asked. |
| 8 | **GitHub PR review → capsule.** Turn a PR review comment/thread into a capsule anchored to the diff; on merge+resolve, extract knowledge. | ★★★★★ | ●●●● | GitHub App (reuse #4's integration); map PR comment → capsule anchor; route to author via CODEOWNERS. Captures the richest existing tribal knowledge. |
| 9 | **Slack capture.** Slack app message-action / `/venster` to turn a thread into a capsule. | ★★★★ | ●●● | Slack app + Spring webhook; thread→capsule; link back to Slack permalink. Where knowledge is actually lost today. |

### Tier 3 — Anti-commoditization / platform

| # | Feature | Impact | Effort | Stack touchpoints |
|---|---|---|---|---|
| 10 | **MCP server / knowledge API.** Expose resolved-knowledge semantic search as an MCP tool so Cursor / Copilot / Claude can query the org's decisions. | ★★★★★ | ●●● | Thin MCP/REST wrapper over existing pgvector retrieval + auth scoping. Turns competitors into distribution; makes venster infrastructure. |
| 11 | **Knowledge clustering → playbooks.** Cluster related resolved capsules (pgvector) into browsable "topics"; Groq titles/summarizes each cluster. | ★★★ | ●●● | Periodic clustering job over embeddings; Groq summarization; new React "Topics" view. Builds structure from the corpus without manual curation. |

### Tier 4 — Retention & collaboration

| # | Feature | Impact | Effort | Stack touchpoints |
|---|---|---|---|---|
| 12 | **"Knowledge you should know" digest.** Weekly digest of new resolved decisions touching code the user owns/edits. | ★★★★ | ●● | Git blame/ownership × capsule anchors; scheduled job; email/Slack. Recurring, personalized re-engagement. |
| 13 | **Contributor impact metrics.** "Your resolved capsule was viewed/reused N times and deflected N questions." | ★★★★ | ●● | View/reuse counters on knowledge; React profile widget. The *healthy* reward (impact visibility) — **not** leaderboards. |
| 14 | **Incident postmortem → capsule.** Structured retro that maps root cause / action items to the causing code and creates anchored capsules. | ★★★ | ●●● | New retro flow reusing the knowledge schema (root cause/solution already extracted on resolve); link to incident tooling later. High-value knowledge. |

_Effort key: ● trivial · ●● small · ●●● medium · ●●●● large. Impact ★ (1) to ★★★★★ (5)._

---

## 6. Phased roadmap

**Phase A — Demo-ready / prove the loop (now).** Tier 0 (#1 deflection, #2 grounded answers-with-provenance, #3 the CRITICAL fix). This makes the existing capsule→knowledge→search loop *feel* magical in a live demo and closes the most visible correctness gap. Highest ratio of impact to effort.

**Phase B — The moat (next).** Tier 1 self-healing knowledge (#4–#6) + the VS Code "why is this here?" surface (#7). This is what makes venster fundamentally different from a wiki or Copilot, and it's the story an investor or a design-partner CTO actually remembers.

**Phase C — Distribution & platform.** PR + Slack capture (#8, #9) and the MCP/API (#10). Lower the contribution tax to zero and become infrastructure the org's other AI tools depend on.

**Phase D — Retention & scale.** Digests, impact metrics, clustering, incidents (#11–#14). Compounding engagement once the corpus has mass.

---

## 7. Success metrics (what to instrument)

The metrics that actually predict survival in this category, roughly in order of importance: **deflection rate** (share of new questions where an existing capsule answered it — proves reuse), **time-to-first-reuse** for a new user (the "magic moment"), **% of knowledge marked fresh / trusted** (proxy for whether people still believe the corpus), **reuse per capsule** (search views + answer citations — proves the data network effect is real), and **weekly active searchers** (are people *asking venster* before asking a human?). Vanity metrics to avoid over-indexing on: raw capsule count and number of contributors — volume without reuse is exactly the trap Confluence fell into.

---

## 8. Traps — what NOT to build

Do not build a general wiki or a rich doc editor — that's the losing side of the adoption fight and cedes ground to Notion/Confluence. Do not build another general AI code-chat assistant — Copilot/Cursor/Cody own that and it's not defensible. Do not add leaderboard-style gamification — in engineering orgs it rewards volume over quality and often backfires; reward *impact visibility* instead (#13). Do not let capture ever require leaving the editor or the PR — the moment it's a context-switch, contribution dies. And two correctness/architecture guardrails: the embedding/retrieval pipeline **must be permission-aware from day one** (never surface a capsule to someone who can't see the underlying repo/workspace), and every new persisted field must stay nullable/defaulted so the `ddl-auto: validate` backend still boots (see the deploy gotchas in `CODE_REVIEW.md` / project memory).

---

## Appendix — products referenced

Knowledge/Q&A: Stack Overflow for Teams, Swimm, Unblocked, CodeStream, Tettra, Slab, Notion, Confluence (Atlassian Rovo). AI-native dev tools: Sourcegraph Cody, Cursor, Windsurf/Codeium, Greptile, Dosu, Continue.dev, GitHub Copilot (Enterprise knowledge bases / Spaces), Mintlify. Adjacent concepts: Glean (enterprise search + knowledge graph), GitLens ("why is this code here"), CODEOWNERS routing, incident.io / Rootly (postmortems), Architecture Decision Records (ADRs).

**Confidence:** product capabilities and category dynamics are high-confidence as of ~mid-2025; pricing, funding, discontinuations, and 2026 pivots are **unverified** — confirm before external use.
