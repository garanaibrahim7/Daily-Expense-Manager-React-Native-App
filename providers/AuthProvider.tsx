import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { initFirebase } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_USER_KEY = 'auth_user';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const firebase = initFirebase();
    if (!firebase) {
      setError('Firebase not configured properly');
      setLoading(false);
      return;
    }

    const restoreUser = async () => {
      try {
        const cached = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('Restoring cached user:', parsed.email);
          setUser(parsed as User);
        }
      } catch (err) {
        console.warn('Error reading cached user:', err);
      }
    };

    restoreUser();

    const unsubscribe = onAuthStateChanged(firebase.auth, async (firebaseUser) => {
      if (!isMounted) return;

      console.log('Auth state changed:', firebaseUser?.uid);
      setLoading(false);

      // If Firebase returns a valid user, update the cache
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
        // ❗ Don't remove cached user immediately
        // Just log the event. Keep session until user signs out manually.
        console.log('Firebase returned null, keeping cached user');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  /** ---------- AUTH ACTIONS ---------- */
  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const firebase = initFirebase();
    if (!firebase) throw new Error('Firebase not initialized');

    try {
      console.log('Signing in...');
      const result = await signInWithEmailAndPassword(firebase.auth, email, password);
      console.log('Sign in successful:', result.user.uid);
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
      console.log('Creating account...');
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
      console.log('Signing out...');
      await firebaseSignOut(firebase.auth);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      setUser(null);
      console.log('Signed out successfully');
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
      console.log('Password reset email sent');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  return useMemo(
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
});
