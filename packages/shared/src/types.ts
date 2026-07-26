export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  fcmToken: string | null;
  timezone: string;
  createdAt: string;
}

export interface Friend {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Birthday {
  friendId: string;
  name: string;
  photoUrl: string | null;
  birthDate: string;
  daysUntil: number;
  turningAge: number;
}

export interface CreateFriendInput {
  name: string;
  /** ISO 8601 tarih (örn. "1995-03-14") */
  birthDate: string;
  notes?: string | null;
  photoUrl?: string | null;
}

export type UpdateFriendInput = Partial<CreateFriendInput>;
