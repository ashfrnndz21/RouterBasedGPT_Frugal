/**
 * DocumentPipeline — workspace-scoped document chunking and embedding pipeline
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */
import { eq, and, inArray } from 'drizzle-orm';
import { OllamaEmbeddings } from '@langchain/ollama';
import { randomUUID } from 'crypto';
import defaultDb from '@/lib/db';
import { workspaceDocuments, workspaceDocumentChunks } from '@/lib/db/schema';
import { getOllamaApiEndpoint, getOllamaApiKey } from '@/lib/config';

type DbInstance = typeof defaultDb;

// ============================================================
// Types
// ============================================================

export type DocumentStatus = 'uploading' | 'indexing' | 'ready' | 'failed';

export interface DocumentChunk {
  id: string;
  documentId: string;
  workspaceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[] | null;
}

// ============================================================
// Text chunking helpers
// ============================================================

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

/**
 * Splits text into chunks of ~CHUNK_SIZE characters with ~CHUNK_OVERLAP overlap.
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  if (!text || text.length === 0) return chunks;

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

// ============================================================
// Cosine similarity (reused from workspaceBrainService pattern)
// ============================================================

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ============================================================
// File parsers
// ============================================================

async function parsePdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const result = await pdfParse(buffer);
  return result.text as string;
}

async function parseTxt(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}

async function parseDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value as string;
}

async function parseCsv(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Papa = require('papaparse');
  const csv = buffer.toString('utf-8');
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  // Convert rows to readable text: "col1: val1, col2: val2"
  const lines: string[] = (result.data as Record<string, unknown>[]).map((row) =>
    Object.entries(row)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  );
  return lines.join('\n');
}

async function parseFile(
  buffer: Buffer,
  fileType: 'pdf' | 'txt' | 'docx' | 'csv'
): Promise<string> {
  switch (fileType) {
    case 'pdf':  return parsePdf(buffer);
    case 'txt':  return parseTxt(buffer);
    case 'docx': return parseDocx(buffer);
    case 'csv':  return parseCsv(buffer);
  }
}

// ============================================================
// DocumentPipeline
// ============================================================

export class DocumentPipeline {
  private readonly db: DbInstance;
  private readonly embeddingModel: string;

  constructor(db: DbInstance = defaultDb, embeddingModel = 'nomic-embed-text') {
    this.db = db;
    this.embeddingModel = embeddingModel;
  }

  /**
   * Compute an embedding for the given text via Ollama.
   * Returns null if embedding computation fails.
   */
  private async computeEmbedding(text: string): Promise<number[] | null> {
    try {
      const endpoint = getOllamaApiEndpoint();
      const apiKey = getOllamaApiKey();

      if (!endpoint) {
        console.warn('[DocumentPipeline] No Ollama endpoint configured — storing chunk with null embedding');
        return null;
      }

      const embeddings = new OllamaEmbeddings({
        baseUrl: endpoint,
        model: this.embeddingModel,
        ...(apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {}),
      });

      const [vector] = await embeddings.embedDocuments([text]);
      return vector;
    } catch (err) {
      console.error('[DocumentPipeline] Embedding computation failed:', err);
      return null;
    }
  }

  /**
   * Ingest a document: parse → chunk → embed → store.
   * Status transitions: uploading → indexing → ready (or failed).
   * If a document with the same filename exists in the workspace, deletes it first (Req 4.9).
   * Returns the documentId; processing is synchronous (awaited fully).
   */
  async ingest(
    workspaceId: string,
    file: Buffer,
    filename: string,
    fileType: 'pdf' | 'txt' | 'docx' | 'csv',
    uploadedBy: string
  ): Promise<string> {
    // Req 4.9: replace existing document with same filename
    const existing = await this.db
      .select({ id: workspaceDocuments.id })
      .from(workspaceDocuments)
      .where(
        and(
          eq(workspaceDocuments.workspaceId, workspaceId),
          eq(workspaceDocuments.filename, filename)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .delete(workspaceDocuments)
        .where(eq(workspaceDocuments.id, existing[0].id));
    }

    const documentId = randomUUID();
    const now = new Date().toISOString();

    // Insert document row with status 'uploading' (Req 4.2)
    await this.db.insert(workspaceDocuments).values({
      id: documentId,
      workspaceId,
      filename,
      fileType: fileType as 'pdf' | 'txt',  // schema enum — extended by migration
      uploadedBy,
      uploadedAt: now,
      status: 'uploading',
      errorMessage: null,
    });

    try {
      // Parse file content
      const text = await parseFile(file, fileType);

      // Transition to 'indexing' (Req 4.2)
      await this.db
        .update(workspaceDocuments)
        .set({ status: 'indexing' })
        .where(eq(workspaceDocuments.id, documentId));

      // Chunk text
      const chunks = chunkText(text);

      // Embed each chunk and insert into workspace_document_chunks (Req 4.8)
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const embedding = await this.computeEmbedding(chunkContent);
        const embeddingJson = embedding ? JSON.stringify(embedding) : null;

        await this.db.insert(workspaceDocumentChunks).values({
          id: randomUUID(),
          documentId,
          workspaceId,
          chunkIndex: i,
          content: chunkContent,
          embedding: embeddingJson,
          createdAt: new Date().toISOString(),
        });
      }

      // Transition to 'ready' (Req 4.2)
      await this.db
        .update(workspaceDocuments)
        .set({ status: 'ready' })
        .where(eq(workspaceDocuments.id, documentId));
    } catch (err) {
      // On error: set status to 'failed' with error message (Req 4.4)
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.db
        .update(workspaceDocuments)
        .set({ status: 'failed', errorMessage })
        .where(eq(workspaceDocuments.id, documentId));
    }

    return documentId;
  }

  /**
   * Returns the current status of a document.
   */
  async getStatus(documentId: string): Promise<DocumentStatus> {
    const rows = await this.db
      .select({ status: workspaceDocuments.status })
      .from(workspaceDocuments)
      .where(eq(workspaceDocuments.id, documentId))
      .limit(1);

    if (rows.length === 0) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return (rows[0].status ?? 'failed') as DocumentStatus;
  }

  /**
   * Cosine similarity search over workspace chunks.
   * If priorityDocIds provided, those chunks are ranked first (Req 4.6).
   */
  async searchChunks(
    workspaceId: string,
    queryEmbedding: number[],
    topK: number,
    priorityDocIds?: string[]
  ): Promise<DocumentChunk[]> {
    // Fetch all chunks for this workspace
    const rows = await this.db
      .select()
      .from(workspaceDocumentChunks)
      .where(eq(workspaceDocumentChunks.workspaceId, workspaceId));

    type ScoredChunk = { chunk: DocumentChunk; score: number; isPriority: boolean };
    const scored: ScoredChunk[] = [];

    for (const row of rows) {
      if (!row.embedding) continue; // skip chunks without embeddings

      const embedding = JSON.parse(row.embedding) as number[];
      const score = cosineSimilarity(queryEmbedding, embedding);
      const isPriority = priorityDocIds ? priorityDocIds.includes(row.documentId) : false;

      scored.push({
        chunk: {
          id: row.id,
          documentId: row.documentId,
          workspaceId: row.workspaceId,
          chunkIndex: row.chunkIndex,
          content: row.content,
          embedding,
        },
        score,
        isPriority,
      });
    }

    // Sort: priority chunks first (by score), then non-priority (by score) (Req 4.6)
    scored.sort((a, b) => {
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      return b.score - a.score;
    });

    return scored.slice(0, topK).map((s) => s.chunk);
  }

  /**
   * Deletes a document row; cascades to chunks (Req 4.7).
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.db
      .delete(workspaceDocuments)
      .where(eq(workspaceDocuments.id, documentId));
  }
}

export default new DocumentPipeline();
