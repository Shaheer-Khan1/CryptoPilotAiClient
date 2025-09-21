interface CachedNews {
  data: NewsItem[];
  timestamp: number;
  source: string;
}

interface NewsItem {
  title: string;
  source: string;
  time: string;
  url: string;
}

const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const CACHE_KEY = 'crypto_news_cache';

export class NewsCache {
  // Check if cached data is still valid (less than 6 hours old)
  static isCacheValid(): boolean {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return false;
      
      const cachedData: CachedNews = JSON.parse(cached);
      const now = Date.now();
      const isValid = (now - cachedData.timestamp) < CACHE_DURATION;
      
      console.log(`News cache ${isValid ? 'valid' : 'expired'} - Age: ${Math.round((now - cachedData.timestamp) / (1000 * 60))} minutes`);
      return isValid;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  // Get cached news data
  static getCachedNews(): NewsItem[] {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];
      
      const cachedData: CachedNews = JSON.parse(cached);
      return cachedData.data || [];
    } catch (error) {
      console.error('Error retrieving cached news:', error);
      return [];
    }
  }

  // Store news data in cache with timestamp
  static setCachedNews(news: NewsItem[], source: string = 'multiple'): void {
    try {
      const cacheData: CachedNews = {
        data: news,
        timestamp: Date.now(),
        source: source
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`News cached successfully - ${news.length} articles from ${source}`);
    } catch (error) {
      console.error('Error caching news:', error);
    }
  }

  // Clear cache manually
  static clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('News cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get cache info for debugging
  static getCacheInfo(): { isValid: boolean; age: number; count: number; source: string } {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return { isValid: false, age: 0, count: 0, source: 'none' };
      }
      
      const cachedData: CachedNews = JSON.parse(cached);
      const now = Date.now();
      const age = Math.round((now - cachedData.timestamp) / (1000 * 60)); // age in minutes
      const isValid = (now - cachedData.timestamp) < CACHE_DURATION;
      
      return {
        isValid,
        age,
        count: cachedData.data.length,
        source: cachedData.source
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { isValid: false, age: 0, count: 0, source: 'error' };
    }
  }
} 