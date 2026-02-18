import { eq, and } from 'drizzle-orm';
import db from '@/lib/db';
import { workspaceDocuments } from '@/lib/db/schema';
import { WorkspaceDocument } from '@/lib/types/workspace';
import { randomUUID } from 'crypto';
import pdf from 'pdf-parse';
import { readFile } from 'fs/promises';
import { Embeddings } from '@langchain/core/embeddings';
import cosineSimilarity from 'compute-cosine-similarity';

export interface UploadDocumentDTO {
  workspaceId: string;
  conversationId?: string; // Optional: link to specific conversation
  filename: string;
  fileType: 'pdf' | 'txt';
  filePath: string;
  uploadedBy: string;
}

export interface SearchResult {
  document: WorkspaceDocument;
  similarity: number;
  relevantContent: string;
}

export interface DocumentPreview {
  filename: string;
  preview: string; // First 300-400 words
  uploadedAt: Date;
}

export class DocumentService {
  /**
   * Extract first N words from text
   */
  private extractWords(text: string, wordCount: number): string {
    if (!text) return '';
    const words = text.split(/\s+/);
    return words.slice(0, wordCount).join(' ') + (words.length > wordCount ? '...' : '');
  }

  /**
   * Extract text from a PDF file
   */
  private async extractPdfText(filePath: string): Promise<string> {
    const dataBuffer = await readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  /**
   * Extract text from a TXT file
   */
  private async extractTxtText(filePath: string): Promise<string> {
    const content = await readFile(filePath, 'utf-8');
    return content;
  }

  /**
   * Extract text from a file based on its type
   */
  async extractText(filePath: string, fileType: 'pdf' | 'txt'): Promise<string> {
    if (fileType === 'pdf') {
      return this.extractPdfText(filePath);
    } else if (fileType === 'txt') {
      return this.extractTxtText(filePath);
    }
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  /**
   * Create embeddings for text using the provided embedding model
   */
  async createEmbeddings(
    text: string,
    embeddingModel: Embeddings
  ): Promise<number[]> {
    // Split text into chunks if it's too long (most embedding models have token limits)
    const maxChunkLength = 8000; // Conservative limit for most models
    
    if (text.length <= maxChunkLength) {
      const embeddings = await embeddingModel.embedQuery(text);
      return embeddings;
    }

    // For longer texts, embed the first chunk (we can enhance this later)
    const chunk = text.substring(0, maxChunkLength);
    const embeddings = await embeddingModel.embedQuery(chunk);
    return embeddings;
  }

  /**
   * Upload and process a document
   */
  async uploadDocument(
    data: UploadDocumentDTO,
    embeddingModel: Embeddings
  ): Promise<WorkspaceDocument> {
    const id = randomUUID();
    const now = new Date().toISOString();

    // Extract text from the file
    const content = await this.extractText(data.filePath, data.fileType);

    // Generate embeddings
    const embeddings = await this.createEmbeddings(content, embeddingModel);

    // Get file size
    const stats = await readFile(data.filePath).then((buffer) => buffer.length);

    const documentData = {
      id,
      workspaceId: data.workspaceId,
      conversationId: data.conversationId || null,
      filename: data.filename,
      fileType: data.fileType,
      content,
      embeddings: embeddings,
      uploadedBy: data.uploadedBy,
      uploadedAt: now,
      fileSize: stats,
    };

    await db.insert(workspaceDocuments).values(documentData);

    return {
      id,
      workspaceId: data.workspaceId,
      conversationId: data.conversationId,
      filename: data.filename,
      fileType: data.fileType,
      content,
      embeddings,
      uploadedBy: data.uploadedBy,
      uploadedAt: new Date(now),
      fileSize: stats,
    };
  }

  /**
   * List all documents in a workspace (optionally filtered by conversation)
   */
  async listDocuments(workspaceId: string, conversationId?: string): Promise<WorkspaceDocument[]> {
    // Build where conditions
    const conditions = [eq(workspaceDocuments.workspaceId, workspaceId)];
    
    if (conversationId) {
      conditions.push(eq(workspaceDocuments.conversationId, conversationId));
    }
    
    const results = await db
      .select()
      .from(workspaceDocuments)
      .where(and(...conditions))
      .orderBy(workspaceDocuments.uploadedAt);

    return results.map((doc) => {
      const embeddings =
        typeof doc.embeddings === 'string'
          ? JSON.parse(doc.embeddings)
          : doc.embeddings;

      return {
        id: doc.id,
        workspaceId: doc.workspaceId,
        conversationId: doc.conversationId || undefined,
        filename: doc.filename,
        fileType: doc.fileType,
        content: doc.content || undefined,
        embeddings,
        uploadedBy: doc.uploadedBy,
        uploadedAt: new Date(doc.uploadedAt),
        fileSize: doc.fileSize || undefined,
      };
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const result = await db
      .delete(workspaceDocuments)
      .where(eq(workspaceDocuments.id, documentId));
    return result.changes > 0;
  }

  /**
   * Search documents using semantic similarity
   */
  async searchDocuments(
    workspaceId: string,
    query: string,
    embeddingModel: Embeddings,
    topK: number = 3,
    similarityThreshold: number = 0.7,
    conversationId?: string
  ): Promise<SearchResult[]> {
    // Get query embedding
    const queryEmbedding = await embeddingModel.embedQuery(query);

    // Get all documents in the workspace (optionally filtered by conversation)
    const documents = await this.listDocuments(workspaceId, conversationId);

    if (documents.length === 0) {
      return [];
    }

    // Calculate similarity scores
    const results: SearchResult[] = [];

    for (const doc of documents) {
      if (!doc.embeddings || doc.embeddings.length === 0) {
        continue;
      }

      const similarity = cosineSimilarity(queryEmbedding, doc.embeddings);

      if (similarity !== null && similarity >= similarityThreshold) {
        // Extract relevant content snippet (first 500 chars for now)
        const relevantContent = doc.content
          ? doc.content.substring(0, 500)
          : '';

        results.push({
          document: doc,
          similarity: similarity,
          relevantContent,
        });
      }
    }

    // Sort by similarity (highest first) and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<WorkspaceDocument | null> {
    const result = await db
      .select()
      .from(workspaceDocuments)
      .where(eq(workspaceDocuments.id, documentId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const doc = result[0];
    const embeddings =
      typeof doc.embeddings === 'string'
        ? JSON.parse(doc.embeddings)
        : doc.embeddings;

    return {
      id: doc.id,
      workspaceId: doc.workspaceId,
      conversationId: doc.conversationId || undefined,
      filename: doc.filename,
      fileType: doc.fileType,
      content: doc.content || undefined,
      embeddings,
      uploadedBy: doc.uploadedBy,
      uploadedAt: new Date(doc.uploadedAt),
      fileSize: doc.fileSize || undefined,
    };
  }

  /**
   * Get recent document previews (first 300-400 words)
   * This provides baseline context regardless of semantic search results
   */
  async getRecentDocumentPreviews(
    workspaceId: string,
    limit: number = 5,
    conversationId?: string
  ): Promise<DocumentPreview[]> {
    const documents = await this.listDocuments(workspaceId, conversationId);

    // Sort by uploadedAt DESC and take most recent
    const recentDocs = documents
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, limit);

    return recentDocs.map((doc) => ({
      filename: doc.filename,
      preview: this.extractWords(doc.content || '', 350), // ~300-400 words
      uploadedAt: doc.uploadedAt,
    }));
  }
}

// Export singleton instance
export const documentService = new DocumentService();
