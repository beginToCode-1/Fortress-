export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  date: string;
  currency: string;
  recurring?: boolean;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
}

export interface BillReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  frequency: "monthly" | "weekly" | "yearly";
  completed: boolean;
}

export interface CurrencyRate {
  code: string;
  symbol: string;
  rateToUSD: number; // base rate is USD
}

export interface UserProfile {
  name: string;
  email: string;
  baseCurrency: string;
  pinCode: string;
  biometricsEnabled: boolean;
  theme: "dark";
  isLocked: boolean;
}

export interface SavingsGoal {
  id: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

