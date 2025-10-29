export type TransactionType = 'in' | 'out';

export interface TransactionMode {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  color: string;
  icon: string;
  createdAt: number;
  synced: boolean;
}

// export interface Transaction {
//   [x: string]: string;
//   id: string;
//   modeId: string;
//   amount: number;
//   type: TransactionType;
//   category?: string;
//   note?: string;
//   date: number;
//   createdAt: number;
//   updatedAt: number;
//   synced: boolean;
// }

export interface Transaction {
  id: string;
  modeId: string;
  amount: number; // ✅ change from string → number
  type: 'in' | 'out';
  category?: string;
  note?: string;
  date: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}


export interface AnalysisFilter {
  durationType: 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate?: number;
  endDate?: number;
  modeIds?: string[];
}

export interface AnalysisData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionsByMode: {
    modeId: string;
    modeName: string;
    income: number;
    expense: number;
    balance: number;
    color: string;
  }[];
  transactionsByDate: {
    date: string;
    income: number;
    expense: number;
  }[];
}
