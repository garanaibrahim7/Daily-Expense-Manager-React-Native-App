// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore, collection, doc, setDoc, getDocs, deleteDoc
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { Transaction, TransactionMode } from '@/types/transaction';
import * as db from '@/lib/database';

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;

const firebaseConfig = {
  apiKey: 'YOUR API KEY',
  authDomain: 'YOUR DOMAIN NAME',
  projectId: 'YOUR PROJECT ID',
  storageBucket: 'YOUR PROJECT DETAIL',
  messagingSenderId: 'YOUR PROJECT ID',
  appId: 'YOUR APP ID',
};

export function initFirebase(): { app: FirebaseApp; firestore: Firestore; auth: Auth } {
  if (!app) {
    const existing = getApps();
    app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized');
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
    }));
  } catch (err) {
    console.error('fetchAllTransactionModes error', err);
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
      } as Transaction;
    });
  } catch (err) {
    console.error('fetchAllTransactions error', err);
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
    }, { merge: true });
    console.log('Uploaded mode to firebase:', mode.id);
  } catch (err) {
    console.warn('Failed upload mode to firebase', err);
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
    }, { merge: true });
    console.log('Uploaded transaction to firebase:', transaction.id);
  } catch (err) {
    console.warn('Failed upload transaction to firebase', err);
    throw err;
  }
}

export async function deleteTransactionFromFirebase(userId: string, txId: string): Promise<void> {
  try {
    const { firestore } = initFirebase();
    await deleteDoc(doc(firestore, `users/${userId}/transactions`, txId));
    console.log('Deleted transaction on firebase:', txId);
  } catch (err) {
    console.warn('Failed delete transaction on firebase', err);
    throw err;
  }
}

export async function deleteTransactionModeFromFirebase(userId: string, modeId: string): Promise<void> {
  try {
    const { firestore } = initFirebase();
    await deleteDoc(doc(firestore, `users/${userId}/transaction_modes`, modeId));
    console.log('Deleted mode on firebase:', modeId);
  } catch (err) {
    console.warn('Failed delete mode on firebase', err);
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
        console.warn('upsert mode failed', rm.id, err);
      }
    }

    for (const rt of remoteTxs) {
      try {
        await db.upsertTransaction(userId, rt);
        downloaded++;
      } catch (err) {
        console.warn('upsert transaction failed', rt.id, err);
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
        console.warn('upload local mode failed', lm.id, err);
      }
    }

    for (const lt of localTxs) {
      try {
        await syncTransactionToFirebase(userId, lt);
        await db.markTransactionSynced(lt.id);
        uploaded++;
      } catch (err) {
        console.warn('upload local tx failed', lt.id, err);
      }
    }

    console.log(`syncBidirectionalData done uploaded=${uploaded} downloaded=${downloaded}`);
    return { uploaded, downloaded };
  } catch (err) {
    console.error('syncBidirectionalData error', err);
    return { uploaded, downloaded };
  }
}
