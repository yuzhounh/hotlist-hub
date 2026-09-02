'use client';

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  configured: boolean;
  signingIn: boolean;
  signInError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!configured);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

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
    setSignInError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : '';

      if (code === 'auth/popup-blocked') {
        setSignInError('登录窗口被拦截，请允许本站弹窗或暂停 AdGuard 后重试。');
      } else if (code === 'auth/popup-closed-by-user') {
        setSignInError('登录窗口已关闭，请重新点击 Google 登录。');
      } else {
        setSignInError('Google 登录失败，请稍后重试。');
      }
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
    () => ({ user, ready, configured, signingIn, signInError, signInWithGoogle, signOutUser }),
    [configured, ready, signInError, signInWithGoogle, signOutUser, signingIn, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
