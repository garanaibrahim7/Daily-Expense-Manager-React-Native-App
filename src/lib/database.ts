// lib/database.ts
import { Transaction, TransactionMode } from '@/types/transaction';
import * as SQLite from 'expo-sqlite';


let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('transactions.db');

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS transaction_modes (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        initial_balance REAL NOT NULL,
        current_balance REAL NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        spend_limit REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        mode_id TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        note TEXT,
        date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        is_excluded INTEGER DEFAULT 0,
        FOREIGN KEY (mode_id) REFERENCES transaction_modes (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_transaction_modes_user_id ON transaction_modes(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_mode_id ON transactions(mode_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_synced ON transactions(synced);
      CREATE INDEX IF NOT EXISTS idx_transaction_modes_synced ON transaction_modes(synced);
    `);

    // Safe migration
    try {
      const tableInfo = await db.getAllAsync<any>('PRAGMA table_info(transactions)');
      const hasColumn = tableInfo.some(col => col.name === 'is_excluded');
      if (!hasColumn) {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN is_excluded INTEGER DEFAULT 0;');
      }
    } catch (e) {
      // console.log('Migration check failed or column exists', e);
    }

    try {
      const tableInfo = await db.getAllAsync<any>('PRAGMA table_info(transaction_modes)');
      const hasColumn = tableInfo.some(col => col.name === 'spend_limit');
      if (!hasColumn) {
        await db.execAsync('ALTER TABLE transaction_modes ADD COLUMN spend_limit REAL DEFAULT 0;');
      }
    } catch (e) {

    }

    // console.log('Database initialized successfully');
    dbInstance = db;
    return db;
  })();

  return dbInitPromise;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  return await initDatabase();
}

/* ----------------------
   Transaction mode helpers
   ---------------------- */

export async function getAllTransactionModes(userId: string): Promise<TransactionMode[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<any>(
    'SELECT * FROM transaction_modes WHERE user_id = ? ORDER BY created_at ASC',
    [userId]
  );

  return result.map((row: any) => ({
    id: row.id,
    name: row.name,
    initialBalance: row.initial_balance,
    currentBalance: row.current_balance,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    synced: row.synced === 1,
    spendLimit: row.spend_limit || 0,
  }));
}

export async function insertTransactionMode(userId: string, mode: TransactionMode): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO transaction_modes (id, user_id, name, initial_balance, current_balance, color, icon, created_at, synced, spend_limit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [mode.id, userId, mode.name, mode.initialBalance, mode.currentBalance, mode.color, mode.icon, mode.createdAt, 0, mode.spendLimit || 0]
  );

  // console.log('Transaction mode inserted:', mode.id);
}

export async function updateTransactionMode(mode: TransactionMode): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE transaction_modes
    SET name = ?, initial_balance = ?, current_balance = ?, color = ?, icon = ?, synced = ?, spend_limit = ?
     WHERE id = ?`,
    [mode.name, mode.initialBalance, mode.currentBalance, mode.color, mode.icon, mode.synced ? 1 : 0, mode.spendLimit || 0, mode.id]
  );
  // console.log('Transaction mode updated:', mode.id);
}

export async function deleteTransactionMode(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM transaction_modes WHERE id = ?', [id]);
  // console.log('Transaction mode deleted:', id);
}

/* Upsert used when pulling from Firebase (remote -> local) */
export async function upsertTransactionMode(userId: string, mode: TransactionMode): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO transaction_modes (id, user_id, name, initial_balance, current_balance, color, icon, created_at, synced, spend_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    initial_balance = excluded.initial_balance,
    current_balance = excluded.current_balance,
    color = excluded.color,
    icon = excluded.icon,
    synced = excluded.synced,
    spend_limit = excluded.spend_limit;`,
    [
      mode.id,
      userId,
      mode.name,
      mode.initialBalance ?? 0,
      mode.currentBalance ?? 0,
      mode.color ?? '#000000',
      mode.icon ?? '',
      mode.createdAt ?? Date.now(),
      mode.synced ? 1 : 1, // when pulling from remote, set synced = 1
      mode.spendLimit || 0,
    ]
  );
  // console.log('Upserted mode from remote:', mode.id);
}

/* ----------------------
Transaction helpers
---------------------- */

export async function getAllTransactions(userId: string): Promise<Transaction[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<any>(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC',
    [userId]
  );

  return result.map((row: any) => ({
    id: row.id,
    modeId: row.mode_id,
    amount: Number(row.amount),
    type: row.type as 'in' | 'out',
    category: row.category || undefined,
    note: row.note || undefined,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: row.synced === 1,
    isExcluded: row.is_excluded === 1,
  }));
}

/* Insert transaction locally and update mode balance locally.
Mark transaction as unsynced (synced = 0) so batch sync will upload it. */
export async function insertTransaction(userId: string, transaction: Transaction): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO transactions (id, user_id, mode_id, amount, type, category, note, date, created_at, updated_at, synced, is_excluded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id,
      userId,
      transaction.modeId,
      transaction.amount,
      transaction.type,
      transaction.category || null,
      transaction.note || null,
      transaction.date,
      transaction.createdAt,
      transaction.updatedAt,
      0, // unsynced
      transaction.isExcluded ? 1 : 0,
    ]
  );

  // Update mode balance locally only
  await updateTransactionModeBalance(userId, transaction.modeId, transaction.amount, transaction.type);
  // console.log('Transaction inserted (local):', transaction.id);
}

/* Update transaction locally. We must revert old transaction effect then apply new one to keep balance correct.
   Mark updated transaction unsynced so it will be uploaded. */
/* ✅ Update transaction locally (with correct userId handling) */
export async function updateTransaction(userId: string, transaction: Transaction): Promise<void> {
  const database = await getDatabase();

  // Fetch old transaction (to revert balance)
  const oldRows = await database.getAllAsync<any>(
    'SELECT id, amount, mode_id, type FROM transactions WHERE id = ?',
    [transaction.id]
  );
  const old = oldRows[0];
  if (old) {
    const opposite: 'in' | 'out' = old.type === 'in' ? 'out' : 'in';
    // revert old effect
    await updateTransactionModeBalance(userId, old.mode_id, old.amount, opposite);
  }

  // update transaction row
  await database.runAsync(
    `UPDATE transactions
     SET mode_id = ?, amount = ?, type = ?, category = ?, note = ?, date = ?, updated_at = ?, synced = ?, is_excluded = ?
     WHERE id = ?`,
    [
      transaction.modeId,
      transaction.amount,
      transaction.type,
      transaction.category || null,
      transaction.note || null,
      transaction.date,
      transaction.updatedAt,
      0,
      transaction.isExcluded ? 1 : 0,
      transaction.id,
    ]
  );

  // apply new effect
  await updateTransactionModeBalance(userId, transaction.modeId, transaction.amount, transaction.type);

  // console.log('Transaction updated (local):', transaction.id);
}

/* ✅ Delete transaction (with correct userId handling) */
export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT amount, mode_id, type FROM transactions WHERE id = ?',
    [id]
  );
  const tx = rows[0];
  if (tx) {
    const opposite: 'in' | 'out' = tx.type === 'in' ? 'out' : 'in';
    await updateTransactionModeBalance(userId, tx.mode_id, tx.amount, opposite);
  }
  await database.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  // console.log('Transaction deleted (local):', id);
}

/* Upsert transaction when pulling from remote (remote -> local)
   Set synced = 1 because it's pulled from remote; this prevents re-upload immediately. */
export async function upsertTransaction(userId: string, transaction: Transaction): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO transactions (id, user_id, mode_id, amount, type, category, note, date, created_at, updated_at, synced, is_excluded)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       mode_id = excluded.mode_id,
       amount = excluded.amount,
       type = excluded.type,
       category = excluded.category,
       note = excluded.note,
       date = excluded.date,
       updated_at = excluded.updated_at,
       synced = excluded.synced,
       is_excluded = excluded.is_excluded;`,
    [
      transaction.id,
      userId,
      transaction.modeId,
      transaction.amount,
      transaction.type,
      transaction.category || null,
      transaction.note || null,
      transaction.date,
      transaction.createdAt ?? Date.now(),
      transaction.updatedAt ?? Date.now(),
      1, // pulled remote -> treat as synced
      transaction.isExcluded ? 1 : 0,
    ]
  );
  // console.log('Upserted transaction from remote:', transaction.id);
}

/* ----------------------
   Balance helper (local only)
   ---------------------- */

export async function updateTransactionModeBalance(userId: string, modeId: string, amount: number, type: 'in' | 'out'): Promise<void> {
  const database = await getDatabase();
  // fetch current
  const rows = await database.getAllAsync<any>('SELECT current_balance FROM transaction_modes WHERE id = ? AND user_id = ?', [modeId, userId]);
  const row = rows[0];
  const current = row ? Number(row.current_balance) : 0;
  const delta = type === 'in' ? amount : -amount;
  const newBalance = current + delta;

  await database.runAsync(
    `UPDATE transaction_modes SET current_balance = ?, synced = 0 WHERE id = ? AND user_id = ?`,
    [newBalance, modeId, userId]
  );
  // console.log(`Mode balance updated locally: ${modeId} -> ${newBalance}`);
}

/* ----------------------
   Unsynced helpers & mark-as-synced
   ---------------------- */

export async function getUnsyncedTransactionModes(userId: string): Promise<TransactionMode[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<any>('SELECT * FROM transaction_modes WHERE user_id = ? AND synced = 0', [userId]);
  return result.map((row: any) => ({
    id: row.id,
    name: row.name,
    initialBalance: row.initial_balance,
    currentBalance: row.current_balance,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    synced: row.synced === 1,
    spendLimit: row.spend_limit || 0,
  }));
}

export async function getUnsyncedTransactions(userId: string): Promise<Transaction[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<any>('SELECT * FROM transactions WHERE user_id = ? AND synced = 0', [userId]);
  return result.map((row: any) => ({
    id: row.id,
    modeId: row.mode_id,
    amount: Number(row.amount),
    type: row.type as 'in' | 'out',
    category: row.category || undefined,
    note: row.note || undefined,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: row.synced === 1,
    isExcluded: row.is_excluded === 1,
  }));
}

export async function markTransactionModeSynced(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE transaction_modes SET synced = 1 WHERE id = ?', [id]);
}

export async function markTransactionSynced(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE transactions SET synced = 1 WHERE id = ?', [id]);
}

/* Local "get all" wrappers (used by sync routine) */
export async function getAllLocalTransactionModes(userId: string): Promise<TransactionMode[]> {
  return getAllTransactionModes(userId);
}
export async function getAllLocalTransactions(userId: string): Promise<Transaction[]> {
  return getAllTransactions(userId);
}

export async function getModeMonthlySpending(userId: string, modeId: string, startDate: number, endDate: number): Promise<number> {
  const database = await getDatabase();
  const result = await database.getAllAsync<any>(
    'SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND mode_id = ? AND type = "out" AND (is_excluded IS NULL OR is_excluded = 0) AND date >= ? AND date <= ?',
    [userId, modeId, startDate, endDate]
  );
  return result[0]?.total || 0;
}
