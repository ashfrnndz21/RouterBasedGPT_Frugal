import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/workspace/documentService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const workspaceId = params.id;
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    
    console.log(`[Document Previews] Getting previews for ${conversationId ? 'conversation' : 'workspace'}: ${conversationId || workspaceId}`);
    
    // Get most recent 5 documents with previews (filtered by conversation if provided)
    const previews = await documentService.getRecentDocumentPreviews(
      workspaceId, 
      5, 
      conversationId || undefined
    );
    
    console.log(`[Document Previews] Found ${previews.length} documents`);
    
    return NextResponse.json({ previews }, { status: 200 });
    
  } catch (error: any) {
    console.error('[Document Previews] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get document previews' },
      { status: 500 }
    );
  }
}
