import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/workspace/documentService';
import { getAvailableEmbeddingModelProviders } from '@/lib/providers';

// Get the first available embedding model
async function getEmbeddingModel() {
  const providers = await getAvailableEmbeddingModelProviders();
  
  const preferredProviders = ['ollama', 'openai', 'gemini', 'transformers'];
  
  for (const provider of preferredProviders) {
    if (providers[provider] && Object.keys(providers[provider]).length > 0) {
      const modelKey = Object.keys(providers[provider])[0];
      console.log(`[Document Search] Using embedding model: ${provider}/${modelKey}`);
      return providers[provider][modelKey].model;
    }
  }
  
  for (const provider in providers) {
    if (Object.keys(providers[provider]).length > 0) {
      const modelKey = Object.keys(providers[provider])[0];
      console.log(`[Document Search] Using embedding model: ${provider}/${modelKey}`);
      return providers[provider][modelKey].model;
    }
  }
  
  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const workspaceId = params.id;
    
    const body = await request.json();
    // Lower default threshold to 0.3 for better recall
    const { query, topK = 3, threshold = 0.3, conversationId } = body;
    
    console.log(`[Document Search] Workspace: ${workspaceId}, Conversation: ${conversationId || 'all'}, Query: "${query}", Threshold: ${threshold}`);
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    // Get embedding model
    const embeddingModel = await getEmbeddingModel();
    if (!embeddingModel) {
      console.error('[Document Search] No embedding model available');
      return NextResponse.json(
        { error: 'No embedding model available' },
        { status: 500 }
      );
    }
    
    // First, check how many documents exist
    const allDocs = await documentService.listDocuments(workspaceId, conversationId);
    console.log(`[Document Search] Found ${allDocs.length} documents in ${conversationId ? 'conversation' : 'workspace'}`);
    
    for (const doc of allDocs) {
      const hasEmbeddings = doc.embeddings && doc.embeddings.length > 0;
      console.log(`[Document Search] - ${doc.filename}: embeddings=${hasEmbeddings ? doc.embeddings?.length : 0} dims, content=${doc.content?.length || 0} chars`);
    }
    
    // Search documents
    const results = await documentService.searchDocuments(
      workspaceId,
      query,
      embeddingModel,
      topK,
      threshold,
      conversationId
    );
    
    console.log(`[Document Search] Found ${results.length} results above threshold ${threshold}`);
    
    // Format results for the chat context
    const formattedResults = results.map(r => ({
      filename: r.document.filename,
      content: r.relevantContent,
      similarity: r.similarity,
    }));
    
    return NextResponse.json({
      results: formattedResults,
      count: formattedResults.length,
      debug: {
        totalDocuments: allDocs.length,
        threshold,
        documentsWithEmbeddings: allDocs.filter(d => d.embeddings && d.embeddings.length > 0).length,
      }
    });
    
  } catch (error: any) {
    console.error('[Document Search] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search documents' },
      { status: 500 }
    );
  }
}
