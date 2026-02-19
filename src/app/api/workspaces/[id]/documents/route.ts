import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/workspace/documentService';
import { DocumentPipeline } from '@/lib/workspace/documentPipeline';
import presenceTracker from '@/lib/workspace/presenceTracker';

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

const SUPPORTED_TYPES = ['pdf', 'txt', 'docx', 'csv'] as const;
type SupportedFileType = typeof SUPPORTED_TYPES[number];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const workspaceId = params.id;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = (formData.get('uploadedBy') as string | null) ?? 'user';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (Req 4.5: pdf, txt, docx, csv)
    const filename = file.name;
    const extension = filename.split('.').pop()?.toLowerCase();

    if (!extension || !(SUPPORTED_TYPES as readonly string[]).includes(extension)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, TXT, DOCX, or CSV files.' },
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

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Presence tracking (PTT Spaces V2 — Req 7.2) ──────────────────────────
    // Fire-and-forget: update the workspace presence timestamp on every upload action.
    presenceTracker.touch(workspaceId, uploadedBy ?? 'system').catch((err) => {
      console.error('[Documents] PresenceTracker.touch failed:', err);
    });
    // ─────────────────────────────────────────────────────────────────────────

    // Ingest via DocumentPipeline (Req 4.2: status transitions uploading→indexing→ready/failed)
    const pipeline = new DocumentPipeline();
    const documentId = await pipeline.ingest(
      workspaceId,
      buffer,
      filename,
      extension as SupportedFileType,
      uploadedBy
    );

    const status = await pipeline.getStatus(documentId);

    return NextResponse.json({ documentId, status }, { status: 201 });

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
