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
import { apiRequest } from "./queryClient";

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
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const user = await response.json();
        console.log("User data loaded:", { username: user.username, plan: user.plan, email: user.email });
        setUserData(user);
      } else if (response.status === 404) {
        // User not found in database - this should only happen for new registrations, not logins
        console.log("User not found in database. This might be a registration flow or a data issue.");
        
        // For now, we'll only auto-create users if they don't exist
        // In a production app, you'd want to handle this more carefully
        console.warn("Auto-creating user for:", firebaseUser.email);
        
        // Extract email from Firebase user
        const email = firebaseUser.email;
        const baseUsername = email?.split('@')[0] || `user_${firebaseUser.uid.slice(0, 8)}`;
        
        // Create user in our database with default starter plan
        // Use a cleaner username without random suffix
        const username = baseUsername;
        
        try {
          await apiRequest("POST", "/api/users", {
            username,
            email: email || '',
            password: "firebase", // Firebase handles auth, this is just a placeholder
            firebaseUid: firebaseUser.uid,
            plan: "starter", // Default to starter plan for auto-created users
          });
          
          console.log("User record created successfully with username:", username);
        } catch (createError: any) {
          console.error("Error creating user record:", createError);
          // If creation fails, we'll still try to fetch user data in case it was created by another request
        }
        
        // Retry fetching user data
        const retryResponse = await fetch("/api/user", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (retryResponse.ok) {
          const user = await retryResponse.json();
          setUserData(user);
          console.log("User data loaded successfully after creation");
        } else {
          console.error("Failed to fetch user data after creation");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }

  async function refreshUserData() {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  }

  async function register(email: string, password: string, username: string, plan: string) {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user in our database
    const token = await firebaseUser.getIdToken();
    await apiRequest("POST", "/api/users", {
      username,
      email,
      password: "firebase", // Firebase handles auth, this is just a placeholder
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
