import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Upload, Link, MessageSquare, Settings, Lock, RefreshCw, Trash2, Play, Pause, Star, Crown, Loader2, ExternalLink, Copy, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  createChatbot, 
  getUserChatbots, 
  toggleBotStatus as toggleBotStatusService, 
  deleteChatbot,
  updateChatbot,
  ChatBot
} from "@/lib/chatbotService";
import { testFirebaseConnection } from "@/lib/testFirebase";
import { testBasicFirebaseConnection } from "@/lib/simplifiedTest";
import { deployBot, undeployBot, DeploymentInfo } from "@/lib/deploymentService";

export default function ChatbotBuilder() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [botName, setBotName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [dataSource, setDataSource] = useState("upload");
  const [chatMode, setChatMode] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [processingBot, setProcessingBot] = useState<any>(null);
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [showDeployment, setShowDeployment] = useState(false);

  const isFreeTier = !userData?.plan || userData?.plan === "starter";

  // Real chatbots from database
  const [userBots, setUserBots] = useState<ChatBot[]>([]);

  // Load user's chatbots from database
  const loadUserBots = async () => {
    if (!userData?.firebaseUid) return;
    
    try {
      setLoadingBots(true);
      const bots = await getUserChatbots(userData.firebaseUid);
      setUserBots(bots);
    } catch (error) {
      console.error('Error loading bots:', error);
      alert('Failed to load your bots. Please try again.');
    } finally {
      setLoadingBots(false);
    }
  };

  // Load bots when component mounts or user changes
  useEffect(() => {
    if (userData?.firebaseUid) {
      loadUserBots();
    }
  }, [userData?.firebaseUid]);

  // Gemini API integration
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const analyzeContent = async (content: any, contentType: string = "text") => {
    try {
      const prompt = `
        Analyze the following ${contentType} content and create a comprehensive knowledge base summary for an AI chatbot:
        
        Content: ${content}
        
        Please provide:
        1. A concise summary of the main topics
        2. Key concepts and terminology
        3. Important facts and figures
        4. Potential FAQ topics
        5. Context for answering user questions
        
        Format your response as a structured knowledge base that can be used to train a chatbot.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error analyzing content:', error);
      throw new Error('Failed to analyze content with Gemini AI');
    }
  };

  const generateBotResponse = async (userMessage: any, botKnowledge: any) => {
    try {
      // Debug: Log the knowledge being used
      console.log('🤖 Bot Knowledge Length:', botKnowledge ? botKnowledge.length : 0);
      console.log('🤖 User Message:', userMessage);
      console.log('🤖 Knowledge Preview:', botKnowledge ? botKnowledge.substring(0, 300) + '...' : 'No knowledge available');
      
      // Check if we have knowledge
      if (!botKnowledge || botKnowledge.trim().length === 0) {
        return "I don't have any specific knowledge base loaded yet. Please make sure a document was properly uploaded and processed when creating this bot.";
      }
      
      const prompt = `
        You are an AI chatbot trained EXCLUSIVELY on the following content. You must ONLY use this knowledge to answer questions:

        KNOWLEDGE BASE:
        ${botKnowledge}
        
        USER QUESTION: ${userMessage}
        
        STRICT INSTRUCTIONS:
        - ONLY answer based on the knowledge base provided above
        - If the question is about your training, explain that you were trained on the specific document/content provided
        - If someone asks "what are you trained on", refer to the content in your knowledge base
        - If the answer isn't in your knowledge base, say: "I can only answer questions about the specific content I was trained on. Please ask about [mention the main topic from your knowledge]"
        - Always reference specific information from your knowledge base when possible
        - Be conversational but stick strictly to your knowledge base
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error generating bot response:', error);
      return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
    }
  };

  const handleFileUpload = (event: any) => {
    const files = Array.from(event.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: any) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const extractTextFromFile = (file: any) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // For demo purposes, we'll just read text files directly
        // In production, you'd need PDF parsing libraries for PDFs, etc.
        if (file.type === 'text/plain') {
          resolve(e.target.result);
        } else {
          // Mock extraction for other file types
          resolve(`Content extracted from ${file.name}: This is sample content for demonstration.`);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const fetchUrlContent = async (url: any) => {
    // In production, you'd use a backend service to fetch and parse webpage content
    // For demo, we'll simulate this
    return `Content from ${url}: This is sample webpage content for demonstration.`;
  };

  const testFirebase = async () => {
    console.log('Running Firebase connection test...');
    const result = await testFirebaseConnection();
    alert(result.success ? '✅ Firebase working!' : `❌ Firebase error: ${result.error}`);
  };

  const testBasicFirebase = () => {
    console.log('Running BASIC Firebase test...');
    const result = testBasicFirebaseConnection();
    alert(result.success ? '✅ Basic Firebase OK!' : `❌ Basic error: ${result.error}`);
  };

  const handleCreateBot = async (e: any) => {
    e.preventDefault();
    
    if (!botName.trim()) {
      alert('Please enter a bot name');
      return;
    }

    if (!userData?.firebaseUid) {
      console.error('No user authentication found:', userData);
      alert('Please log in to create a bot');
      return;
    }
    
    console.log('User authenticated with ID:', userData.firebaseUid);

    // Check bot limits for free users
    if (isFreeTier && userBots.length >= 1) {
      alert('Free users can only create 1 bot. Upgrade to Pro for unlimited bots!');
      return;
    }

    setLoading(true);
    setProcessingBot(botName);

    try {
      let content = "";
      
      if (dataSource === "upload" && uploadedFiles.length > 0) {
        // Extract content from uploaded files
        const fileContents = await Promise.all(
          uploadedFiles.map(file => extractTextFromFile(file))
        );
        content = fileContents.join("\n\n");
      } else if (dataSource === "url" && sourceUrl.trim()) {
        // Fetch content from URL
        content = await fetchUrlContent(sourceUrl);
      } else {
        alert("Please provide training data (files or URL)");
        setLoading(false);
        setProcessingBot(null);
        return;
      }

      // Analyze content with Gemini
      const knowledgeBase = await analyzeContent(content);
      
      // Create bot data for Firebase database
      const botData = {
        name: botName,
        platform: 'Web Chat',
        status: 'training',
        users: 0,
        messages: 0,
        lastUpdated: new Date().toLocaleString(),
        knowledge: knowledgeBase,
        deploymentUrl: null,
        canDeploy: !isFreeTier,
        userId: userData.firebaseUid
      };

      console.log('Creating bot with data:', botData);

      // Save to Firebase database
      const botId = await createChatbot(botData);
      console.log('Bot created successfully with ID:', botId);
      
      // Reload bots from database to show the new bot
      await loadUserBots();
      
      // Simulate training completion after 3 seconds
      setTimeout(async () => {
        try {
          await updateChatbot(botId, { 
            status: isFreeTier ? 'created' : 'inactive',
            lastUpdated: new Date().toLocaleString()
          });
          await loadUserBots(); // Reload to get updated status
          setProcessingBot(null);
          console.log('Bot training completed');
        } catch (error) {
          console.error('Error updating bot status:', error);
          setProcessingBot(null);
        }
      }, 3000);

      // Reset form
      setBotName("");
      setDescription("");
      setSourceUrl("");
      setUploadedFiles([]);
      setActiveTab('manage');
      
      alert(isFreeTier 
        ? 'Bot created successfully! Upgrade to Pro to deploy and activate your bot.' 
        : 'Bot created successfully!'
      );
      
    } catch (error) {
      console.error('Error creating bot:', error);
      alert("Failed to create bot. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestChat = (bot: any) => {
    console.log('🧪 Testing bot with knowledge:', {
      botName: bot.name,
      hasKnowledge: !!bot.knowledge,
      knowledgeLength: bot.knowledge ? bot.knowledge.length : 0,
      knowledgePreview: bot.knowledge ? bot.knowledge.substring(0, 200) + '...' : 'No knowledge'
    });
    
    setChatMode(bot);
    setChatMessages([
      { role: "bot", content: `Hello! I'm ${bot.name}. I can help answer questions about ${bot.description || "the topics I was trained on"}. What would you like to know?` }
    ]);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatMode) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");

    // Generate bot response
    const botResponse = await generateBotResponse(userMessage, chatMode.knowledge);
    setChatMessages(prev => [...prev, { role: "bot", content: botResponse }]);
  };

  const toggleBotStatus = (botId: any) => {
    setUserBots(prev => 
      prev.map(bot => 
        bot.id === botId 
          ? { ...bot, status: bot.status === "active" ? "inactive" : "active" }
          : bot
      )
    );
  };

  const deleteBot = async (botId: any) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteChatbot(botId);
      await loadUserBots(); // Reload to remove deleted bot
      alert('Bot deleted successfully');
    } catch (error) {
      console.error('Error deleting bot:', error);
      alert('Failed to delete bot. Please try again.');
    }
  };

  const handleDeploy = async (bot: ChatBot) => {
    if (isFreeTier) {
      alert('Deploy feature is available for Pro users only. Upgrade to Pro to deploy your bots!');
      return;
    }

    try {
      const deployment = await deployBot(bot.id!, bot.name);
      // Override deployment info for local development
      const LOCAL_BASE_URL = 'http://localhost:3000';
      const localDeploymentUrl = `${LOCAL_BASE_URL}/chat/${deployment.botId}`;
      const localApiEndpoint = `${LOCAL_BASE_URL}/api/chat/${deployment.botId}`;
      const localEmbedCode = `<!-- CryptoPilot AI Chatbot (Local) -->\n<div id=\"cryptopilot-chatbot-${deployment.botId}\"></div>\n<script>\n  (function() {\n    var script = document.createElement('script');\n    script.src = '${LOCAL_BASE_URL}/embed.js';\n    script.onload = function() {\n      CryptoPilotChat.init({\n        botId: '${deployment.botId}',\n        container: '#cryptopilot-chatbot-${deployment.botId}',\n        title: '${bot.name}',\n        theme: 'modern',\n        position: 'bottom-right' // or 'inline' for embedded\n      });\n    };\n    document.head.appendChild(script);\n  })();\n<\/script>`;
      const localIntegrationScript = `// CryptoPilot AI Integration (Local)\nimport { CryptoPilotChat } from '@cryptopilot/chat-widget';\n\n// Initialize the chatbot\nconst chatbot = new CryptoPilotChat({\n  botId: '${deployment.botId}',\n  apiKey: 'your-api-key', // Get from dashboard\n  container: '#chatbot-container',\n  config: {\n    title: '${bot.name}',\n    theme: 'modern',\n    allowFileUpload: true,\n    showTypingIndicator: true,\n    position: 'bottom-right'\n  }\n});\n\n// API endpoint for custom integrations\nconst API_ENDPOINT = '${localApiEndpoint}';\n\n// Example API usage\nasync function sendMessage(message) {\n  const response = await fetch(API_ENDPOINT, {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n      'Authorization': 'Bearer your-api-key'\n    },\n    body: JSON.stringify({\n      message: message,\n      sessionId: 'user-session-id'\n    })\n  });\n  \n  return await response.json();\n}`;
      setDeploymentInfo({
        ...deployment,
        deploymentUrl: localDeploymentUrl,
        embedCode: localEmbedCode,
        apiEndpoint: localApiEndpoint,
        integrationScript: localIntegrationScript,
      });
      setShowDeployment(true);
      await loadUserBots(); // Reload to get updated deployment status
    } catch (error) {
      console.error('Error deploying bot:', error);
      alert('Failed to deploy bot. Please try again.');
    }
  };

  const handleUndeploy = async (botId: string) => {
    if (!confirm('Are you sure you want to undeploy this bot? The current deployment URL will stop working.')) {
      return;
    }

    try {
      await undeployBot(botId);
      await loadUserBots(); // Reload to get updated status
      alert('Bot undeployed successfully');
    } catch (error) {
      console.error('Error undeploying bot:', error);
      alert('Failed to undeploy bot. Please try again.');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  if (chatMode) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Testing: {chatMode.name}</h2>
            <p className="text-slate-600 dark:text-slate-400">Chat with your AI bot</p>
          </div>
          <Button onClick={() => setChatMode(null)} variant="outline">
            Back to Bots
          </Button>
        </div>

        <Card className="h-96 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === "user" 
                    ? "bg-blue-500 text-white" 
                    : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-4 flex space-x-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage}>Send</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Project Chatbot Builder</h1>
        <p className="text-slate-600 dark:text-slate-400">Create AI-powered chatbots from project documentation</p>
        {isFreeTier && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-amber-600" />
              <span className="text-amber-800 dark:text-amber-200 font-medium">
                Free Tier: Limited to 1 bot. Upgrade to Pro for unlimited bots and deployment.
              </span>
            </div>
          </div>
        )}
      </div>

      {processingBot && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              Processing "{processingBot}" with Gemini AI... This may take a few minutes.
            </span>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Create New Bot</TabsTrigger>
          <TabsTrigger value="manage">My Bots ({userBots.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Create AI Chatbot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="botName" className="text-slate-700 dark:text-slate-300">Bot Name</Label>
                  <Input
                    id="botName"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="e.g., Solana Protocol Assistant"
                    className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what your bot will help users with..."
                    className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600"
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-slate-700 dark:text-slate-300">Training Data Source</Label>
                  
                  <Tabs value={dataSource} onValueChange={setDataSource}>
                    <TabsList>
                      <TabsTrigger value="upload">Upload Files</TabsTrigger>
                      <TabsTrigger value="url">Website/Docs URL</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload" className="space-y-4">
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                        <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                          Upload whitepapers, documentation, or text files
                        </p>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.docx,.txt,.md"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="fileUpload"
                        />
                        <Button type="button" variant="outline" onClick={() => document.getElementById('fileUpload').click()}>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose Files
                        </Button>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                          Supports PDF, DOCX, TXT files up to 10MB each
                        </p>
                      </div>
                      
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300">Uploaded Files:</Label>
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded">
                              <span className="text-sm">{file.name}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="url" className="space-y-4">
                      <div>
                        <Label htmlFor="sourceUrl" className="text-slate-700 dark:text-slate-300">Documentation URL</Label>
                        <Input
                          id="sourceUrl"
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          placeholder="https://docs.project.com"
                          className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={testBasicFirebase}
                    className="w-full"
                  >
                    🧪 Test Basic Firebase (Check Keys)
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={testFirebase}
                    className="w-full"
                  >
                    🔧 Test Firebase Connection
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleCreateBot} 
                    disabled={loading || (isFreeTier && userBots.length >= 1)} 
                    className="w-full"
                  >
                    {loading ? "Creating Bot with AI..." : isFreeTier && userBots.length >= 1 ? "Upgrade to Pro for More Bots" : "Create AI Chatbot"}
                  </Button>
                </div>
                
                {isFreeTier && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Free Tier Limitations</h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• Create 1 bot only</li>
                          <li>• Cannot deploy to platforms</li>
                          <li>• Web chat testing only</li>
                        </ul>
                        <Button variant="outline" size="sm" className="mt-3">
                          <Crown className="mr-2 h-4 w-4" />
                          Upgrade to Pro for Full Features
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-900 dark:text-white">Your Bots</CardTitle>
              <Button variant="outline" size="sm" onClick={loadUserBots} disabled={loadingBots}>
                {loadingBots ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingBots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-slate-600 dark:text-slate-400">Loading your bots...</span>
                </div>
              ) : userBots.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No bots created yet</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Create your first AI chatbot to get started
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Bot className="mr-2 h-4 w-4" />
                    Create Your First Bot
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {userBots.map((bot) => (
                  <div key={bot.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                          <Bot className="text-primary h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{bot.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{bot.platform}</Badge>
                            <Badge 
                              variant={bot.status === "active" ? "default" : bot.status === "processing" ? "secondary" : "outline"}
                            >
                              {bot.status}
                            </Badge>
                          </div>
                          {bot.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{bot.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {bot.users} users
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {bot.messages} messages
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          Updated {bot.lastUpdated}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleTestChat(bot)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Test Chat
                      </Button>
                      
                      {!isFreeTier && (
                        bot.deploymentUrl ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => window.open(bot.deploymentUrl, '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Live
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleUndeploy(bot.id!)}>
                              <Pause className="mr-2 h-4 w-4" />
                              Undeploy
                            </Button>
                          </div>
                        ) : (
                          <Button variant="default" size="sm" onClick={() => handleDeploy(bot)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Deploy
                          </Button>
                        )
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleBotStatus(bot.id!)}
                        disabled={isFreeTier && bot.status !== 'active'}
                      >
                        {bot.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteBot(bot.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deployment Modal */}
      {showDeployment && deploymentInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bot Deployed Successfully! 🎉</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowDeployment(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Your bot is now live! Use the integration options below to add it to your website.
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Deployment URL */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">Live Chat URL</Label>
                <div className="mt-2 flex items-center space-x-2">
                  <Input 
                    value={deploymentInfo.deploymentUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(deploymentInfo.deploymentUrl, 'Deployment URL')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(deploymentInfo.deploymentUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Embed Code */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">Website Embed Code</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Copy and paste this code into your website's HTML to add the chatbot
                </p>
                <div className="relative">
                  <Textarea 
                    value={deploymentInfo.embedCode}
                    readOnly
                    className="font-mono text-xs h-32 bg-slate-50 dark:bg-slate-900"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(deploymentInfo.embedCode, 'Embed code')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* API Endpoint */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">API Endpoint</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  For custom integrations and direct API access
                </p>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={deploymentInfo.apiEndpoint} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(deploymentInfo.apiEndpoint, 'API endpoint')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Integration Script */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">Developer Integration</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Advanced integration code for developers
                </p>
                <div className="relative">
                  <Textarea 
                    value={deploymentInfo.integrationScript}
                    readOnly
                    className="font-mono text-xs h-48 bg-slate-50 dark:bg-slate-900"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(deploymentInfo.integrationScript, 'Integration script')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" onClick={() => setShowDeployment(false)}>
                  Close
                </Button>
                <Button onClick={() => window.open(deploymentInfo.deploymentUrl, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Test Live Bot
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}