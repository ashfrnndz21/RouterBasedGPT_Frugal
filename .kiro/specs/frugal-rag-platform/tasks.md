# Implementation Plan

This implementation plan breaks down the transformation of FrugalAIGpt into a frugal RAG platform into discrete, actionable coding tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout development.

## Task List

- [ ] 1. Set up user authentication and account management
  - Create database schema for users table with email, password hash, and timestamps
  - Implement user registration endpoint with email validation and password hashing using bcrypt
  - Implement login endpoint with JWT token generation
  - Create authentication middleware to validate JWT tokens on protected routes
  - Add password reset functionality with secure token generation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Extend database schema for multi-user support
  - Add userId foreign key to existing chats table
  - Add userId foreign key to existing messages table
  - Create migration script to handle existing data (assign to default user)
  - Create user_quotas table for rate limiting tracking
  - Create query_logs table for usage analytics
  - _Requirements: 7.1, 11.1, 11.2_

- [ ] 3. Implement usage tracking and rate limiting service
  - Create UsageTracker class with rate limit checking logic (100 queries/hour)
  - Implement query logging with routing path, latency, and cache hit tracking
  - Create quota management functions (check, increment, reset)
  - Add rate limit middleware to API routes
  - Create user dashboard endpoint to display usage statistics
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 4. Set up Redis semantic cache infrastructure
  - Add Redis client configuration with RediSearch module
  - Create SemanticCache class with get/set methods
  - Implement vector similarity search using Redis vector operations
  - Add cache entry TTL management (30 days)
  - Implement cache hit count tracking
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement Frugal Router for query classification
  - Create FrugalRouter class with query classification logic
  - Implement simple query detection (greetings, meta-queries)
  - Add canned response mapping for simple queries
  - Create query complexity classifier using pattern matching
  - Add routing decision logging with confidence scores
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Create Orchestration Service to coordinate components
  - Create OrchestrationService class wrapping existing MetaSearchAgent
  - Integrate FrugalRouter into query handling flow
  - Add cache lookup before RAG pipeline execution
  - Implement routing logic for canned/cache/rag-tier1/rag-tier2 paths
  - Add cache storage after successful RAG responses
  - _Requirements: 2.4, 3.4, 4.1, 4.2_


- [x] 7. Implement tiered LLM inference system
  - Configure Tier 1 model (Phi-3-mini or Llama-3-8B) in providers
  - Configure Tier 2 model (Mistral-7B) in providers
  - Add model tier selection logic to orchestration service
  - Update prompt templates to enforce citation format
  - Add model tier tracking in response metadata
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.3_

- [ ] 8. Enhance RAG pipeline with user data isolation
  - Add userId parameter to all RAG pipeline methods
  - Update vector search to filter by userId for data isolation
  - Modify document retrieval to combine user docs and web results
  - Update reranking logic to handle mixed document sources
  - Ensure citation metadata includes source type (upload/web)
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 9.2, 9.4, 14.1, 14.2_

- [ ] 9. Implement document ingestion with user isolation
  - Update file upload endpoint to associate documents with userId
  - Modify document chunking to include userId in metadata
  - Update embedding generation to tag vectors with userId
  - Migrate from JSON file storage to vector database storage
  - Add asynchronous processing queue for document uploads
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.4_

- [ ] 10. Set up vector database with multi-tenancy
  - Configure vector database (Pinecone or Milvus) connection
  - Create VectorDatabase class with userId filtering
  - Implement similaritySearch with namespace isolation
  - Implement upsert method with userId tagging
  - Add deleteUserData method for account deletion
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 14.1, 14.2_

- [ ] 11. Implement optimized embedding generation
  - Configure BGE-small-en-v1.5 or equivalent embedding model
  - Set up self-hosted embedding service (CPU/small GPU)
  - Implement batch embedding generation for document ingestion
  - Add embedding caching to avoid regeneration
  - Optimize embedding generation latency to < 100ms per query
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12. Update API routes with authentication
  - Add authentication middleware to /api/search route
  - Extract userId from JWT token in all protected routes
  - Update /api/chat route to require authentication
  - Update /api/chats routes to filter by userId
  - Add /api/auth/register and /api/auth/login routes
  - _Requirements: 1.1, 1.2, 1.3, 14.1_

- [x] 13. Implement response streaming with metadata
  - Update streaming response to include cache hit indicator
  - Add model tier information to streamed responses
  - Include latency metrics in response metadata
  - Maintain existing citation format in streamed output
  - Add error handling for stream interruptions
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 14. Add conversation context management
  - Implement conversation history storage per user session
  - Add context window management (last 5 message pairs, 2000 tokens)
  - Implement context truncation when exceeding token limits
  - Format conversation history with role labels for LLM
  - Update RAG pipeline to include conversation context
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 15. Implement web search integration with citations
  - Update SearxNG integration to include source URLs
  - Extract and chunk content from top 3 web results
  - Combine web results with user documents in retrieval
  - Ensure web sources are included in citation metadata
  - Add web search toggle based on query analysis
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 16. Add data encryption and security measures
  - Implement AES-256 encryption for uploaded documents at rest
  - Add secure password hashing with bcrypt (cost factor 12)
  - Configure TLS 1.3 for API communication
  - Add security headers (HSTS, CSP, X-Frame-Options)
  - Implement audit logging for data access events
  - _Requirements: 14.3, 14.5_

- [ ] 17. Create monitoring and metrics dashboard
  - Implement health check endpoints for all services
  - Add metrics tracking for cache hit rate, latency, error rate
  - Create metrics aggregation for cost analysis
  - Build user dashboard showing query count and quota
  - Set up alerting for cache hit rate < 15% and latency > 5s
  - _Requirements: 11.4, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 18. Implement error handling and graceful degradation
  - Add error types enum and ErrorResponse interface
  - Implement retry logic with exponential backoff
  - Add fallback from Tier 2 to Tier 1 on model failure
  - Implement cache bypass on cache errors
  - Add partial results return on vector DB slowness
  - _Requirements: 11.3_

- [ ] 19. Add model inference optimization
  - Configure vLLM or use Ollama with quantized models
  - Set up continuous batching for throughput optimization
  - Implement model keep-alive (5 minutes) to avoid reload
  - Add 4-bit quantization for Tier 1 and Tier 2 models
  - Optimize to achieve 50+ tokens/second on Tier 1
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 20. Update Docker configuration for new services
  - Add Redis service to docker-compose.yaml
  - Configure environment variables for authentication
  - Add vector database service configuration
  - Update app service with new dependencies
  - Create production-ready Dockerfile with optimizations
  - _Requirements: All_

- [ ]* 21. Write integration tests for core flows
  - Write test for end-to-end query flow (API → Router → Cache → RAG)
  - Write test for authentication flow (register → login → authenticated request)
  - Write test for rate limiting (exceed quota → 429 error)
  - Write test for cache hit scenario (same query twice)
  - Write test for document upload → embedding → retrieval flow
  - _Requirements: All_

- [ ]* 22. Write unit tests for critical components
  - Write tests for FrugalRouter query classification
  - Write tests for SemanticCache hit/miss logic
  - Write tests for AuthService password hashing and JWT validation
  - Write tests for UsageTracker rate limiting logic
  - Write tests for RAGPipeline document retrieval and reranking
  - _Requirements: All_

- [ ]* 23. Perform load testing and optimization
  - Set up load testing with Artillery or k6
  - Test cache lookup latency (target < 100ms)
  - Test vector search latency (target < 50ms)
  - Test end-to-end query latency (target < 5s)
  - Measure and optimize queries per second per GPU
  - _Requirements: 3.1, 9.1, 12.5, 13.5_

- [ ] 24. Create user documentation and API guides
  - Write API documentation for authentication endpoints
  - Document search API with examples
  - Create user guide for document upload
  - Document rate limits and quotas
  - Write deployment guide for production setup
  - _Requirements: All_


## UI/UX Enhancement Tasks

- [ ] 25. Create user authentication UI components
  - Build registration form with email/password validation
  - Create login page with error handling and loading states
  - Implement password reset flow UI
  - Add authentication state management (context/store)
  - Create protected route wrapper for authenticated pages
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 26. Build user dashboard and account management
  - Create user profile page showing account details
  - Build usage dashboard displaying query count, quota remaining, and cache hit rate
  - Add visual charts for usage over time (daily/weekly/monthly)
  - Create settings page for account preferences
  - Add logout functionality with session cleanup
  - _Requirements: 11.4, 11.5_

- [ ] 27. Enhance search interface with frugal indicators
  - Add visual indicator for cache hits (e.g., lightning bolt icon, "Instant answer")
  - Display model tier badge (Tier 1: "Fast" / Tier 2: "Deep Analysis")
  - Show response time metrics in UI
  - Add cost savings indicator ("Saved X seconds with cached result")
  - Implement smooth loading states for different routing paths
  - _Requirements: 2.5, 4.1, 4.5, 12.2_

- [ ] 28. Improve citation and source display
  - Redesign citation markers to be more prominent and clickable
  - Create expandable source cards with preview snippets
  - Add source type badges (Web, Upload, Cached)
  - Implement hover tooltips showing full source metadata
  - Add "View all sources" panel with filtering options
  - _Requirements: 5.1, 5.4, 5.5_

- [ ] 29. Build document upload interface
  - Create drag-and-drop file upload component
  - Add upload progress indicators with file processing status
  - Build document library view showing uploaded files
  - Implement file management (view, delete, re-index)
  - Add file type icons and size/date metadata display
  - _Requirements: 6.1, 6.5_

- [ ] 30. Add rate limiting and quota UI feedback
  - Display remaining query quota in header/sidebar
  - Show visual progress bar for quota usage
  - Create informative rate limit error modal with retry timer
  - Add upgrade/premium tier messaging (future monetization)
  - Implement graceful degradation messaging when limits approached
  - _Requirements: 11.2, 11.3, 11.4_

- [ ] 31. Enhance conversation UI with context awareness
  - Add visual indicators for conversation context (e.g., "Remembering last 5 messages")
  - Implement conversation branching or forking UI
  - Add "Start new conversation" with context reset option
  - Show token usage indicator for current conversation
  - Create conversation history sidebar with search and filtering
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 32. Implement real-time streaming improvements
  - Add typing indicators showing which component is active (Searching/Thinking/Writing)
  - Create smooth token-by-token rendering with syntax highlighting
  - Add "Stop generation" button for long responses
  - Implement progressive source loading (sources appear as found)
  - Add skeleton loaders for better perceived performance
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 33. Build responsive mobile-first design
  - Optimize layout for mobile devices (320px+)
  - Create mobile-friendly navigation with hamburger menu
  - Implement touch-friendly interactions for citations and sources
  - Add mobile-optimized file upload interface
  - Ensure all modals and overlays work on small screens
  - _Requirements: All UI requirements_

- [ ] 34. Add accessibility features
  - Implement ARIA labels for all interactive elements
  - Add keyboard navigation support (Tab, Enter, Escape)
  - Ensure color contrast meets WCAG AA standards
  - Add screen reader announcements for dynamic content
  - Implement focus management for modals and overlays
  - _Requirements: All UI requirements_

- [ ] 35. Create onboarding and empty states
  - Build welcome screen for new users explaining features
  - Create interactive tutorial highlighting frugal features
  - Design empty states for no documents, no conversations
  - Add helpful tooltips for first-time users
  - Implement progressive disclosure of advanced features
  - _Requirements: 1.1, 11.4_

- [ ] 36. Implement dark mode and theming
  - Extend existing theme system for new components
  - Ensure all new UI components support dark/light modes
  - Add theme toggle in user settings
  - Optimize colors for readability in both modes
  - Persist theme preference per user account
  - _Requirements: All UI requirements_

- [ ] 37. Add performance and cost transparency UI
  - Create "System Status" page showing cache hit rates and model usage
  - Build cost breakdown visualization (per query type)
  - Add performance metrics dashboard (latency, throughput)
  - Implement comparison view (cached vs. non-cached queries)
  - Show environmental impact metrics (optional, for sustainability messaging)
  - _Requirements: 11.5, 15.2, 15.3_

- [ ]* 38. Conduct UI/UX testing and refinement
  - Perform usability testing with target users
  - Gather feedback on frugal feature visibility
  - A/B test different citation display formats
  - Test mobile responsiveness across devices
  - Iterate on design based on user feedback
  - _Requirements: All UI requirements_


## Recommended Implementation Order for MVP

### Sprint 1: Core Backend + Basic Auth UI (Week 1)
1. Task 1: User authentication backend
2. Task 2: Database schema updates
3. Task 25: Authentication UI components
4. Task 12: API routes with auth

### Sprint 2: Frugal Intelligence Layer (Week 2)
5. Task 4: Redis semantic cache
6. Task 5: Frugal Router
7. Task 6: Orchestration Service
8. Task 27: Search interface with frugal indicators

### Sprint 3: Smart Inference + Citations (Week 3)
9. Task 7: Tiered LLM system
10. Task 8: RAG pipeline with user isolation
11. Task 13: Response streaming with metadata
12. Task 28: Enhanced citation display
13. Task 32: Real-time streaming improvements

### Sprint 4: User Experience + Limits (Week 4)
14. Task 3: Usage tracking and rate limiting
15. Task 26: User dashboard
16. Task 30: Rate limiting UI feedback
17. Task 31: Conversation UI enhancements

### Sprint 5: Polish + Production Ready (Week 5)
18. Task 17: Monitoring dashboard
19. Task 20: Docker configuration
20. Task 33: Mobile responsive design
21. Task 36: Dark mode support
22. Task 35: Onboarding experience

### Optional Post-MVP Tasks
- Tasks 9-11: Document upload (can use web-only initially)
- Tasks 21-23: Testing and load testing
- Task 24: Documentation
- Task 34: Advanced accessibility
- Task 37: Performance transparency UI
- Task 38: UI/UX testing and refinement

## Key UI/UX Differentiators

Your platform will stand out from Perplexity with these frugal-focused features:

1. **Cache Hit Indicators**: Users see when they get instant answers (builds trust in speed)
2. **Model Tier Badges**: Transparency about which AI is answering (Fast vs. Deep)
3. **Cost Savings Display**: Show users how much time/resources they saved
4. **Usage Dashboard**: Clear visibility into quota and usage patterns
5. **Smart Rate Limiting**: Graceful messaging instead of hard errors
6. **Performance Metrics**: Real-time feedback on system efficiency

The existing FrugalAIGpt UI is already excellent - we're enhancing it with these frugal intelligence indicators while maintaining the clean, citation-focused design.
