// lib/firebase.ts
import * as db from '@/lib/database';
import firebaseConfig from '@/lib/firebaseAPI.json';
import { Transaction, TransactionMode } from '@/types/transaction';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import {
  Firestore, collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc
} from 'firebase/firestore';

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;

// const firebaseConfig = {
//   apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
// };


export function initFirebase(): { app: FirebaseApp; firestore: Firestore; auth: Auth } {
  if (!app) {
    const existing = getApps();
    app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);

    // Initialize Auth with AsyncStorage persistence
    if (existing.length === 0) {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
      });
    } else {
      auth = getAuth(app);
    }

    firestore = getFirestore(app);
    // console.log('✅ Firebase initialized');
  }
  return { app, firestore: firestore!, auth: auth! };
}

/* Fetch remote collections */
export async function fetchAllTransactionModes(userId: string): Promise<TransactionMode[]> {
  try {
    const { firestore } = initFirebase();
    const snapshot = await getDocs(collection(firestore, `users/${userId}/transaction_modes`));
    return snapshot.docs.map(d => ({
      id: d.id,
      name: (d.data() as any).name,
      initialBalance: (d.data() as any).initialBalance,
      currentBalance: (d.data() as any).currentBalance,
      color: (d.data() as any).color,
      icon: (d.data() as any).icon,
      createdAt: (d.data() as any).createdAt,
      synced: true,
      spendLimit: (d.data() as any).spendLimit || 0,
    }));
  } catch (err) {

    return [];
  }
}

export async function fetchAllTransactions(userId: string): Promise<Transaction[]> {
  try {
    const { firestore } = initFirebase();
    const snapshot = await getDocs(collection(firestore, `users/${userId}/transactions`));
    return snapshot.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id,
        modeId: data.modeId,
        amount: data.amount,
        type: data.type,
        category: data.category,
        note: data.note,
        date: data.date,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        synced: true,
        isExcluded: data.isExcluded,
      } as Transaction;
    });
  } catch (err) {

    return [];
  }
}

/* Push single mode -> firebase (upsert) */
export async function syncTransactionModeToFirebase(userId: string, mode: TransactionMode): Promise<void> {
  try {
    const { firestore } = initFirebase();
    const ref = doc(firestore, `users/${userId}/transaction_modes`, mode.id);
    await setDoc(ref, {
      name: mode.name,
      initialBalance: mode.initialBalance,
      currentBalance: mode.currentBalance,
      color: mode.color,
      icon: mode.icon,
      createdAt: mode.createdAt,
      updatedAt: Date.now(),
      spendLimit: mode.spendLimit || 0,
    }, { merge: true });
    // console.log('Uploaded mode to firebase:', mode.id);
  } catch (err) {

    throw err;
  }
}

/* Push single transaction -> firebase (upsert) */
export async function syncTransactionToFirebase(userId: string, transaction: Transaction): Promise<void> {
  try {
    const { firestore } = initFirebase();
    const ref = doc(firestore, `users/${userId}/transactions`, transaction.id);
    await setDoc(ref, {
      modeId: transaction.modeId,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category ?? null,
      note: transaction.note ?? null,
      date: transaction.date,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      isExcluded: transaction.isExcluded || false,
    }, { merge: true });
    // console.log('Uploaded transaction to firebase:', transaction.id);
  } catch (err) {

    throw err;
  }
}

export async function deleteTransactionFromFirebase(userId: string, txId: string): Promise<void> {
  try {
    const { firestore } = initFirebase();
    await deleteDoc(doc(firestore, `users/${userId}/transactions`, txId));
    // console.log('Deleted transaction on firebase:', txId);
  } catch (err) {

    throw err;
  }
}

export async function deleteTransactionModeFromFirebase(userId: string, modeId: string): Promise<void> {
  try {
    const { firestore } = initFirebase();
    await deleteDoc(doc(firestore, `users/${userId}/transaction_modes`, modeId));
    // console.log('Deleted mode on firebase:', modeId);
  } catch (err) {

    throw err;
  }
}

/* ----------------------
   Bidirectional batch sync routine
   - Pull remote -> upsert local
   - Push local unsynced -> remote
   - Mark local rows synced after successful upload
   ---------------------- */
export async function syncBidirectionalData(userId: string): Promise<{ uploaded: number; downloaded: number }> {
  if (!userId) throw new Error('userId required for sync');

  let uploaded = 0;
  let downloaded = 0;

  try {
    // 1) Pull remote -> upsert local
    const [remoteModes, remoteTxs] = await Promise.all([
      fetchAllTransactionModes(userId),
      fetchAllTransactions(userId),
    ]);

    for (const rm of remoteModes) {
      try {
        await db.upsertTransactionMode(userId, rm);
        downloaded++;
      } catch (err) {

      }
    }

    for (const rt of remoteTxs) {
      try {
        await db.upsertTransaction(userId, rt);
        downloaded++;
      } catch (err) {

      }
    }

    // 2) Push local unsynced -> remote
    const [localModes, localTxs] = await Promise.all([
      db.getUnsyncedTransactionModes(userId),
      db.getUnsyncedTransactions(userId),
    ]);

    for (const lm of localModes) {
      try {
        await syncTransactionModeToFirebase(userId, lm);
        await db.markTransactionModeSynced(lm.id);
        uploaded++;
      } catch (err) {

      }
    }

    for (const lt of localTxs) {
      try {
        await syncTransactionToFirebase(userId, lt);
        await db.markTransactionSynced(lt.id);
        uploaded++;
      } catch (err) {

      }
    }

    // console.log(`syncBidirectionalData done uploaded=${uploaded} downloaded=${downloaded}`);
    return { uploaded, downloaded };
  } catch (err) {

    return { uploaded, downloaded };
  }
}
