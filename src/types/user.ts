// Independent client-side user types - no dependency on server schema

export interface User {
  id: number;
  username: string;
  email: string;
  firebaseUid: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: string;
  createdAt: Date;
}

export interface RegisterUserData {
  username: string;
  email: string;
  password: string;
  firebaseUid?: string;
  plan?: string;
}
