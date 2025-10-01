import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface User {
  id: string;
  username: string;
  email: string;
  firebaseUid: string;
  plan: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InsertUser {
  username: string;
  email: string;
  firebaseUid: string;
  plan?: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateUserPlan(userId: string, plan: string): Promise<User>;
}

export class FirestoreStorage implements IStorage {
  private usersCollection = collection(db, 'users');

  async getUser(id: string): Promise<User | undefined> {
    try {
      const userDoc = await getDoc(doc(this.usersCollection, id));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const q = query(
        this.usersCollection,
        where('username', '==', username),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const q = query(
        this.usersCollection,
        where('email', '==', email),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const q = query(
        this.usersCollection,
        where('firebaseUid', '==', firebaseUid),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user by firebaseUid:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const now = Timestamp.now();
      const userData = {
        ...insertUser,
        plan: insertUser.plan || 'starter',
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(this.usersCollection, userData);
      return { id: docRef.id, ...userData };
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    try {
      const userRef = doc(this.usersCollection, userId);
      const updateData = {
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: Timestamp.now()
      };

      await updateDoc(userRef, updateData);
      return await this.getUser(userId) as User;
    } catch (error) {
      console.error('Error updating user stripe info:', error);
      throw new Error('Failed to update user stripe info');
    }
  }

  async updateUserPlan(userId: string, plan: string): Promise<User> {
    try {
      const userRef = doc(this.usersCollection, userId);
      const updateData = {
        plan,
        updatedAt: Timestamp.now()
      };

      await updateDoc(userRef, updateData);
      return await this.getUser(userId) as User;
    } catch (error) {
      console.error('Error updating user plan:', error);
      throw new Error('Failed to update user plan');
    }
  }
}

// Export a singleton instance
export const firestoreStorage = new FirestoreStorage();
