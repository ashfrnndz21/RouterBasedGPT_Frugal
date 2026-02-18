import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/workspace/documentService';
import { getAvailableEmbeddingModelProviders } from '@/lib/providers';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'documents');

// Ensure uploads directory exists
async function ensureUploadsDir(workspaceId: string): Promise<string> {
  const workspaceDir = path.join(UPLOADS_DIR, workspaceId);
  if (!existsSync(workspaceDir)) {
    await mkdir(workspaceDir, { recursive: true });
  }
  return workspaceDir;
}

// Get the first available embedding model
async function getEmbeddingModel() {
  const providers = await getAvailableEmbeddingModelProviders();
  
  // Prefer ollama, then openai, then any available
  const preferredProviders = ['ollama', 'openai', 'gemini', 'transformers'];
  
  for (const provider of preferredProviders) {
    if (providers[provider] && Object.keys(providers[provider]).length > 0) {
      const modelKey = Object.keys(providers[provider])[0];
      return providers[provider][modelKey].model;
    }
  }
  
  // Fallback to any available
  for (const provider in providers) {
    if (Object.keys(providers[provider]).length > 0) {
      const modelKey = Object.keys(providers[provider])[0];
      return providers[provider][modelKey].model;
    }
  }
  
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    
    const documents = await documentService.listDocuments(params.id, conversationId || undefined);
    return NextResponse.json({ documents }, { status: 200 });
  } catch (error: any) {
    console.error('Error listing documents:', error);
    return NextResponse.json({ error: error.message || 'Failed to list documents' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const workspaceId = params.id;
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    const filename = file.name;
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (!extension || !['pdf', 'txt'].includes(extension)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF or TXT files.' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }
    
    // Get embedding model
    const embeddingModel = await getEmbeddingModel();
    if (!embeddingModel) {
      return NextResponse.json(
        { error: 'No embedding model available. Please configure an embedding provider.' },
        { status: 500 }
      );
    }
    
    // Save file to disk
    const uploadsDir = await ensureUploadsDir(workspaceId);
    const fileId = randomUUID();
    const filePath = path.join(uploadsDir, `${fileId}.${extension}`);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    
    // Process and store document
    const document = await documentService.uploadDocument(
      {
        workspaceId,
        conversationId: conversationId || undefined,
        filename,
        fileType: extension as 'pdf' | 'txt',
        filePath,
        uploadedBy: 'user',
      },
      embeddingModel
    );
    
    return NextResponse.json({
      id: document.id,
      filename: document.filename,
      fileType: document.fileType,
      fileSize: document.fileSize,
      uploadedAt: document.uploadedAt,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const success = await documentService.deleteDocument(documentId);

    if (!success) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete document' }, { status: 500 });
  }
}
