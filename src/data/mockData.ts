import { Transaction, Budget, BillReminder, CurrencyRate } from "../types";

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "t1", description: "Organic Foods Co.", amount: 84.50, category: "Food", type: "expense", date: "2026-06-25", currency: "USD" },
  { id: "t2", description: "Monthly Rent Apartment 4B", amount: 1500.00, category: "Housing", type: "expense", date: "2026-06-01", currency: "USD" },
  { id: "t3", description: "TechCorp Salary", amount: 4200.00, category: "Income", type: "income", date: "2026-06-25", currency: "USD" },
  { id: "t4", description: "City Power & Gas", amount: 112.40, category: "Utilities", type: "expense", date: "2026-06-15", currency: "USD" },
  { id: "t5", description: "Subway Transit Pass", amount: 45.00, category: "Transport", type: "expense", date: "2026-06-26", currency: "USD" },
  { id: "t6", description: "Cloud Entertainment Stream", amount: 14.99, category: "Entertainment", type: "expense", date: "2026-06-24", currency: "USD", recurring: true },
  { id: "t7", description: "Premium Fitness Center", amount: 65.00, category: "Health", type: "expense", date: "2026-06-20", currency: "USD", recurring: true },
  { id: "t8", description: "Premium Espresso Bar", amount: 6.80, category: "Food", type: "expense", date: "2026-06-27", currency: "USD" },
  { id: "t9", description: "Weekly Groceries", amount: 112.30, category: "Food", type: "expense", date: "2026-06-18", currency: "USD" },
  { id: "t10", description: "Freelance Design Client", amount: 850.00, category: "Income", type: "income", date: "2026-06-22", currency: "USD" },
  { id: "t11", description: "Winter Jacket Boutique", amount: 189.99, category: "Shopping", type: "expense", date: "2026-06-10", currency: "USD" },
];

export const INITIAL_BUDGETS: Budget[] = [
  { category: "Food", limit: 400, spent: 203.60 },
  { category: "Housing", limit: 1600, spent: 1500.00 },
  { category: "Utilities", limit: 250, spent: 112.40 },
  { category: "Transport", limit: 150, spent: 45.00 },
  { category: "Entertainment", limit: 150, spent: 14.99 },
  { category: "Health", limit: 100, spent: 65.00 },
  { category: "Shopping", limit: 300, spent: 189.99 },
];

export const INITIAL_REMINDERS: BillReminder[] = [
  { id: "r1", title: "Monthly Rent Payment", amount: 1500.00, dueDate: "2026-07-01", category: "Housing", frequency: "monthly", completed: false },
  { id: "r2", title: "City Power & Gas Bill", amount: 125.00, dueDate: "2026-07-15", category: "Utilities", frequency: "monthly", completed: false },
  { id: "r3", title: "Premium Gym Subscription", amount: 65.00, dueDate: "2026-07-20", category: "Health", frequency: "monthly", completed: false },
  { id: "r4", title: "Cloud Storage Backup", amount: 9.99, dueDate: "2026-07-05", category: "Utilities", frequency: "monthly", completed: false },
];

export const SUPPORTED_CURRENCIES: CurrencyRate[] = [
  { code: "USD", symbol: "$", rateToUSD: 1.0 },
  { code: "EUR", symbol: "€", rateToUSD: 1.08 },
  { code: "GBP", symbol: "£", rateToUSD: 1.27 },
  { code: "JPY", symbol: "¥", rateToUSD: 0.0063 },
  { code: "CAD", symbol: "C$", rateToUSD: 0.73 },
  { code: "AUD", symbol: "A$", rateToUSD: 0.66 },
  { code: "INR", symbol: "₹", rateToUSD: 0.012 },
  { code: "PKR", symbol: "₨", rateToUSD: 0.0036 },
];

export const BUDGET_CATEGORIES = [
  "Food",
  "Housing",
  "Utilities",
  "Transport",
  "Entertainment",
  "Health",
  "Shopping",
  "Income"
];
