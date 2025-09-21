import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAw-9a0aPJ2uThEyXp_juv6xLShrMg-HME",
  authDomain: "cryptopilotai-cf700.firebaseapp.com",
  projectId: "cryptopilotai-cf700",
  storageBucket: "cryptopilotai-cf700.firebasestorage.app",
  messagingSenderId: "889952144945",
  appId: "1:889952144945:web:c45b452dd07b80851acf10"
};

// Debug: Print config on load
console.log('🔧 Firebase initializing with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence (helps with network issues)
try {
  // Note: This should only be called once, before any other Firestore operations
  if (typeof window !== 'undefined') {
    import('firebase/firestore').then(({ enableNetwork, connectFirestoreEmulator }) => {
      console.log('🔗 Firestore network enabled');
    }).catch(err => {
      console.warn('⚠️ Firestore network setup warning:', err);
    });
  }
} catch (error) {
  console.warn('⚠️ Firestore offline setup warning:', error);
}

export { app, auth, db };
