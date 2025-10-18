import axios from 'axios';

export interface SerperSearchResult {
  title: string;
  url: string;
  content: string;
  snippet?: string;
  imageUrl?: string;
}

export interface SerperSearchResponse {
  results: SerperSearchResult[];
  suggestions: string[];
}

/**
 * Search using Serper.dev API
 * Fast, reliable, and includes images, news, etc.
 * 
 * Get API key: https://serper.dev/
 * Free tier: 2,500 searches/month
 */
export async function searchSerper(
  query: string,
  options: {
    apiKey: string;
    type?: 'search' | 'images' | 'news' | 'places';
    num?: number;
  }
): Promise<SerperSearchResponse> {
  const { apiKey, type = 'search', num = 10 } = options;

  try {
    const response = await axios.post(
      `https://google.serper.dev/${type}`,
      {
        q: query,
        num,
      },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    const data = response.data;
    const results: SerperSearchResult[] = [];

    // Parse organic results
    if (data.organic) {
      data.organic.forEach((result: any) => {
        results.push({
          title: result.title || '',
          url: result.link || '',
          content: result.snippet || '',
          snippet: result.snippet || '',
          imageUrl: result.imageUrl || result.thumbnail || '', // Capture thumbnail images
        });
      });
    }

    // Parse image results
    if (data.images) {
      data.images.forEach((result: any) => {
        results.push({
          title: result.title || '',
          url: result.imageUrl || result.link || '', // Image URL is the actual image
          content: result.snippet || result.title || '',
          snippet: result.snippet || '',
          imageUrl: result.imageUrl || result.link || '', // Store the image URL
        });
      });
    }

    // Parse news results
    if (data.news) {
      data.news.forEach((result: any) => {
        results.push({
          title: result.title || '',
          url: result.link || '',
          content: result.snippet || '',
          snippet: result.snippet || '',
          imageUrl: result.imageUrl || result.thumbnail || result.image || '', // Try multiple image fields
        });
      });
    }

    // Get related searches as suggestions
    const suggestions: string[] = [];
    if (data.relatedSearches) {
      data.relatedSearches.forEach((related: any) => {
        if (related.query) {
          suggestions.push(related.query);
        }
      });
    }

    console.log(`[Serper] Found ${results.length} results for: "${query}"`);

    return {
      results,
      suggestions,
    };
  } catch (error: any) {
    console.error('[Serper] Search error:', error.message);
    
    // Return empty results instead of throwing
    return {
      results: [],
      suggestions: [],
    };
  }
}

/**
 * Search for images using Serper
 */
export async function searchSerperImages(
  query: string,
  apiKey: string,
  num: number = 10
): Promise<SerperSearchResult[]> {
  const response = await searchSerper(query, {
    apiKey,
    type: 'images',
    num,
  });
  return response.results;
}

/**
 * Search for news using Serper
 */
export async function searchSerperNews(
  query: string,
  apiKey: string,
  num: number = 10
): Promise<SerperSearchResult[]> {
  const response = await searchSerper(query, {
    apiKey,
    type: 'news',
    num,
  });
  return response.results;
}
