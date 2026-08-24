import { getFirebaseFirestore } from './firebase';

export type ThemePreference = 'light' | 'dark';

export type SyncedCardPreferences = {
  wide: string[];
  expanded: string[];
  order: Record<string, string[]>;
};

export type UserPreferences = {
  version: 2 | 3 | 4;
  favorites: string[];
  cardPrefs: SyncedCardPreferences;
  sortModeEnabled: boolean;
  theme: ThemePreference;
  updatedAt: number;
};

const COLLECTION = 'userPreferences';

export async function readCloudPreferences(uid: string) {
  const firestore = await getFirebaseFirestore();
  if (!firestore) return null;
  const { doc, getDoc } = await import('firebase/firestore');
  const snapshot = await getDoc(doc(firestore, COLLECTION, uid));
  return snapshot.exists() ? snapshot.data() as UserPreferences : null;
}

export async function writeCloudPreferences(uid: string, preferences: UserPreferences) {
  const firestore = await getFirebaseFirestore();
  if (!firestore) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(firestore, COLLECTION, uid), preferences, { merge: false });
}
