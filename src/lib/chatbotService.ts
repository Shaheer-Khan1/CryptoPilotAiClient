import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface ChatBot {
  id?: string;
  name: string;
  platform: string;
  status: string;
  users: number;
  messages: number;
  lastUpdated: string;
  knowledge: string;
  deploymentUrl: string | null;
  canDeploy: boolean;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const COLLECTION_NAME = 'chatbots';

// Create a new chatbot
export const createChatbot = async (botData: Omit<ChatBot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...botData,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating chatbot:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please ensure you are logged in and have proper access.');
    }
    
    if (error.code === 'unavailable') {
      throw new Error('Firebase temporarily unavailable. Please try again in a moment.');
    }
    
    throw new Error('Failed to create chatbot: ' + (error.message || 'Unknown error'));
  }
};

// Get all chatbots for a specific user
export const getUserChatbots = async (userId: string): Promise<ChatBot[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
      // Removed orderBy to avoid requiring a composite index
    );
    
    const querySnapshot = await getDocs(q);
    const bots: ChatBot[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      bots.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as ChatBot);
    });
    
    // Sort by createdAt descending in JS (if present)
    bots.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        // Firestore Timestamp has a toMillis() method
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
      return 0;
    });
    
    return bots;
  } catch (error: any) {
    console.error('Error fetching user chatbots:', error);
    
    // Handle specific Firebase permission errors
    if (error.code === 'permission-denied') {
      console.warn('⚠️ Firebase permissions denied - returning empty bots array');
      return []; // Return empty array instead of throwing
    }
    
    if (error.code === 'unavailable') {
      console.warn('⚠️ Firebase temporarily unavailable - returning cached or empty data');
      return []; // Return empty array for network issues
    }
    
    throw new Error('Failed to fetch chatbots');
  }
};

// Update a chatbot
export const updateChatbot = async (botId: string, updates: Partial<ChatBot>): Promise<void> => {
  try {
    const botRef = doc(db, COLLECTION_NAME, botId);
    await updateDoc(botRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating chatbot:', error);
    throw new Error('Failed to update chatbot');
  }
};

// Delete a chatbot
export const deleteChatbot = async (botId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, botId));
  } catch (error) {
    console.error('Error deleting chatbot:', error);
    throw new Error('Failed to delete chatbot');
  }
};

// Toggle bot status (active/inactive)
export const toggleBotStatus = async (botId: string, currentStatus: string): Promise<void> => {
  try {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const botRef = doc(db, COLLECTION_NAME, botId);
    await updateDoc(botRef, { 
      status: newStatus,
      lastUpdated: new Date().toLocaleString(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error toggling bot status:', error);
    throw new Error('Failed to toggle bot status');
  }
}; 