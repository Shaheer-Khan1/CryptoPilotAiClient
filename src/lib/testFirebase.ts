import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Simple test to check Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    
    // Print Firebase configuration (safe parts only)
    console.log('🔧 Firebase Config Check:');
    console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cryptopilotai');
    console.log('Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cryptopilotai.firebaseapp.com');
    console.log('API Key exists:', !!import.meta.env.VITE_FIREBASE_API_KEY);
    console.log('Database URL check:', db.app.options);
    
    // Test read operation
    const testCollection = collection(db, 'test');
    console.log('🔍 Attempting to read from Firestore...');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firebase read test successful, documents count:', snapshot.size);
    
    // Test write operation
    const testDoc = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Firebase connection test'
    };
    
    const docRef = await addDoc(testCollection, testDoc);
    console.log('✅ Firebase write test successful, document ID:', docRef.id);
    
    return { success: true, message: 'Firebase connection working!' };
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 