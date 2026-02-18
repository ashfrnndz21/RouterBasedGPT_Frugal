import axios from 'axios';
import { getSearxngApiEndpoint, getSerperApiKey } from './config';
import { searchDuckDuckGo } from './ddgSearch';
import { searchSerper } from './serperSearch';
import { preferenceManager } from './preferences/preferenceManager';

interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
}

export const searchSearxng = async (
  query: string,
  opts?: SearxngSearchOptions,
) => {
  const serperApiKey = getSerperApiKey();
  const searxngURL = getSearxngApiEndpoint();

  // Get result count from user preferences
  const resultCount = preferenceManager.getResultCount();

  // Priority 1: Use Serper if API key is configured
  if (serperApiKey && serperApiKey.trim() !== '') {
    console.log('[Search] Using Serper.dev for search');
    try {
      const serperResults = await searchSerper(query, {
        apiKey: serperApiKey,
        type: 'search',
        num: resultCount,
      });
      // Map imageUrl to thumbnail for compatibility
      const mappedResults = serperResults.results.map(result => ({
        ...result,
        thumbnail: result.imageUrl || '',
      }));
      return {
        results: mappedResults as SearxngSearchResult[],
        suggestions: serperResults.suggestions,
      };
    } catch (error: any) {
      console.error('[Search] Serper error, falling back:', error.message);
    }
  }

  // Priority 2: If no Serper or no SearxNG URL, use DuckDuckGo
  if (!searxngURL || searxngURL.trim() === '') {
    console.log('[Search] No SearxNG configured, using DuckDuckGo fallback');
    const ddgResults = await searchDuckDuckGo(query, {
      language: opts?.language || 'en',
      maxResults: resultCount,
    });
    return {
      results: ddgResults.results as SearxngSearchResult[],
      suggestions: ddgResults.suggestions,
    };
  }

  try {
    const url = new URL(`${searxngURL}/search?format=json`);
    url.searchParams.append('q', query);

    if (opts) {
      Object.keys(opts).forEach((key) => {
        const value = opts[key as keyof SearxngSearchOptions];
        if (Array.isArray(value)) {
          url.searchParams.append(key, value.join(','));
          return;
        }
        url.searchParams.append(key, value as string);
      });
    }

    const res = await axios.get(url.toString(), {
      timeout: 3000, // PERFORMANCE FIX: Reduced from 10s to 3s
    });

    const results: SearxngSearchResult[] = res.data.results;
    const suggestions: string[] = res.data.suggestions;

    return { results, suggestions };
  } catch (error: any) {
    console.error('[Search] SearxNG error, falling back to DuckDuckGo:', error.message);
    
    // Fallback to DuckDuckGo if SearxNG fails
    const ddgResults = await searchDuckDuckGo(query, {
      language: opts?.language || 'en',
      maxResults: resultCount,
    });
    return {
      results: ddgResults.results as SearxngSearchResult[],
      suggestions: ddgResults.suggestions,
    };
  }
};
