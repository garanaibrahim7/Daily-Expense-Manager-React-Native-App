import { initFirebase } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_USER_KEY = 'auth_user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, displayName?: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  const instanceId = useMemo(() => Math.random().toString(36).substr(2, 5), []);
  console.log(`[AuthProvider:${instanceId}] Rendering...`);

  useEffect(() => {
    let isMounted = true;
    console.log(`[AuthProvider:${instanceId}] Mounting effect...`);
    const firebase = initFirebase();
    // ... rest of effect
    if (!firebase) {
      console.error('[AuthProvider] Firebase not configured');
      setError('Firebase not configured properly');
      setLoading(false);
      return;
    }

    const restoreUser = async () => {
      try {
        const cached = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('[AuthProvider] Restored cached user:', parsed.email);
          setUser(parsed as User);
        }
      } catch (err) {
        console.warn('Error reading cached user:', err);
      }
    };

    restoreUser();

    const unsubscribe = onAuthStateChanged(firebase.auth, async (firebaseUser) => {
      if (!isMounted) return;

      console.log('[AuthProvider] Auth state changed:', firebaseUser?.email);
      setLoading(false);

      if (firebaseUser) {
        setUser(firebaseUser);
        await AsyncStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          })
        );
      } else {
        // preserve cache or handle consistent logout?
        // Matching original logic: don't clear explicitly here unless signout called?
        // actually original logic said "Don't remove cached user immediately"
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const firebase = initFirebase();
    if (!firebase) throw new Error('Firebase not initialized');

    try {
      const result = await signInWithEmailAndPassword(firebase.auth, email, password);
      console.log('[AuthProvider] Sign in success');
      setUser(result.user);
      await AsyncStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
        })
      );
      return result.user;
    } catch (err: any) {
      console.error('Sign in error:', err);
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err.message;
      setError(msg);
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    setError(null);
    const firebase = initFirebase();
    if (!firebase) throw new Error('Firebase not initialized');

    try {
      const result = await createUserWithEmailAndPassword(firebase.auth, email, password);
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      setUser(result.user);
      await AsyncStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
        })
      );
      return result.user;
    } catch (err: any) {
      console.error('Sign up error:', err);
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'Email already in use'
          : err.message;
      setError(msg);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const firebase = initFirebase();
    if (!firebase) throw new Error('Firebase not initialized');

    try {
      await firebaseSignOut(firebase.auth);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      setUser(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    const firebase = initFirebase();
    if (!firebase) throw new Error('Firebase not initialized');

    try {
      await sendPasswordResetEmail(firebase.auth, email);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      resetPassword,
      isAuthenticated: !!user,
    }),
    [user, loading, error, signIn, signUp, signOut, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
