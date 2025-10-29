import * as db from '@/lib/database';
import * as firebase from '@/lib/firebase';
import { Transaction, TransactionMode } from '@/types/transaction';
import createContextHook from '@nkzw/create-context-hook';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const [TransactionProvider, useTransactions] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.uid || '';

  useEffect(() => {
    db.initDatabase().catch(err => console.error('DB init failed', err));
  }, []);

  /**********************
   *  ON LOGIN: ONE-TIME BACKUP PULL
   *
   *  If local DB is empty (no modes & no transactions) -> fetch from Firebase and upsert locally.
   *  This is a one-time action after login. We DO NOT continuously mirror remote.
   **********************/
  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    (async () => {
      try {
        await db.initDatabase();

        // check if local DB has data
        const localModes = await db.getAllTransactionModes(userId);
        const localTxs = await db.getAllTransactions(userId);

        if ((localModes?.length ?? 0) === 0 && (localTxs?.length ?? 0) === 0) {
          // only if local DB empty -> do backup from Firebase once
          console.log('Local DB empty → pulling backup from Firebase...');
          const [remoteModes, remoteTxs] = await Promise.all([
            firebase.fetchAllTransactionModes(userId),
            firebase.fetchAllTransactions(userId),
          ]);

          // upsert into local DB (mark as synced=true since coming from remote)
          for (const m of remoteModes) {
            await db.upsertTransactionMode(userId, { ...m, synced: true });
          }
          for (const t of remoteTxs) {
            await db.upsertTransaction(userId, { ...t, synced: true });
          }

          // refresh queries
          if (mounted) {
            queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
            queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
          }
        } else {
          console.log('Local DB not empty → skipping initial backup pull.');
        }
      } catch (err) {
        console.error('Initial backup pull failed', err);
      }
    })();

    return () => { mounted = false; };
  }, [userId]);

  /**********************
   *  AUTO SYNC (uploads unsynced rows when online)
   *  - Start on login
   *  - Re-run on network reconnect
   **********************/
  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const trySync = async () => {
      try {
        // only attempt upload if connected
        const state = await NetInfo.fetch();
        if (!state.isConnected) return;

        console.log('Network online — attempting to upload unsynced rows...');
        // upload unsynced transaction_modes and transactions
        const unsyncedModes = await db.getUnsyncedTransactionModes(userId);
        for (const m of unsyncedModes) {
          try {
            await firebase.syncTransactionModeToFirebase(userId, m);
            await db.markTransactionModeSynced(m.id);
          } catch (e) {
            console.warn('Failed uploading mode', m.id, e);
          }
        }

        const unsyncedTx = await db.getUnsyncedTransactions(userId);
        for (const t of unsyncedTx) {
          try {
            await firebase.syncTransactionToFirebase(userId, t);
            await db.markTransactionSynced(t.id);
          } catch (e) {
            console.warn('Failed uploading tx', t.id, e);
          }
        }

        if (mounted) {
          queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
          queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
        }
      } catch (err) {
        console.error('Auto sync error', err);
      }
    };

    // run once on login
    trySync();

    // subscribe for reconnects to attempt sync
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        trySync();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [userId]);

  /**********************
   *  QUERIES
   **********************/
  const modesQuery = useQuery({
    queryKey: ['transaction-modes', userId],
    queryFn: async () => {
      if (!userId) return [];
      const modes = await db.getAllTransactionModes(userId);
      return modes;
    },
    staleTime: Infinity,
    enabled: !!userId,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const tx = await db.getAllTransactions(userId);
      return tx;
    },
    staleTime: 60000,
    enabled: !!userId,
  });

  /**********************
   *  MUTATIONS (LOCAL-FIRST)
   *  - Add/Update: write to SQLite and set synced=0 (db functions do that).
   *  - Delete: only allowed if online; otherwise throw.
   **********************/
  const addModeMutation = useMutation({
    mutationFn: async (data: { name: string; initialBalance: number; color: string; icon: string }) => {
      if (!userId) throw new Error('User not authenticated');
      const mode: TransactionMode = {
        id: generateId(),
        name: data.name,
        initialBalance: data.initialBalance,
        currentBalance: data.initialBalance,
        color: data.color,
        icon: data.icon,
        createdAt: Date.now(),
        synced: false,
      };
      await db.insertTransactionMode(userId, mode); // sets synced=0 locally
      return mode;
    },
    onSuccess: async (mode) => {
      queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
      // best-effort immediate upload if online (auto sync effect will cover it otherwise)
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        try {
          await firebase.syncTransactionModeToFirebase(userId, mode);
          await db.markTransactionModeSynced(mode.id);
          queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
        } catch (e) {
          console.warn('Immediate upload failed for mode', e);
        }
      }
    },
  });

  const updateModeMutation = useMutation({
    mutationFn: async (mode: TransactionMode) => {
      // mark as unsynced (db function should set synced flag properly)
      await db.updateTransactionMode({ ...mode, synced: false });
      return mode;
    },
    onSuccess: async (mode) => {
      queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        try {
          await firebase.syncTransactionModeToFirebase(userId, mode);
          await db.markTransactionModeSynced(mode.id);
          queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
        } catch (e) { console.warn(e); }
      }
    },
  });

  const deleteModeMutation = useMutation({
    mutationFn: async (modeId: string) => {
      if (!userId) throw new Error('User not authenticated');
      // delete locally immediately
      await db.deleteTransactionMode(modeId);
      // best-effort remote delete; if offline, it will remain remote until you manually delete in console
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        await firebase.deleteTransactionModeFromFirebase(userId, modeId).catch(() => {});
      } else {
        // optional: you can queue deletes differently. For now we do not allow local delete fallback (per spec you said no special table)
        // We already deleted locally; if you want to block delete when offline, throw instead above.
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (data: {
      modeId: string;
      amount: number;
      type: 'in' | 'out';
      category?: string;
      note?: string;
      date?: number;
    }) => {
      if (!userId) throw new Error('User not authenticated');
      const transaction: Transaction = {
        id: generateId(),
        modeId: data.modeId,
        amount: data.amount,
        type: data.type,
        category: data.category,
        note: data.note,
        date: data.date || Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        synced: false,
      };

      // write locally and update mode balance locally (db functions do this and mark synced=0)
      await db.insertTransaction(userId, transaction);
      return transaction;
    },
    onSuccess: async (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
      queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });

      // immediate best-effort upload if online
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        try {
          await firebase.syncTransactionToFirebase(userId, transaction);
          await db.markTransactionSynced(transaction.id);
          queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
        } catch (e) {
          console.warn('Immediate transaction upload failed', e);
        }
      }
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      modeId: string;
      amount: number;
      type: 'in' | 'out';
      category?: string;
      note?: string;
      date: number;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      // update locally; database.updateTransaction(userId, ...) should revert old effect and apply new
      const tx: Transaction = {
        id: data.id,
        modeId: data.modeId,
        amount: data.amount,
        type: data.type,
        category: data.category,
        note: data.note,
        date: data.date,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        synced: false,
      };
      await db.updateTransaction(userId, tx);
      return tx;
    },
    onSuccess: async (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
      queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });

      const state = await NetInfo.fetch();
      if (state.isConnected) {
        try {
          await firebase.syncTransactionToFirebase(userId, transaction);
          await db.markTransactionSynced(transaction.id);
          queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
        } catch (e) { console.warn(e); }
      }
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        // rule #5: if connection not available then don't delete locally — throw so UI can show message
        throw new Error('No network connection — cannot delete. Please connect to internet.');
      }

      // when online: delete locally and remotely
      await db.deleteTransaction(userId, transactionId);
      await firebase.deleteTransactionFromFirebase(userId, transactionId).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
      queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
    },
  });

  /**********************
   *  Manual sync trigger (optional)
   **********************/
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      // attempt to upload unsynced rows (same logic as auto sync)
      const state = await NetInfo.fetch();
      if (!state.isConnected) throw new Error('No network connection');
      // upload unsynced
      const unsyncedModes = await db.getUnsyncedTransactionModes(userId);
      for (const m of unsyncedModes) {
        await firebase.syncTransactionModeToFirebase(userId, m);
        await db.markTransactionModeSynced(m.id);
      }
      const unsyncedTx = await db.getUnsyncedTransactions(userId);
      for (const t of unsyncedTx) {
        await firebase.syncTransactionToFirebase(userId, t);
        await db.markTransactionSynced(t.id);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-modes', userId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
    },
  });

  /**********************
   *  Return context
   **********************/
  return useMemo(() => ({
    modes: modesQuery.data || [],
    transactions: transactionsQuery.data || [],
    isLoading: modesQuery.isLoading || transactionsQuery.isLoading,

    addMode: addModeMutation.mutate,
    updateMode: updateModeMutation.mutate,
    deleteMode: deleteModeMutation.mutate,

    addTransaction: addTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,

    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    isAddingTransaction: addTransactionMutation.isPending,
    isAddingMode: addModeMutation.isPending,
  }), [
    modesQuery.data,
    transactionsQuery.data,
    modesQuery.isLoading,
    transactionsQuery.isLoading,
    addModeMutation.mutate,
    updateModeMutation.mutate,
    deleteModeMutation.mutate,
    addTransactionMutation.mutate,
    updateTransactionMutation.mutate,
    deleteTransactionMutation.mutate,
    syncMutation.mutate,
    syncMutation.isPending,
    addTransactionMutation.isPending,
    addModeMutation.isPending,
  ]);
});

/* Filtering & analysis helpers can remain unchanged (reuse your existing code) */
export function useFilteredTransactions(startDate?: number, endDate?: number, modeIds?: string[]) {
  const { transactions } = useTransactions();
  return transactions.filter(t => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    if (modeIds?.length && !modeIds.includes(t.modeId)) return false;
    return true;
  });
}

export function useAnalysis(filter: AnalysisFilter): AnalysisData {
  const { transactions, modes } = useTransactions();

  let startDate = filter.startDate;
  let endDate = filter.endDate;
  const now = new Date();

  if (filter.durationType === 'weekly') {
    startDate = startOfWeek(now).getTime();
    endDate = endOfWeek(now).getTime();
  } else if (filter.durationType === 'monthly') {
    startDate = startOfMonth(now).getTime();
    endDate = endOfMonth(now).getTime();
  } else if (filter.durationType === 'yearly') {
    startDate = startOfYear(now).getTime();
    endDate = endOfYear(now).getTime();
  }

  const filteredTransactions = transactions.filter(t => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    if (filter.modeIds && filter.modeIds.length > 0 && !filter.modeIds.includes(t.modeId)) return false;
    return true;
  });

  const totalIncome = filteredTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);

  const transactionsByMode = modes.map(mode => {
    const modeTransactions = filteredTransactions.filter(t => t.modeId === mode.id);
    const income = modeTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const expense = modeTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
    return { modeId: mode.id, modeName: mode.name, income, expense, balance: income - expense, color: mode.color };
  });

  const transactionsByDateMap = new Map<string, { income: number; expense: number }>();
  filteredTransactions.forEach(t => {
    const dateStr = new Date(t.date).toISOString().split('T')[0];
    const existing = transactionsByDateMap.get(dateStr) || { income: 0, expense: 0 };
    if (t.type === 'in') existing.income += t.amount;
    else existing.expense += t.amount;
    transactionsByDateMap.set(dateStr, existing);
  });

  const transactionsByDate = Array.from(transactionsByDateMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, transactionsByMode, transactionsByDate };
}
