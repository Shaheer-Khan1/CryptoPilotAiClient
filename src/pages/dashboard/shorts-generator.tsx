import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, RefreshCw, Loader2, Video, Download, Youtube } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useState, useRef } from "react";
import { NewsCache } from "@/lib/newsCache";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Base URL for the video generation API
const VIDEO_API_BASE_URL = import.meta.env.VITE_VIDEO_API_BASE_URL || 'https://video-t4y8.onrender.com';

interface NewsItem {
  title: string;
  source: string;
  time: string;
  url: string;
}

interface GeneratedScript {
  topic: string;
  script: string;
  videoSearchQuery: string;
}

interface VideoTask {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: string;
  error?: string;
  output_file?: string;
  duration?: number;
}

export default function ShortsGenerator() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const isFreeTier = !userData?.plan || userData?.plan === "starter";
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [generating, setGenerating] = useState(false);
  const [videoTask, setVideoTask] = useState<VideoTask | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [videoBlob, setVideoBlob] = useState<string | null>(null);
  const pollAttemptRef = useRef<number>(0);

  // Fetch news data
  const fetchNews = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      // Check cache first (unless forced refresh)
      if (!forceRefresh && NewsCache.isCacheValid()) {
        const cachedNews = NewsCache.getCachedNews();
        if (cachedNews.length > 0) {
          console.log(`📋 Using cached news data (${cachedNews.length} articles)`);
          setNews(cachedNews);
          setLoading(false);
          return;
        }
      }

      // Strategy 1: CryptoPanic with multiple CORS proxies
      const corsProxies = [
        'https://allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://cors-anywhere.herokuapp.com/'
      ];

      for (const proxy of corsProxies) {
        try {
          const cryptoPanicUrl = `https://cryptopanic.com/api/free/v1/posts/?auth_token=${import.meta.env.VITE_CRYPTOPANIC_API_KEY || 'demo'}&public=true&kind=news&currencies=BTC,ETH&regions=en`;
          const response = await fetch(`${proxy}${encodeURIComponent(cryptoPanicUrl)}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const newsData = data.results.slice(0, 6).map((article: any) => ({
                title: decodeHtmlEntities(article.title || ''),
                source: article.source?.title || 'CryptoPanic',
                time: formatTimeAgo(new Date(article.published_at)),
                url: article.url
              }));
              
              setNews(newsData);
              NewsCache.setCachedNews(newsData, 'CryptoPanic');
              setLoading(false);
              return;
            }
          }
        } catch (proxyError) {
          console.log(`CryptoPanic proxy ${proxy} failed:`, proxyError);
          continue;
        }
      }

      // Fallback: CoinDesk RSS
      try {
        const rssUrl = 'https://coindesk.com/arc/outboundfeeds/rss/';
        const response = await fetch(`https://allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`);
        
        if (response.ok) {
          const rssText = await response.text();
          const parser = new DOMParser();
          const rssDoc = parser.parseFromString(rssText, 'text/xml');
          const items = rssDoc.querySelectorAll('item');
          
          if (items.length > 0) {
            const newsData = Array.from(items).slice(0, 6).map((item: any) => ({
              title: decodeHtmlEntities(item.querySelector('title')?.textContent?.replace(/<!\[CDATA\[|\]\]>/g, '') || ''),
              source: 'CoinDesk',
              time: formatTimeAgo(new Date(item.querySelector('pubDate')?.textContent || '')),
              url: item.querySelector('link')?.textContent || ''
            }));
            
            setNews(newsData);
            NewsCache.setCachedNews(newsData, 'CoinDesk');
            setLoading(false);
            return;
          }
        }
      } catch (fallbackError) {
        console.log('CoinDesk RSS fallback failed:', fallbackError);
      }

      setNews([]);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate script using Gemini
  const generateScript = async (newsItem: NewsItem) => {
    if (!newsItem) return;
    setGenerating(true);
    try {
      const prompt = `
Create a short-form video script based on this crypto news:
"${newsItem.title}"

Please provide the response in this JSON format:
{
  "topic": "A catchy, SEO-optimized title for the video (max 60 chars)",
  "script": "A compelling voiceover script that explains the news in an engaging way. The script should be conversational, easy to understand, and optimized for a 30-60 second video. DO NOT use any emojis.",
  "videoSearchQuery": "A specific search query for finding relevant stock footage on Pexels. Focus on visual elements that would work well with the script. Make it specific but not too long (3-5 words)."
}

Make it:
1. Engaging and attention-grabbing from the first second
2. Easy to understand for beginners
3. Factual and informative
4. End with a call to action
5. Keep the script length suitable for 30-60 seconds when spoken
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate script');
      }

      const data = await response.json();
      const aiResponse = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const scriptData = JSON.parse(jsonMatch[0]);
        setGeneratedScript(scriptData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error generating script:', error);
      alert('Failed to generate script. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Function to generate video
  const generateVideo = async () => {
    if (!generatedScript) return;

    try {
      // Send the generation request with callback URL for webhook
      const response = await fetch(`${VIDEO_API_BASE_URL}/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script_text: generatedScript.script,
          search_query: generatedScript.videoSearchQuery,
          font_size: 75,
          callback_url: `${window.location.origin}/api/video-callback`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Video generation error:', errorData);
        throw new Error(`Failed to start video generation: ${errorData.detail || response.statusText}`);
      }

      const taskData = await response.json();
      console.log('Generation task created:', taskData);

      setVideoTask({
        task_id: taskData.task_id,
        status: taskData.status
      });

      // Start checking for webhook completion (fallback polling)
      const interval = window.setInterval(() => checkVideoStatus(taskData.task_id), 3000);
      console.log(`[POLL] Started polling every 3s for task ${taskData.task_id}. intervalId=${interval}`);
      setPollingInterval(interval);

    } catch (error) {
      console.error('Error starting video generation:', error);
      alert('Failed to start video generation. Please try again.');
    }
  };

  // Function to fetch video and create blob URL
  const fetchAndDisplayVideo = async (taskId: string) => {
    try {
      console.log('Fetching video for task:', taskId);
      const response = await fetch(`${VIDEO_API_BASE_URL}/download/${taskId}`, {
        headers: {
          'Accept': 'video/mp4,video/*',
        }
      });

      if (!response.ok) {
        console.error('Video fetch failed:', response.status, response.statusText);
        if (response.status === 400) {
          throw new Error('Video not ready yet. Please wait a moment.');
        } else if (response.status === 404) {
          throw new Error('Video file not found. Please regenerate.');
        }
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error('Failed to fetch video');
      }

      console.log('Video response headers:', Object.fromEntries(response.headers.entries()));
      const contentType = response.headers.get('content-type');
      console.log('Content type:', contentType);

      const blob = await response.blob();
      console.log('Blob created:', {
        size: blob.size,
        type: blob.type
      });

      if (blob.size === 0) {
        throw new Error('Received empty video blob');
      }

      const url = URL.createObjectURL(blob);
      console.log('Blob URL created:', url);
      setVideoBlob(url);

    } catch (error) {
      console.error('Error fetching video:', error);
      alert('Failed to load video. Please try refreshing.');
    }
  };

  // Function to check video status from the deployed API
  const checkVideoStatus = async (taskId: string) => {
    try {
      pollAttemptRef.current += 1;
      console.log(`[POLL] Attempt #${pollAttemptRef.current} for task ${taskId} at ${new Date().toISOString()}`);
      console.log(`[POLL] Fetching: ${VIDEO_API_BASE_URL}/task/${taskId}`);
      
      const response = await fetch(`${VIDEO_API_BASE_URL}/task/${taskId}`);
      console.log(`[POLL] Response: ${response.status} ${response.statusText}`);
      console.log(`[POLL] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const videoData = await response.json();
        console.log('[POLL] Video status check:', videoData);
        
        setVideoTask({
          task_id: videoData.task_id,
          status: videoData.status,
          duration: videoData.duration,
          output_file: videoData.output_file
        });

        // If video is completed, load it
        if (videoData.status === 'completed' && videoData.output_file) {
          const videoUrl = `${VIDEO_API_BASE_URL}/download/${taskId}`;
          setVideoBlob(videoUrl);
          
          // Stop polling
          if (pollingInterval) {
            console.log(`[POLL] Task ${taskId} completed. Stopping polling. intervalId=${pollingInterval}`);
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
        
        return videoData.status === 'completed';
      } else if (response.status === 404) {
        // Video not ready yet, continue polling
        console.log(`[POLL] Video not ready (404). Continue polling...`);
      } else {
        console.error('[POLL] Error checking video status:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('[POLL] Error response body:', errorText);
      }

    } catch (error) {
      console.error('[POLL] Network/fetch error:', error);
      console.error('[POLL] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return false;
  };


  // Function to open YouTube with video ready for upload
  const openYouTubeUpload = () => {
    if (!videoBlob || !generatedScript) return;
    
    // Create a better filename
    const cleanTopic = generatedScript.topic
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `crypto-short-${cleanTopic}-${Date.now()}.mp4`;
    
    // Create a temporary download link for the video
    const downloadLink = document.createElement('a');
    downloadLink.href = videoBlob;
    downloadLink.download = filename;
    
    // Open YouTube Shorts upload page in new tab
    const youtubeUrl = 'https://www.youtube.com/shorts/upload';
    const newTab = window.open(youtubeUrl, '_blank');
    
    // Show detailed toast notification
    toast({
      title: "YouTube Shorts Upload Ready!",
      description: "YouTube opened in new tab. Your video is downloading - just drag & drop it to upload!",
      duration: 5000,
    });
    
    // Trigger download of the video file
    setTimeout(() => {
      downloadLink.click();
    }, 500);
    
    // Show additional instructions after a delay
    setTimeout(() => {
      toast({
        title: "Upload Instructions",
        description: "1. Go to the YouTube tab 2. Drag the downloaded video file to the upload area 3. Add title and publish!",
        duration: 8000,
      });
    }, 2000);
  };

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Cleanup function for blob URLs
  useEffect(() => {
    return () => {
      if (videoBlob) {
        URL.revokeObjectURL(videoBlob);
      }
    };
  }, [videoBlob]);

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Helper function to format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Initial data fetch
  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Shorts Generator</h1>
        <p className="text-slate-600 dark:text-slate-400">Generate viral crypto shorts from the latest news</p>
        {isFreeTier && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-amber-800 dark:text-amber-200 font-medium">
                Free Tier: Limited to 3 shorts per month. Upgrade to Pro for unlimited generation.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* News Selection */}
      <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-900 dark:text-white">Latest Crypto News</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchNews(true)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {news.map((item, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${
                  selectedNews?.title === item.title 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                } cursor-pointer hover:bg-primary/5`}
                onClick={() => setSelectedNews(item)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{item.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Generate Script Button */}
          {selectedNews && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => generateScript(selectedNews)}
                disabled={generating}
                className="w-full sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Script...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Generate Script
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state when no news */}
      {!loading && news.length === 0 && !generatedScript && (
        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <Video className="h-10 w-10 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">No headlines available right now. Try refresh or paste your own topic.</p>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fetchNews(true)} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh Headlines
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Script */}
      {generatedScript && (
        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Generated Script</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Topic</h3>
              <p className="text-slate-600 dark:text-slate-400">{generatedScript.topic}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Script</h3>
              <div className="whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-slate-600 dark:text-slate-400">
                {generatedScript.script}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Video Search Query</h3>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-slate-600 dark:text-slate-400">
                {generatedScript.videoSearchQuery}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={generateVideo}
                disabled={!!videoTask && videoTask.status !== 'failed'}
                className="w-full sm:w-auto"
              >
                {videoTask?.status === 'pending' || videoTask?.status === 'processing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Result */}
      {videoTask && (
        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Video Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status messages */}
            {(videoTask.status === 'pending' || videoTask.status === 'processing') && (
              <>
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <AlertDescription>
                    Video is being generated. It could take up to 5 minutes. Please stay on this screen.
                    {videoTask.progress && (
                      <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                        Current step: {videoTask.progress}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
                <div className="p-8 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    {videoTask.progress || 'Processing your video...'}
                  </p>
                </div>
              </>
            )}
            
            {/* Completed state */}
            {videoTask.status === 'completed' && (
              <div>
                {/* Debug info */}
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                  <p>Task ID: {videoTask.task_id}</p>
                  <p>Status: {videoTask.status}</p>
                  <p>Output file: {videoTask.output_file}</p>
                  <p>Video blob: {videoBlob ? 'Created' : 'Not created'}</p>
                </div>

                 {videoBlob ? (
                   <>
                     <div className="flex justify-center">
                       <div className="w-full max-w-sm mx-auto">
                         <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-lg">
                           <video 
                             className="w-full h-auto" 
                             style={{ aspectRatio: '9/16', maxHeight: '500px' }}
                             controls
                             playsInline
                             key={videoBlob}
                             src={videoBlob}
                             onLoadStart={() => console.log('Video load started')}
                             onLoadedData={() => console.log('Video data loaded')}
                             onError={(e) => {
                               console.error('Video loading error:', e);
                               const video = e.target as HTMLVideoElement;
                               console.log('Video element state:', {
                                 error: video.error?.message,
                                 networkState: video.networkState,
                                 readyState: video.readyState,
                                 src: video.src
                               });
                             }}
                           />
                         </div>
                       </div>
                     </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button
                        onClick={() => {
                          console.log('Reloading video...');
                          setVideoBlob(null);
                          fetchAndDisplayVideo(videoTask.task_id);
                        }}
                        variant="outline"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reload Video
                      </Button>
                      <Button
                        onClick={() => {
                          const url = `${VIDEO_API_BASE_URL}/download/${videoTask.task_id}`;
                          console.log('Opening download URL:', url);
                          window.open(url, '_blank');
                        }}
                        variant="outline"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Video
                      </Button>
                      <Button
                        onClick={openYouTubeUpload}
                        variant="default"
                      >
                        <Youtube className="mr-2 h-4 w-4" />
                        Open YouTube Shorts
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-slate-500 mb-4">Video is ready but not loaded</p>
                    <Button
                      onClick={() => {
                        console.log('Manual video load requested');
                        fetchAndDisplayVideo(videoTask.task_id);
                      }}
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Load Video
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Failed state */}
            {videoTask.status === 'failed' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                {videoTask.error || 'Failed to generate video. Please try again.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}