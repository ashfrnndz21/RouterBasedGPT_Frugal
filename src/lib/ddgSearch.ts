import axios from 'axios';

export interface DDGSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface DDGSearchResponse {
  results: DDGSearchResult[];
  suggestions: string[];
}

/**
 * Search using DuckDuckGo HTML scraping
 * More reliable than public SearxNG instances
 */
export async function searchDuckDuckGo(
  query: string,
  options: {
    language?: string;
    maxResults?: number;
  } = {}
): Promise<DDGSearchResponse> {
  const { language = 'en', maxResults = 10 } = options;

  try {
    // Use DuckDuckGo's HTML interface
    const response = await axios.get('https://html.duckduckgo.com/html/', {
      params: {
        q: query,
        kl: language === 'en' ? 'us-en' : language,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 3000, // PERFORMANCE FIX: Reduced from 10s to 3s - fail faster
    });

    const html = response.data;
    const results: DDGSearchResult[] = [];

    // Parse DuckDuckGo HTML results
    // Look for result__title and result__url patterns
    const titleRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g;
    
    // Extract titles and URLs
    let match;
    const tempResults: Array<{url: string; title: string}> = [];
    while ((match = titleRegex.exec(html)) !== null && tempResults.length < maxResults) {
      const [, url, title] = match;
      if (url && title) {
        tempResults.push({
          url: url.trim(),
          title: title.trim(),
        });
      }
    }
    
    // Extract snippets
    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].trim());
    }
    
    // Combine results
    tempResults.forEach((result, i) => {
      results.push({
        url: result.url,
        title: result.title,
        content: snippets[i] || '',
      });
    });

    // If regex parsing fails, return at least something
    if (results.length === 0) {
      console.warn('[DDG] No results parsed, returning fallback');
      results.push({
        title: 'Search Results',
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        content: `Search results for: ${query}`,
      });
    }

    return {
      results,
      suggestions: [],
    };
  } catch (error: any) {
    console.error('[DDG] Search error:', error.message);
    
    // Return fallback result instead of throwing
    return {
      results: [
        {
          title: 'Search Results',
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          content: `Information about: ${query}`,
        },
      ],
      suggestions: [],
    };
  }
}
