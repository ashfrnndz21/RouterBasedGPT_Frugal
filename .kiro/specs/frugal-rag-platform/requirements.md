# Requirements Document

## Introduction

This document outlines the requirements for transforming the existing FrugalAIGpt codebase into a frugal, consumer-focused RAG-as-a-Service platform. The system will provide a Perplexity-like AI search experience with grounded answers, verifiable citations, and conversational follow-ups, while prioritizing extreme cost efficiency through tiered model architecture, aggressive caching, and optimized inference.

## Glossary

- **RAG System**: Retrieval-Augmented Generation system that combines document retrieval with language model generation
- **Semantic Cache**: A vector-based cache that stores query embeddings and their responses to avoid redundant LLM inference
- **Frugal Router**: A lightweight classification model that routes queries to appropriate processing paths based on complexity
- **Tier 1 Model**: The primary, cost-efficient language model (e.g., Phi-3-mini, Llama-3-8B) handling 90% of queries
- **Tier 2 Model**: A more capable model (e.g., Mistral-7B) for complex reasoning tasks
- **Orchestration Service**: The central service managing query lifecycle and coordinating between components
- **Vector Database**: A database optimized for storing and searching high-dimensional embeddings
- **Embedding Model**: A model that converts text into vector representations for similarity search
- **Citation Marker**: A reference indicator (e.g., [1], [2]) linking answer statements to source documents
- **User Account**: An individual consumer account with authentication and usage tracking
- **Query Embedding**: A vector representation of a user's search query

## Requirements

### Requirement 1: User Authentication and Account Management

**User Story:** As a consumer, I want to create an account and log in securely, so that I can access the AI search platform and maintain my search history.

#### Acceptance Criteria

1. WHEN a new user visits the platform, THE RAG System SHALL provide a registration interface accepting email and password
2. WHEN a user submits valid registration credentials, THE RAG System SHALL create a User Account with encrypted password storage
3. WHEN an existing user provides valid login credentials, THE RAG System SHALL authenticate the user and establish a session
4. WHEN a user requests password reset, THE RAG System SHALL send a secure reset link to the registered email
5. THE RAG System SHALL enforce password complexity requirements of minimum 8 characters with mixed case and numbers

### Requirement 2: Frugal Query Routing

**User Story:** As a platform operator, I want queries to be intelligently routed to minimize costs, so that the system remains profitable while delivering quality answers.

#### Acceptance Criteria

1. WHEN a user submits a query, THE Frugal Router SHALL classify the query intent within 50 milliseconds
2. IF the query is a simple greeting or meta-query, THEN THE Frugal Router SHALL return a pre-defined response without LLM inference
3. IF the query matches a high-confidence FAQ pattern with similarity score above 0.95, THEN THE Frugal Router SHALL route to the Semantic Cache
4. IF the query requires knowledge retrieval, THEN THE Frugal Router SHALL route to the full RAG pipeline
5. THE Frugal Router SHALL log routing decisions with query classification and confidence scores

### Requirement 3: Semantic Caching

**User Story:** As a platform operator, I want frequently asked questions to be served from cache, so that I can reduce LLM inference costs by 20-30%.

#### Acceptance Criteria

1. WHEN a query is routed to cache, THE Semantic Cache SHALL generate a Query Embedding using the embedding model
2. THE Semantic Cache SHALL perform similarity search against cached query embeddings within 100 milliseconds
3. IF a cached query with cosine similarity above 0.95 is found, THEN THE Semantic Cache SHALL return the cached response with citations
4. IF no similar cached query exists, THEN THE Semantic Cache SHALL forward the query to the RAG pipeline
5. WHEN a new response is generated, THE Semantic Cache SHALL store the query embedding and response for future retrieval

### Requirement 4: Tiered LLM Inference

**User Story:** As a platform operator, I want to use the smallest capable model for most queries, so that I can minimize per-query inference costs.

#### Acceptance Criteria

1. THE Orchestration Service SHALL route 90% of knowledge queries to the Tier 1 Model by default
2. WHEN the Frugal Router detects complex reasoning requirements, THE Orchestration Service SHALL route to the Tier 2 Model
3. THE Tier 1 Model SHALL be a quantized 4-bit model (Phi-3-mini or Llama-3-8B) optimized for speed
4. THE Tier 2 Model SHALL be a mid-sized instruct model (Mistral-7B or equivalent) for complex tasks
5. THE Orchestration Service SHALL track model usage metrics including query count and inference time per tier

### Requirement 5: Grounded Answer Generation with Citations

**User Story:** As a user, I want AI-generated answers to include citations linking to source documents, so that I can verify the information and explore sources.

#### Acceptance Criteria

1. WHEN the RAG System generates an answer, THE Orchestration Service SHALL include Citation Markers in the response text
2. THE RAG System SHALL retrieve 3-5 most relevant document chunks from the Vector Database before generation
3. THE Orchestration Service SHALL construct prompts that enforce citation format with source identifiers
4. THE RAG System SHALL return a response containing both answer text and source metadata including titles and URLs
5. EACH Citation Marker in the answer SHALL correspond to a specific source document chunk

### Requirement 6: Document Ingestion and Embedding

**User Story:** As a user, I want to upload my own documents to search over, so that I can get answers from my personal knowledge base.

#### Acceptance Criteria

1. WHEN a user uploads a document, THE RAG System SHALL accept PDF, DOCX, and Markdown formats up to 10MB
2. THE RAG System SHALL chunk uploaded documents into segments of 500-1000 tokens with 100 token overlap
3. THE Embedding Model SHALL generate vector embeddings for each document chunk within 5 seconds per page
4. THE Vector Database SHALL store embeddings tagged with the user's account identifier for data isolation
5. THE RAG System SHALL process document uploads asynchronously and notify users upon completion

### Requirement 7: Conversational Context Management

**User Story:** As a user, I want to ask follow-up questions that reference previous messages, so that I can have natural conversations with the AI.

#### Acceptance Criteria

1. THE Orchestration Service SHALL maintain conversation history for each user session
2. WHEN a user submits a follow-up query, THE Orchestration Service SHALL include the last 5 message pairs as context
3. THE RAG System SHALL format conversation history as structured messages with role labels (user/assistant)
4. THE Orchestration Service SHALL limit conversation context to 2000 tokens to control inference costs
5. WHEN context exceeds token limits, THE Orchestration Service SHALL truncate oldest messages while preserving the current query

### Requirement 8: Optimized Embedding Generation

**User Story:** As a platform operator, I want to use efficient open-source embedding models, so that I can avoid expensive API fees at scale.

#### Acceptance Criteria

1. THE Embedding Model SHALL be BGE-small-en-v1.5 or equivalent open-source model
2. THE Embedding Model SHALL generate embeddings on CPU or small GPU with latency under 100ms per query
3. THE Embedding Model SHALL produce 384-dimensional vectors for storage efficiency
4. THE RAG System SHALL batch embedding generation for document ingestion with batch size of 32
5. THE Embedding Model SHALL be self-hosted to eliminate per-request API costs

### Requirement 9: Vector Search and Retrieval

**User Story:** As a user, I want the system to find the most relevant information from my documents and the web, so that I get accurate answers to my questions.

#### Acceptance Criteria

1. THE Vector Database SHALL support cosine similarity search with query latency under 50 milliseconds
2. WHEN performing retrieval, THE Vector Database SHALL filter results by user account identifier
3. THE Vector Database SHALL return the top 5 most similar document chunks with similarity scores
4. THE RAG System SHALL only include chunks with similarity scores above 0.3 in the context
5. THE Vector Database SHALL support indexing of at least 1 million document chunks per user

### Requirement 10: Web Search Integration

**User Story:** As a user, I want to search the web when my documents don't contain the answer, so that I can get information from current online sources.

#### Acceptance Criteria

1. WHEN a query requires web search, THE RAG System SHALL query the SearxNG metasearch engine
2. THE RAG System SHALL retrieve the top 10 web search results with titles, URLs, and snippets
3. THE RAG System SHALL extract and chunk content from the top 3 result pages
4. THE RAG System SHALL combine web results with user documents in the retrieval ranking
5. THE RAG System SHALL include web source URLs in citation metadata

### Requirement 11: Usage Tracking and Rate Limiting

**User Story:** As a platform operator, I want to track user query volumes and enforce rate limits, so that I can prevent abuse and manage costs.

#### Acceptance Criteria

1. THE RAG System SHALL record each query with timestamp, user identifier, and processing path (cache/tier1/tier2)
2. THE RAG System SHALL enforce a rate limit of 100 queries per user per hour
3. WHEN a user exceeds rate limits, THE RAG System SHALL return an error message with retry-after time
4. THE RAG System SHALL provide users with a dashboard showing their query count and remaining quota
5. THE RAG System SHALL aggregate usage metrics for cost analysis and optimization

### Requirement 12: Response Formatting and Streaming

**User Story:** As a user, I want to see answers appear progressively as they're generated, so that I get faster perceived response times.

#### Acceptance Criteria

1. THE RAG System SHALL stream LLM responses token-by-token to the client
2. THE RAG System SHALL emit source documents before starting answer generation
3. THE RAG System SHALL format responses as JSON events with type indicators (sources/response/end)
4. THE RAG System SHALL complete source retrieval and emit sources within 2 seconds
5. THE RAG System SHALL maintain streaming connection until answer generation completes

### Requirement 13: Model Inference Optimization

**User Story:** As a platform operator, I want to maximize inference throughput on minimal hardware, so that I can serve more users per GPU.

#### Acceptance Criteria

1. THE RAG System SHALL use vLLM or TensorRT-LLM as the inference engine
2. THE Tier 1 Model SHALL be quantized to 4-bit precision (AWQ or GPTQ format)
3. THE RAG System SHALL support continuous batching to maximize GPU utilization
4. THE RAG System SHALL maintain model keep-alive of 5 minutes to avoid reload overhead
5. THE RAG System SHALL achieve minimum throughput of 50 tokens per second on Tier 1 Model

### Requirement 14: Data Privacy and Isolation

**User Story:** As a user, I want my uploaded documents and search history to remain private, so that my data is not accessible to other users.

#### Acceptance Criteria

1. THE Vector Database SHALL enforce logical data isolation using user account identifiers as namespace filters
2. THE RAG System SHALL never return document chunks belonging to other users in search results
3. THE RAG System SHALL encrypt user documents at rest using AES-256 encryption
4. THE RAG System SHALL delete user data within 30 days of account deletion request
5. THE RAG System SHALL log all data access events for security audit purposes

### Requirement 15: System Monitoring and Health Checks

**User Story:** As a platform operator, I want to monitor system health and performance metrics, so that I can identify and resolve issues proactively.

#### Acceptance Criteria

1. THE RAG System SHALL expose health check endpoints for all microservices
2. THE RAG System SHALL track and log cache hit rates, model latency, and error rates
3. THE RAG System SHALL alert operators when cache hit rate falls below 15%
4. THE RAG System SHALL alert operators when average query latency exceeds 5 seconds
5. THE RAG System SHALL provide a metrics dashboard showing real-time system performance
