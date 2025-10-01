import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "./firebase";
import { User } from "../types/user";
import { firestoreStorage } from "./firestoreStorage";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, plan: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserData(firebaseUser: FirebaseUser) {
    try {
      // Try to get user by Firebase UID from Firestore
      const user = await firestoreStorage.getUserByFirebaseUid(firebaseUser.uid);

      if (user) {
        console.log("User data loaded:", { username: user.username, plan: user.plan, email: user.email });
        setUserData(user as User);
      } else {
        // User not found in Firestore, create a new user record
        console.log("User not found in Firestore, creating new user record...");

        // Extract email from Firebase user
        const email = firebaseUser.email;
        const baseUsername = email?.split('@')[0] || `user_${firebaseUser.uid.slice(0, 8)}`;

        // Use a cleaner username without random suffix
        const username = baseUsername;

        try {
          const newUser = await firestoreStorage.createUser({
            username,
            email: email || '',
            firebaseUid: firebaseUser.uid,
            plan: "starter", // Default to starter plan for auto-created users
          });

          console.log("User record created successfully with username:", username);
          setUserData(newUser as User);
        } catch (createError: any) {
          console.error("Error creating user record:", createError);
          // If creation fails, set user data to null
          setUserData(null);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData(null);
    }
  }

  async function refreshUserData() {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  }

  async function register(email: string, password: string, username: string, plan: string) {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);

    // Create user in Firestore directly (serverless)
    await firestoreStorage.createUser({
      username,
      email,
      firebaseUid: firebaseUser.uid,
      plan,
    });

    await fetchUserData(firebaseUser);
  }

  async function login(email: string, password: string) {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserData(firebaseUser);
  }

  async function logout() {
    await signOut(auth);
    setUserData(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    login,
    register,
    logout,
    refreshUserData,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
