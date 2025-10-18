# Design Document: Frugal RAG Platform

## Overview

This design document outlines the transformation of the existing FrugalAIGpt codebase into a frugal, consumer-focused RAG-as-a-Service platform. The design prioritizes extreme cost efficiency while maintaining the core Perplexity-like experience: grounded answers with verifiable citations and conversational follow-ups.

### Design Principles

1. **Cost-First Architecture**: Every component is designed to minimize operational costs
2. **Incremental Migration**: Leverage existing FrugalAIGpt components where possible
3. **Horizontal Scalability**: Stateless services that can scale independently
4. **Data Privacy**: Strict user data isolation at all layers
5. **Performance**: Sub-5-second query response times

## Architecture

### High-Level System Flow

```
User Query → API Gateway → Orchestration Service → Frugal Router
                                                         ↓
                                    ┌───────────────────┴────────────────────┐
                                    ↓                                        ↓
                            Semantic Cache                          RAG Pipeline
                                    ↓                                        ↓
                            Cached Response                    Vector Search + LLM
                                    ↓                                        ↓
                                    └────────────→ Response ←────────────────┘
```

### Component Architecture

The system consists of these key microservices:

1. **API Gateway** (NGINX/Next.js API Routes)
2. **Orchestration Service** (Enhanced from existing metaSearchAgent)
3. **Frugal Router** (New lightweight classifier)
4. **Semantic Cache** (Redis with vector search)
5. **RAG Pipeline** (Enhanced from existing search chains)
6. **LLM Inference Layer** (vLLM with tiered models)

6. **Vector Database** (Existing or Pinecone/Milvus)
7. **Authentication Service** (New user management)
8. **Usage Tracking Service** (New metrics and rate limiting)

## Components and Interfaces

### 1. API Gateway

**Technology**: Next.js API Routes (existing) + NGINX for production

**Responsibilities**:
- Request authentication and validation
- Rate limiting enforcement
- Request routing to orchestration service
- CORS and security headers

**Key Interfaces**:

```typescript
// POST /api/search
interface SearchRequest {
  query: string;
  chatId?: string;
  stream?: boolean;
  userId: string; // NEW: from auth token
}

interface SearchResponse {
  type: 'sources' | 'response' | 'done';
  data: any;
  cacheHit?: boolean; // NEW: indicates cache usage
  modelTier?: 'tier1' | 'tier2'; // NEW: which model was used
}

// POST /api/auth/register (NEW)
interface RegisterRequest {
  email: string;
  password: string;
}

// POST /api/auth/login (NEW)
interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  userId: string;
  expiresAt: number;
}
```

**Migration Strategy**:
- Extend existing `/api/search/route.ts` to add authentication middleware
- Add new `/api/auth/*` routes for user management
- Keep existing streaming response format


### 2. Authentication Service

**Technology**: Next.js API Routes + JWT + bcrypt

**Database Schema Extension**:

```typescript
// New table: users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text('lastLoginAt'),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
});

// Extend existing chats table
export const chats = sqliteTable('chats', {
  // ... existing fields
  userId: text('userId').notNull(), // NEW: link to user
});

// Extend existing messages table
export const messages = sqliteTable('messages', {
  // ... existing fields
  userId: text('userId').notNull(), // NEW: link to user
});
```

**Key Functions**:
- `registerUser(email, password)`: Create new user account
- `authenticateUser(email, password)`: Validate credentials and issue JWT
- `validateToken(token)`: Verify JWT and extract userId
- `resetPassword(email)`: Generate reset token and send email

### 3. Frugal Router

**Technology**: Fine-tuned DistilBERT or small classification model

**Architecture**:

```typescript
interface RouterDecision {
  path: 'canned' | 'cache' | 'rag-tier1' | 'rag-tier2';
  confidence: number;
  reasoning?: string;
}

class FrugalRouter {
  private classifier: DistilBERTClassifier;
  
  async route(query: string, history: BaseMessage[]): Promise<RouterDecision> {
    // 1. Check for simple greetings/meta queries
    if (this.isSimpleQuery(query)) {
      return { path: 'canned', confidence: 1.0 };
    }
    
    // 2. Classify query complexity
    const classification = await this.classifier.classify(query);
    
    // 3. Route based on classification
    if (classification.intent === 'faq' && classification.confidence > 0.9) {
      return { path: 'cache', confidence: classification.confidence };
    }
    
    if (classification.complexity === 'high') {
      return { path: 'rag-tier2', confidence: classification.confidence };
    }
    
    return { path: 'rag-tier1', confidence: classification.confidence };
  }
  
  private isSimpleQuery(query: string): boolean {
    const simplePatterns = [
      /^(hi|hello|hey|greetings)/i,
      /^(what can you do|help|how does this work)/i,
    ];
    return simplePatterns.some(pattern => pattern.test(query));
  }
}
```

**Training Data**:
- Collect query logs from existing FrugalAIGpt usage
- Label queries as: simple/faq/knowledge-simple/knowledge-complex
- Fine-tune DistilBERT on this classification task

**Canned Responses**:
```typescript
const CANNED_RESPONSES = {
  greeting: "Hello! I'm your AI search assistant. Ask me anything and I'll search for answers with citations.",
  help: "I can search the web and your documents to answer questions. Just type your question and I'll provide sourced answers.",
};
```


### 4. Semantic Cache

**Technology**: Redis with RediSearch vector similarity module

**Architecture**:

```typescript
interface CacheEntry {
  queryEmbedding: number[];
  query: string;
  response: string;
  sources: Document[];
  timestamp: number;
  hitCount: number;
}

class SemanticCache {
  private redis: RedisClient;
  private embeddings: Embeddings;
  private similarityThreshold = 0.95;
  
  async get(query: string, userId: string): Promise<CacheEntry | null> {
    // 1. Generate query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    // 2. Vector similarity search in Redis
    const results = await this.redis.ft.search(
      `cache:${userId}`,
      `*=>[KNN 1 @embedding $vector AS score]`,
      {
        PARAMS: { vector: Buffer.from(new Float32Array(queryEmbedding).buffer) },
        RETURN: ['query', 'response', 'sources', 'score'],
        DIALECT: 2,
      }
    );
    
    // 3. Check similarity threshold
    if (results.total > 0 && results.documents[0].score >= this.similarityThreshold) {
      const entry = results.documents[0];
      await this.incrementHitCount(entry.id);
      return entry as CacheEntry;
    }
    
    return null;
  }
  
  async set(query: string, userId: string, response: string, sources: Document[]): Promise<void> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    const cacheKey = `cache:${userId}:${Date.now()}`;
    
    await this.redis.hSet(cacheKey, {
      query,
      response,
      sources: JSON.stringify(sources),
      embedding: Buffer.from(new Float32Array(queryEmbedding).buffer),
      timestamp: Date.now(),
      hitCount: 0,
    });
    
    // Set TTL to 30 days
    await this.redis.expire(cacheKey, 30 * 24 * 60 * 60);
  }
}
```

**Cache Invalidation Strategy**:
- TTL-based: 30 days for all entries
- LRU eviction when memory limit reached
- Manual invalidation when user updates documents

**Performance Targets**:
- Cache lookup: < 100ms
- Cache hit rate: 20-30% after warm-up period


### 5. Orchestration Service

**Technology**: Enhanced version of existing `metaSearchAgent.ts`

**Architecture**:

```typescript
class OrchestrationService {
  private frugalRouter: FrugalRouter;
  private semanticCache: SemanticCache;
  private ragPipeline: RAGPipeline;
  private usageTracker: UsageTracker;
  
  async handleQuery(
    query: string,
    userId: string,
    chatId: string,
    history: BaseMessage[]
  ): Promise<EventEmitter> {
    const emitter = new EventEmitter();
    
    // 1. Check rate limits
    const canProceed = await this.usageTracker.checkRateLimit(userId);
    if (!canProceed) {
      emitter.emit('error', { type: 'rate_limit', message: 'Rate limit exceeded' });
      return emitter;
    }
    
    // 2. Route query
    const routingDecision = await this.frugalRouter.route(query, history);
    
    // 3. Track routing decision
    await this.usageTracker.logQuery(userId, query, routingDecision.path);
    
    // 4. Handle based on routing
    switch (routingDecision.path) {
      case 'canned':
        this.handleCannedResponse(query, emitter);
        break;
        
      case 'cache':
        await this.handleCacheQuery(query, userId, emitter);
        break;
        
      case 'rag-tier1':
      case 'rag-tier2':
        await this.handleRAGQuery(
          query,
          userId,
          history,
          routingDecision.path === 'rag-tier2' ? 'tier2' : 'tier1',
          emitter
        );
        break;
    }
    
    return emitter;
  }
  
  private async handleCacheQuery(
    query: string,
    userId: string,
    emitter: EventEmitter
  ): Promise<void> {
    const cached = await this.semanticCache.get(query, userId);
    
    if (cached) {
      emitter.emit('data', JSON.stringify({ type: 'sources', data: cached.sources }));
      emitter.emit('data', JSON.stringify({ type: 'response', data: cached.response, cacheHit: true }));
      emitter.emit('end');
    } else {
      // Cache miss - fall through to RAG
      await this.handleRAGQuery(query, userId, [], 'tier1', emitter);
    }
  }
  
  private async handleRAGQuery(
    query: string,
    userId: string,
    history: BaseMessage[],
    modelTier: 'tier1' | 'tier2',
    emitter: EventEmitter
  ): Promise<void> {
    // Use existing RAG pipeline with tier selection
    const result = await this.ragPipeline.execute(
      query,
      userId,
      history,
      modelTier
    );
    
    // Cache the result for future queries
    await this.semanticCache.set(query, userId, result.response, result.sources);
    
    // Stream results
    emitter.emit('data', JSON.stringify({ type: 'sources', data: result.sources }));
    for await (const chunk of result.stream) {
      emitter.emit('data', JSON.stringify({ type: 'response', data: chunk, modelTier }));
    }
    emitter.emit('end');
  }
}
```

**Integration with Existing Code**:
- Wrap existing `MetaSearchAgent` class
- Add routing logic before calling `searchAndAnswer`
- Inject cache layer between router and RAG pipeline


### 6. RAG Pipeline

**Technology**: Enhanced version of existing search chains

**Architecture**:

```typescript
class RAGPipeline {
  private vectorDB: VectorDatabase;
  private embeddings: Embeddings;
  private llmTier1: BaseChatModel;
  private llmTier2: BaseChatModel;
  private webSearch: SearxngClient;
  
  async execute(
    query: string,
    userId: string,
    history: BaseMessage[],
    modelTier: 'tier1' | 'tier2'
  ): Promise<RAGResult> {
    // 1. Determine if web search is needed
    const needsWebSearch = await this.shouldSearchWeb(query, history);
    
    // 2. Retrieve relevant documents
    const documents = await this.retrieveDocuments(query, userId, needsWebSearch);
    
    // 3. Rerank documents
    const rankedDocs = await this.rerankDocuments(query, documents);
    
    // 4. Generate answer with appropriate model
    const llm = modelTier === 'tier2' ? this.llmTier2 : this.llmTier1;
    const answer = await this.generateAnswer(query, rankedDocs, history, llm);
    
    return {
      response: answer.text,
      sources: rankedDocs,
      stream: answer.stream,
    };
  }
  
  private async retrieveDocuments(
    query: string,
    userId: string,
    includeWeb: boolean
  ): Promise<Document[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    // Get user's uploaded documents
    const userDocs = await this.vectorDB.similaritySearch(
      queryEmbedding,
      userId,
      5 // top 5 from user docs
    );
    
    // Get web results if needed
    let webDocs: Document[] = [];
    if (includeWeb) {
      const searchResults = await this.webSearch.search(query);
      webDocs = await this.extractWebContent(searchResults.slice(0, 3));
    }
    
    return [...userDocs, ...webDocs];
  }
  
  private async rerankDocuments(
    query: string,
    documents: Document[]
  ): Promise<Document[]> {
    // Use existing reranking logic from metaSearchAgent
    const queryEmbedding = await this.embeddings.embedQuery(query);
    const docEmbeddings = await this.embeddings.embedDocuments(
      documents.map(d => d.pageContent)
    );
    
    const scored = documents.map((doc, i) => ({
      doc,
      score: computeSimilarity(queryEmbedding, docEmbeddings[i])
    }));
    
    return scored
      .filter(s => s.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.doc);
  }
}
```

**Changes from Existing Code**:
- Add `userId` parameter to all methods for data isolation
- Add model tier selection logic
- Enhance reranking to combine user docs + web results
- Keep existing streaming and citation logic


### 7. LLM Inference Layer

**Technology**: vLLM or TensorRT-LLM for optimized inference

**Model Configuration**:

```typescript
interface ModelConfig {
  tier: 'tier1' | 'tier2';
  modelName: string;
  quantization: '4bit' | '8bit' | 'fp16';
  maxTokens: number;
  temperature: number;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  tier1: {
    tier: 'tier1',
    modelName: 'microsoft/Phi-3-mini-4k-instruct',
    quantization: '4bit',
    maxTokens: 2048,
    temperature: 0.7,
  },
  tier2: {
    tier: 'tier2',
    modelName: 'mistralai/Mistral-7B-Instruct-v0.2',
    quantization: '4bit',
    maxTokens: 4096,
    temperature: 0.7,
  },
};
```

**Deployment Strategy**:

For development/small scale:
- Use existing Ollama integration
- Load quantized models: `ollama pull phi3:4bit` and `ollama pull mistral:4bit`
- Keep existing provider abstraction in `src/lib/providers/`

For production scale:
- Deploy vLLM server with both models loaded
- Use continuous batching for throughput optimization
- Implement model keep-alive to avoid reload overhead

**Prompt Engineering for Citations**:

```typescript
const CITATION_PROMPT = `You are a helpful AI assistant that provides accurate answers with citations.

IMPORTANT: You MUST cite your sources using [1], [2], [3] etc. after each statement that comes from the provided context.

Context documents:
{context}

User question: {query}

Provide a clear, concise answer with inline citations. Format citations as [1], [2], etc. corresponding to the source numbers above.`;
```

**Integration with Existing Code**:
- Extend existing provider system in `src/lib/providers/`
- Add tier selection logic to model provider selection
- Keep existing streaming response format


### 8. Vector Database

**Technology Options**:

1. **Development**: Extend existing SQLite with vector extension
2. **Production**: Pinecone (serverless) or self-hosted Milvus

**Schema Design**:

```typescript
interface VectorDocument {
  id: string;
  userId: string; // Namespace for data isolation
  content: string;
  embedding: number[];
  metadata: {
    title: string;
    source: 'upload' | 'web';
    url?: string;
    fileName?: string;
    chunkIndex: number;
    timestamp: number;
  };
}

class VectorDatabase {
  async similaritySearch(
    queryEmbedding: number[],
    userId: string,
    topK: number
  ): Promise<Document[]> {
    // Filter by userId for data isolation
    const results = await this.db.query({
      vector: queryEmbedding,
      filter: { userId: { $eq: userId } },
      topK,
      includeMetadata: true,
    });
    
    return results.map(r => new Document({
      pageContent: r.content,
      metadata: r.metadata,
    }));
  }
  
  async upsert(userId: string, documents: VectorDocument[]): Promise<void> {
    // Add userId to all documents
    const docsWithUser = documents.map(doc => ({
      ...doc,
      userId,
    }));
    
    await this.db.upsert(docsWithUser);
  }
  
  async deleteUserData(userId: string): Promise<void> {
    await this.db.delete({ userId: { $eq: userId } });
  }
}
```

**Migration from Existing System**:
- Current system stores embeddings as JSON files in `uploads/`
- Migrate to proper vector DB for better performance
- Keep file upload logic, but store embeddings in vector DB instead of JSON files

### 9. Usage Tracking Service

**Technology**: SQLite (development) / PostgreSQL (production)

**Schema**:

```typescript
export const queryLogs = sqliteTable('query_logs', {
  id: integer('id').primaryKey(),
  userId: text('userId').notNull(),
  query: text('query').notNull(),
  routingPath: text('routingPath', { 
    enum: ['canned', 'cache', 'rag-tier1', 'rag-tier2'] 
  }).notNull(),
  cacheHit: integer('cacheHit', { mode: 'boolean' }).default(false),
  latencyMs: integer('latencyMs'),
  timestamp: text('timestamp').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userQuotas = sqliteTable('user_quotas', {
  userId: text('userId').primaryKey(),
  queriesThisHour: integer('queriesThisHour').default(0),
  lastResetAt: text('lastResetAt').notNull(),
  totalQueries: integer('totalQueries').default(0),
});
```

**Rate Limiting Logic**:

```typescript
class UsageTracker {
  private readonly HOURLY_LIMIT = 100;
  
  async checkRateLimit(userId: string): Promise<boolean> {
    const quota = await this.getQuota(userId);
    
    // Reset if hour has passed
    const hourAgo = Date.now() - 60 * 60 * 1000;
    if (new Date(quota.lastResetAt).getTime() < hourAgo) {
      await this.resetQuota(userId);
      return true;
    }
    
    return quota.queriesThisHour < this.HOURLY_LIMIT;
  }
  
  async logQuery(
    userId: string,
    query: string,
    routingPath: string
  ): Promise<void> {
    // Log the query
    await db.insert(queryLogs).values({
      userId,
      query,
      routingPath,
      timestamp: new Date().toISOString(),
    });
    
    // Increment quota
    await this.incrementQuota(userId);
  }
  
  async getUsageStats(userId: string): Promise<UsageStats> {
    const logs = await db
      .select()
      .from(queryLogs)
      .where(eq(queryLogs.userId, userId))
      .orderBy(desc(queryLogs.timestamp))
      .limit(1000);
    
    return {
      totalQueries: logs.length,
      cacheHitRate: logs.filter(l => l.cacheHit).length / logs.length,
      avgLatency: logs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / logs.length,
      queriesByPath: this.groupByPath(logs),
    };
  }
}
```


## Data Models

### User Model

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}
```

### Chat Model (Extended)

```typescript
interface Chat {
  id: string;
  userId: string; // NEW
  title: string;
  createdAt: Date;
  focusMode: string;
  files: Array<{ name: string; fileId: string }>;
}
```

### Message Model (Extended)

```typescript
interface Message {
  id: number;
  userId: string; // NEW
  chatId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'source';
  content: string;
  sources: Document[];
  createdAt: Date;
  metadata?: {
    cacheHit?: boolean;
    modelTier?: 'tier1' | 'tier2';
    latencyMs?: number;
  };
}
```

### Document Model

```typescript
interface Document {
  pageContent: string;
  metadata: {
    title: string;
    url?: string;
    source: 'upload' | 'web';
    fileName?: string;
    chunkIndex?: number;
  };
}
```

### Cache Entry Model

```typescript
interface CacheEntry {
  id: string;
  userId: string;
  query: string;
  queryEmbedding: number[];
  response: string;
  sources: Document[];
  timestamp: Date;
  hitCount: number;
  ttl: number;
}
```

## Error Handling

### Error Types

```typescript
enum ErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_REQUEST = 'invalid_request',
  MODEL_UNAVAILABLE = 'model_unavailable',
  VECTOR_DB_ERROR = 'vector_db_error',
  CACHE_ERROR = 'cache_error',
  INTERNAL_ERROR = 'internal_error',
}

interface ErrorResponse {
  error: ErrorType;
  message: string;
  retryAfter?: number; // For rate limiting
  details?: any;
}
```

### Error Handling Strategy

1. **Authentication Errors**: Return 401 with clear message
2. **Rate Limit Errors**: Return 429 with `retryAfter` timestamp
3. **Model Errors**: Fallback to tier1 if tier2 fails, return 503 if both fail
4. **Cache Errors**: Log and continue to RAG pipeline (cache is optional)
5. **Vector DB Errors**: Return 500 and alert operators
6. **Validation Errors**: Return 400 with specific field errors

### Retry Logic

```typescript
class RetryHandler {
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(backoffMs * Math.pow(2, i));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

### Graceful Degradation

- If Tier 2 model unavailable → use Tier 1
- If cache unavailable → skip cache, go directly to RAG
- If web search fails → use only user documents
- If vector DB slow → return partial results with warning


## Testing Strategy

### Unit Tests

**Components to Test**:
1. **FrugalRouter**: Query classification accuracy
2. **SemanticCache**: Cache hit/miss logic, similarity threshold
3. **AuthService**: Password hashing, JWT generation/validation
4. **UsageTracker**: Rate limiting logic, quota resets
5. **RAGPipeline**: Document retrieval, reranking logic

**Test Framework**: Jest + TypeScript

**Example Test**:
```typescript
describe('FrugalRouter', () => {
  it('should route simple greetings to canned responses', async () => {
    const router = new FrugalRouter();
    const decision = await router.route('hello', []);
    expect(decision.path).toBe('canned');
    expect(decision.confidence).toBe(1.0);
  });
  
  it('should route complex queries to tier2', async () => {
    const router = new FrugalRouter();
    const decision = await router.route(
      'Explain the implications of quantum entanglement on information theory',
      []
    );
    expect(decision.path).toBe('rag-tier2');
  });
});
```

### Integration Tests

**Scenarios to Test**:
1. End-to-end query flow: API → Router → Cache → RAG → Response
2. Authentication flow: Register → Login → Authenticated request
3. Rate limiting: Exceed quota → Receive 429 error
4. Cache hit scenario: Same query twice → Second is cached
5. Document upload → Embedding → Retrieval

**Test Framework**: Supertest + Jest

### Performance Tests

**Metrics to Measure**:
1. Cache lookup latency (target: < 100ms)
2. Vector search latency (target: < 50ms)
3. End-to-end query latency (target: < 5s)
4. Throughput: Queries per second per GPU
5. Cache hit rate after warm-up (target: > 20%)

**Tools**: Artillery or k6 for load testing

### Cost Testing

**Metrics to Track**:
1. Average cost per query by routing path
2. Cache hit rate impact on costs
3. Tier 1 vs Tier 2 usage ratio
4. Embedding generation costs

**Target**: < $0.01 per query on average

## Deployment Architecture

### Development Environment

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./dev.db
      - REDIS_URL=redis://redis:6379
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      - redis
      - ollama
      - searxng
  
  redis:
    image: redis/redis-stack:latest
    ports:
      - "6379:6379"
  
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
  
  searxng:
    image: searxng/searxng:latest
    ports:
      - "8080:8080"
```

### Production Architecture

**Infrastructure**:
- **Compute**: Kubernetes cluster on AWS EKS or GCP GKE
- **GPU Nodes**: For LLM inference (T4 or A10G instances)
- **CPU Nodes**: For stateless services (orchestrator, API gateway)
- **Database**: Managed PostgreSQL (RDS/Cloud SQL)
- **Cache**: Managed Redis (ElastiCache/Memorystore)
- **Vector DB**: Pinecone serverless or self-hosted Milvus
- **Storage**: S3/GCS for uploaded documents

**Scaling Strategy**:
- Horizontal scaling for API gateway and orchestrator
- GPU autoscaling based on queue depth
- Redis cluster for cache distribution
- Vector DB sharding by userId hash

**Cost Optimization**:
- Use spot instances for GPU nodes (with fallback)
- Aggressive autoscaling down during low traffic
- CDN for static assets
- Compression for API responses

## Security Considerations

### Authentication & Authorization

- JWT tokens with 24-hour expiration
- Refresh token mechanism for extended sessions
- Password requirements: min 8 chars, mixed case, numbers
- Rate limiting on auth endpoints to prevent brute force

### Data Protection

- Passwords hashed with bcrypt (cost factor 12)
- User data encrypted at rest (AES-256)
- TLS 1.3 for all API communication
- Secure headers (HSTS, CSP, X-Frame-Options)

### Data Isolation

- Strict userId filtering in all database queries
- Vector DB namespace isolation
- Cache key prefixing with userId
- Audit logging for data access

### API Security

- API key rotation mechanism
- Request signing for sensitive operations
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)

## Monitoring and Observability

### Metrics to Track

**Business Metrics**:
- Daily/Monthly Active Users
- Queries per user
- Cache hit rate
- Cost per query
- User retention rate

**Technical Metrics**:
- API latency (p50, p95, p99)
- Error rate by endpoint
- Model inference latency by tier
- Vector search latency
- Cache hit/miss ratio
- GPU utilization
- Memory usage

**Cost Metrics**:
- LLM inference costs by tier
- Embedding generation costs
- Infrastructure costs (compute, storage, network)
- Cost per user
- Cost per query by routing path

### Logging Strategy

```typescript
interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  service: string;
  userId?: string;
  queryId?: string;
  message: string;
  metadata?: any;
}
```

**Log Aggregation**: CloudWatch, Datadog, or ELK stack

### Alerting Rules

1. Cache hit rate < 15% for 1 hour
2. Average query latency > 5s for 5 minutes
3. Error rate > 5% for 5 minutes
4. GPU utilization > 90% for 10 minutes
5. Rate limit exceeded by > 10% of users
6. Model inference failures > 1% of requests

## Migration Plan

### Phase 1: Foundation (Weeks 1-2)
- Add user authentication system
- Extend database schema with userId fields
- Implement basic rate limiting
- Add usage tracking

### Phase 2: Frugal Routing (Weeks 3-4)
- Implement FrugalRouter with simple classification
- Add canned responses for simple queries
- Collect query logs for router training
- Implement basic metrics dashboard

### Phase 3: Semantic Cache (Weeks 5-6)
- Set up Redis with vector search
- Implement SemanticCache class
- Integrate cache into orchestration flow
- Monitor cache hit rates

### Phase 4: Tiered Models (Weeks 7-8)
- Configure Tier 1 and Tier 2 models
- Implement model selection logic
- Optimize prompts for citations
- Performance testing and tuning

### Phase 5: Production Hardening (Weeks 9-10)
- Security audit and fixes
- Load testing and optimization
- Monitoring and alerting setup
- Documentation and deployment guides

### Phase 6: Launch (Week 11+)
- Beta testing with limited users
- Gather feedback and iterate
- Gradual rollout to more users
- Cost monitoring and optimization
