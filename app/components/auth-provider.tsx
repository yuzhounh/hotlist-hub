'use client';

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  configured: boolean;
  signingIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!configured);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    setSigningIn(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, ready, configured, signingIn, signInWithGoogle, signOutUser }),
    [configured, ready, signInWithGoogle, signOutUser, signingIn, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
