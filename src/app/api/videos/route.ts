import handleVideoSearch from '@/lib/chains/videoSearchAgent';
import {
  getCustomOpenaiApiKey,
  getCustomOpenaiApiUrl,
  getCustomOpenaiModelName,
} from '@/lib/config';
import { getAvailableChatModelProviders } from '@/lib/providers';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';

interface ChatModel {
  provider: string;
  model: string;
}

interface VideoSearchBody {
  query: string;
  chatHistory: any[];
  chatModel?: ChatModel;
}

export const POST = async (req: Request) => {
  // Use Serper for fast video search (YouTube results)
  try {
    const { searchSerper } = await import('@/lib/serperSearch');
    const { getSerperApiKey } = await import('@/lib/config');
    const { preferenceManager } = await import('@/lib/preferences/preferenceManager');
    
    const body: VideoSearchBody = await req.json();
    const serperApiKey = getSerperApiKey();
    
    if (!serperApiKey || serperApiKey.trim() === '') {
      console.log('[Videos API] No Serper API key configured');
      return Response.json({ videos: [] });
    }
    
    // Get result count from user preferences
    const resultCount = preferenceManager.getResultCount();
    
    // Search for videos using Serper (searches YouTube)
    const results = await searchSerper(`${body.query} site:youtube.com`, {
      apiKey: serperApiKey,
      type: 'search',
      num: resultCount,
    });
    
    // Filter for YouTube results and map to expected format
    const videos = results.results
      .filter(result => result.url.includes('youtube.com'))
      .map(result => {
        const videoId = extractYouTubeId(result.url);
        return {
          url: result.url,
          title: result.title || body.query,
          img_src: result.imageUrl || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          iframe_src: `https://www.youtube.com/embed/${videoId}`,
        };
      });
    
    console.log(`[Videos API] Found ${videos.length} videos for: "${body.query}"`);
    return Response.json({ videos });
  } catch (error: any) {
    console.error('[Videos API] Error:', error.message);
    return Response.json({ videos: [] });
  }
};

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : '';
}
