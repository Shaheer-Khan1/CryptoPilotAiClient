import { updateChatbot } from './chatbotService';

export interface DeploymentInfo {
  botId: string;
  deploymentUrl: string;
  embedCode: string;
  apiEndpoint: string;
  integrationScript: string;
}

// Generate deployment URL and integration code
export const deployBot = async (botId: string, botName: string): Promise<DeploymentInfo> => {
  try {
    // Generate unique deployment URL
    const deploymentId = generateDeploymentId();
    const deploymentUrl = `https://cryptopilot-ai.vercel.app/chat/${deploymentId}`;
    const apiEndpoint = `https://cryptopilot-ai.vercel.app/api/chat/${deploymentId}`;
    
    // Generate embed code for websites
    const embedCode = `<!-- CryptoPilot AI Chatbot -->
<div id="cryptopilot-chatbot-${deploymentId}"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://cryptopilot-ai.vercel.app/embed.js';
    script.onload = function() {
      CryptoPilotChat.init({
        botId: '${deploymentId}',
        container: '#cryptopilot-chatbot-${deploymentId}',
        title: '${botName}',
        theme: 'modern',
        position: 'bottom-right' // or 'inline' for embedded
      });
    };
    document.head.appendChild(script);
  })();
</script>`;

    // Generate integration script for developers
    const integrationScript = `// CryptoPilot AI Integration
import { CryptoPilotChat } from '@cryptopilot/chat-widget';

// Initialize the chatbot
const chatbot = new CryptoPilotChat({
  botId: '${deploymentId}',
  apiKey: 'your-api-key', // Get from dashboard
  container: '#chatbot-container',
  config: {
    title: '${botName}',
    theme: 'modern',
    allowFileUpload: true,
    showTypingIndicator: true,
    position: 'bottom-right'
  }
});

// API endpoint for custom integrations
const API_ENDPOINT = '${apiEndpoint}';

// Example API usage
async function sendMessage(message) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-api-key'
    },
    body: JSON.stringify({
      message: message,
      sessionId: 'user-session-id'
    })
  });
  
  return await response.json();
}`;

    // Update bot with deployment URL
    await updateChatbot(botId, {
      deploymentUrl: deploymentUrl,
      status: 'active'
    });

    return {
      botId,
      deploymentUrl,
      embedCode,
      apiEndpoint,
      integrationScript
    };

  } catch (error) {
    console.error('Error deploying bot:', error);
    throw new Error('Failed to deploy bot');
  }
};

// Generate unique deployment ID
const generateDeploymentId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${randomStr}`;
};

// Undeploy a bot
export const undeployBot = async (botId: string): Promise<void> => {
  try {
    await updateChatbot(botId, {
      deploymentUrl: null,
      status: 'inactive'
    });
  } catch (error) {
    console.error('Error undeploying bot:', error);
    throw new Error('Failed to undeploy bot');
  }
}; 