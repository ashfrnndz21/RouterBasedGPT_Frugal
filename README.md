# RouterBasedGPT — FrugalAI

> A cost-intelligent, router-based AI platform with multi-agent workspaces, semantic caching, and stateful context management.

---

## What is this?

FrugalAI is a full-stack AI chat platform built on Next.js that routes every query through an intelligent cost-optimization layer before it ever touches an LLM. Simple queries hit a cache or a cheap model. Complex reasoning gets escalated to a full model. The result: dramatically lower inference costs without sacrificing quality.

On top of the core chat engine sits **PTT Spaces** — a multi-agent workspace system where you can spin up specialized AI agents, assign them to conversations, and let them collaborate with memory, presence tracking, and a live intelligence dashboard.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                         │
│                                                                 │
│   ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐  │
│   │  ChatWindow  │   │  Workspace   │   │  Intelligence     │  │
│   │  (homepage)  │   │  Sidebar     │   │  Dashboard        │  │
│   └──────┬───────┘   └──────┬───────┘   └─────────┬─────────┘  │
└──────────┼─────────────────┼─────────────────────┼─────────────┘
           │                 │                     │
           ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NEXT.JS API LAYER                         │
│                                                                 │
│   /api/chat          /api/workspaces/[id]/*    /api/memory      │
│   (streaming SSE)    (agents, convos, docs)   (pinned insights) │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STATEFUL ORCHESTRATOR                        │
│                                                                 │
│  1. Load Context Payload (session state)                        │
│  2. Inject SOUL personality                                     │
│  3. Route query  ──────────────────────────────────────────┐   │
│  4. Extract entities                                        │   │
│  5. Dispatch to handler                                     │   │
│  6. Update context + summarize if needed                    │   │
│  7. Write transcript + memory                               │   │
│  8. Emit response tokens (streaming)                        │   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       FRUGAL ROUTER                             │
│                                                                 │
│   Query ──► Canned Check ──► Matched?  ──► Return instantly    │
│                │                No                              │
│                ▼                                                │
│         Embedding Similarity vs. Examples                       │
│                │                                                │
│         Confidence ≥ 0.70?                                      │
│           Yes │          No                                     │
│               ▼           ▼                                     │
│          Use matched   Escalate one tier                        │
│             tier                                                │
│                                                                 │
│   nano ──► cache      micro ──► rag-tier1    full ──► rag-tier2 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Routing Decision Flow

```
User Query
    │
    ▼
┌───────────────────────────────┐
│  Is it a greeting / meta?     │──► YES ──► Canned Response (free)
└───────────────────────────────┘
    │ NO
    ▼
┌───────────────────────────────┐
│  Embed query, compare to      │
│  router-examples.json         │
└───────────────────────────────┘
    │
    ├── confidence ≥ 0.70 + tier=nano  ──► Semantic Cache lookup
    │                                        │
    │                                        ├── HIT  ──► Return cached (cheap)
    │                                        └── MISS ──► Tier 1 model
    │
    ├── confidence ≥ 0.70 + tier=micro ──► Tier 1 RAG (medium cost)
    │
    ├── confidence ≥ 0.70 + tier=full  ──► Tier 2 RAG (full model)
    │
    └── confidence < 0.70              ──► Escalate one tier up
```

---

## PTT Spaces — Multi-Agent Workspace

```
┌─────────────────────────────────────────────────────────────────┐
│                        WORKSPACE                                │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  HR Agent   │  │  Data Agent │  │  Knowledge Base Agent   │ │
│  │  (custom    │  │  (SQL/CSV   │  │  (RAG over uploaded     │ │
│  │  system     │  │  queries)   │  │  documents)             │ │
│  │  prompt)    │  │             │  │                         │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
│         │                │                      │              │
│         └────────────────┴──────────────────────┘              │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   WorkspaceBrain      │                          │
│              │   - Memory store      │                          │
│              │   - Presence tracker  │                          │
│              │   - Activity logger   │                          │
│              │   - Handoff handler   │                          │
│              └───────────────────────┘                          │
│                          │                                      │
│              ┌───────────┴───────────┐                          │
│              ▼                       ▼                          │
│     Intelligence Dashboard    Conversation History              │
│     (aggregated metrics)      (per-agent, searchable)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Mention & Handoff Flow

```
User types: "@HR Agent what is our PTO policy?"
                │
                ▼
        MentionParser
        extracts: { agentId, query }
                │
                ▼
        AgentConfigLoader
        loads agent system prompt + model config
                │
                ▼
        HandoffHandler
        checks: should this be routed to another agent?
                │
          ┌─────┴─────┐
          │ No handoff │  Handoff needed
          ▼            ▼
     Answer with    Route to target agent
     current agent  + log handoff event
          │            │
          └─────┬───────┘
                ▼
        AgentActivityLogger
        records: agent, latency, tokens, outcome
                │
                ▼
        Response streamed to user
```

---

## Context & Memory Lifecycle

```
Turn 1                Turn 2                Turn N
   │                     │                     │
   ▼                     ▼                     ▼
Extract             Extract               Extract
Entities            Entities              Entities
   │                     │                     │
   └──────────────────────┴─────────────────────┘
                          │
                          ▼
                  ContextPayload (in-memory store)
                  ┌─────────────────────────────┐
                  │ conversationHistory[]        │
                  │ extractedEntities (Map)      │
                  │ conversationSummary          │
                  │ turnCount                    │
                  │ estimatedCost                │
                  └─────────────────────────────┘
                          │
                  turnCount > threshold?
                     YES │
                         ▼
                  Summarize old turns
                  (LLM compaction)
                         │
                  ┌──────┴──────┐
                  ▼             ▼
             MEMORY.md     transcript.jsonl
             (persistent)  (full audit log)
```

---

## Database Schema (SQLite via Drizzle)

```
┌──────────────────┐     ┌──────────────────────┐
│    workspaces    │     │   workspace_agents   │
├──────────────────┤     ├──────────────────────┤
│ id (PK)          │──┐  │ id (PK)              │
│ name             │  │  │ workspaceId (FK) ────┤
│ description      │  │  │ name                 │
│ context          │  │  │ role                 │
│ createdAt        │  │  │ specialty            │
│ updatedAt        │  │  │ systemPrompt         │
└──────────────────┘  │  │ avatar               │
                      │  │ chatModel            │
                      │  │ toolsAllowed         │
                      │  └──────────────────────┘
                      │
                      │  ┌──────────────────────┐
                      │  │  conversations       │
                      │  ├──────────────────────┤
                      └─►│ workspaceId (FK)     │
                         │ agentId (FK)         │
                         │ title                │
                         │ tags                 │
                         │ createdBy            │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │      messages        │
                         ├──────────────────────┤
                         │ chatId (FK)          │
                         │ role                 │
                         │ content              │
                         │ sources (JSON)       │
                         │ agentId              │
                         │ latencyMs            │
                         └──────────────────────┘
```

---

## Project Structure

```
FrugalAI_BetaV2/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts              # Main streaming chat endpoint
│   │   │   └── workspaces/[id]/
│   │   │       ├── agents/                # CRUD for workspace agents
│   │   │       ├── conversations/         # Conversation management
│   │   │       ├── memory/                # Pinned insights
│   │   │       ├── presence/              # Active user tracking
│   │   │       └── dashboard/             # Aggregated metrics
│   │   └── workspaces/[id]/page.tsx       # Workspace UI page
│   │
│   ├── components/
│   │   ├── ChatWindow.tsx                 # Main chat UI
│   │   ├── MessageBox.tsx                 # Message renderer (markdown + citations)
│   │   └── Workspace/
│   │       ├── WorkspaceChat.tsx          # Injects agent context into chat
│   │       ├── WorkspaceSidebar.tsx       # Agent roster + conversations
│   │       ├── IntelligenceDashboard.tsx  # Metrics + activity feed
│   │       ├── EmptyWorkspaceChat.tsx     # New conversation prompt
│   │       └── InlineResultCard.tsx       # Structured data results
│   │
│   └── lib/
│       ├── routing/frugalRouter.ts        # Cost-aware query router
│       ├── orchestration/
│       │   └── statefulOrchestrator.ts   # Full context orchestration
│       ├── cache/semanticCache.ts         # Embedding-based response cache
│       ├── workspace/
│       │   ├── agentConfigLoader.ts       # Agent config resolution
│       │   ├── mentionParser.ts           # @mention extraction
│       │   ├── handoffHandler.ts          # Agent-to-agent routing
│       │   ├── workspaceBrainService.ts   # Memory + context for workspaces
│       │   ├── agentActivityLogger.ts     # Per-agent metrics logging
│       │   ├── presenceTracker.ts         # Online/active user tracking
│       │   ├── documentPipeline.ts        # Document ingestion + chunking
│       │   └── dataAgentService.ts        # SQL/CSV data query agent
│       ├── memory/memoryWriter.ts         # Persistent MEMORY.md writer
│       ├── transcripts/transcriptWriter.ts # JSONL audit log
│       └── soul/soulLoader.ts             # AI personality injection
│
├── drizzle/                               # SQL migrations
│   ├── 0007_ptt_spaces_v2.sql            # Workspace agents schema
│   └── 0008_fix_messages_columns.sql     # Messages table fixes
│
└── config/
    └── router-examples.json              # Routing training examples
```

---

## Getting Started

**1. Install dependencies**
```bash
npm install
# or
yarn install
```

**2. Set up environment**
```bash
cp .env.example .env
# Add your LLM provider API keys
```

**3. Run database migrations**
```bash
npx drizzle-kit push
```

**4. Start the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Concepts

**FrugalRouter** — Every query is classified before hitting an LLM. Greetings return instantly. Repeated questions hit the semantic cache. Only genuinely complex queries reach the full model.

**SemanticCache** — Responses are stored with their embeddings. Similar future queries get the cached answer without a new LLM call.

**StatefulOrchestrator** — Maintains a `ContextPayload` per session. Tracks entities, summarizes old turns to keep context windows small, and writes a full audit trail to disk.

**PTT Spaces** — Workspaces with named agents, each with their own system prompt, model config, and specialty. Agents can hand off to each other via `@mentions`.

**SOUL** — A persistent personality layer injected into every system prompt, keeping the AI's tone consistent across all agents and workspaces.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | SQLite via Drizzle ORM |
| AI / LLM | LangChain (multi-provider) |
| Embeddings | Configurable (OpenAI, Ollama, etc.) |
| Styling | Tailwind CSS |
| Testing | Vitest + property-based tests |
| Deployment | Docker / self-hosted |

---

## License

MIT
