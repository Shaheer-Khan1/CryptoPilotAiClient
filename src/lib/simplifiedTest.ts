import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Simplified Firebase test to isolate connection issues
export const testBasicFirebaseConnection = () => {
  try {
    console.log('🧪 BASIC FIREBASE TEST STARTING...');
    
    // Test Firebase app initialization
    const config = {
      apiKey: "AIzaSyBeiUITLIDPXmkQE2PCWnLZ4pQCXfzOmpQ",
      authDomain: "cryptopilotai.firebaseapp.com", 
      projectId: "cryptopilotai",
      storageBucket: "cryptopilotai.firebasestorage.app",
      messagingSenderId: "148334603177",
      appId: "1:148334603177:web:167db90bed63c83c3ff2b8"
    };
    
    console.log('📋 Config being used:', {
      projectId: config.projectId,
      authDomain: config.authDomain,
      hasApiKey: !!config.apiKey,
      hasAppId: !!config.appId
    });
    
    // Initialize app
    const testApp = initializeApp(config, 'test-app');
    console.log('✅ Firebase app initialized successfully');
    console.log('📱 App details:', {
      name: testApp.name,
      projectId: testApp.options.projectId
    });
    
    // Initialize Firestore
    const testDb = getFirestore(testApp);
    console.log('✅ Firestore initialized successfully');
    console.log('🗄️ Firestore app name:', testDb.app.name);
    
    return { success: true, message: 'Basic Firebase connection test passed!' };
    
  } catch (error) {
    console.error('❌ Basic Firebase test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}; 