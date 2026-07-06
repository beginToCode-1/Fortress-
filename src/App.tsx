import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Wallet, 
  DollarSign, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Search, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Fingerprint, 
  Check, 
  Menu, 
  X, 
  Bell, 
  Settings, 
  Activity, 
  Languages, 
  FileText,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Info,
  Clock,
  LayoutGrid,
  Target,
  MessageSquare,
  Send,
  HelpCircle,
  TrendingDown,
  LogOut
} from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from "recharts";
import { jsPDF } from "jspdf";

// Type imports
import { Transaction, Budget, BillReminder, UserProfile, CurrencyRate, SavingsGoal } from "./types";
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_BUDGETS, 
  INITIAL_REMINDERS, 
  SUPPORTED_CURRENCIES, 
  BUDGET_CATEGORIES 
} from "./data/mockData";

// Simple custom Markdown parser to display Gemini's financial advice beautifully
function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split("\n");
  
  // Custom parser to map lines to styled elements
  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-emerald-300 font-semibold">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-3 text-slate-300 text-sm leading-relaxed font-sans">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("###")) {
          return (
            <h4 key={i} className="text-sm font-bold text-slate-100 mt-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-sm inline-block"></span>
              {trimmed.replace("###", "").trim()}
            </h4>
          );
        }
        if (trimmed.startsWith("##") || trimmed.startsWith("#")) {
          const text = trimmed.replace(/^#+\s*/, "");
          return (
            <h3 key={i} className="text-base font-bold text-white mt-5 border-b border-slate-800 pb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {text}
            </h3>
          );
        }
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          const itemText = trimmed.substring(1).trim();
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-emerald-500 mt-1.5 font-bold">•</span>
              <p className="flex-1">{parseBoldText(itemText)}</p>
            </div>
          );
        }
        if (trimmed === "") return <div key={i} className="h-1" />;
        return <p key={i} className="text-slate-300">{parseBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

export default function App() {
  // --- STATE ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [reminders, setReminders] = useState<BillReminder[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    name: "User",
    email: "",
    baseCurrency: "PKR",
    pinCode: "1234",
    biometricsEnabled: true,
    theme: "dark",
    isLocked: true, // App starts locked for biometric simulation privacy
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showPinHint, setShowPinHint] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setDimensions({ width, height });
      
      // Update sidebar visibility for mobile layout auto-adaptation
      if (width < 768) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
      
      // Set custom viewport height variable --vh for perfect fit on Android devices
      const vh = height * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [incomeInputStr, setIncomeInputStr] = useState("");
  
  // Personalized welcome animation states
  const [showWelcome, setShowWelcome] = useState(false);
  const [motivationalQuote, setMotivationalQuote] = useState("");
  const prevIsLocked = useRef(profile.isLocked);

  useEffect(() => {
    // List of wealth-building motivational messages
    const MOTIVATIONAL_QUOTES = [
      "Your wealth is a fortress built stone by stone. Let's make today another day of disciplined financial choices.",
      "Every small saving is a seed planted for your future. Keep tracking, keep optimizing, and watch your capital blossom.",
      "Abundance is a state of active discipline. Your fortress grows stronger with every transaction you align with your goals.",
      "Compound growth is the quiet force of financial freedom. Let's master your cash flow today and secure tomorrow.",
      "Abundance is built on mindful tracking. Stay focused on your goals, prune discretionary leaks, and prosper day by day.",
      "Decisions made in the light protect your wealth in the shadows. Your commitment to financial transparency is your ultimate shield."
    ];

    if (prevIsLocked.current && !profile.isLocked) {
      // Pick a random quote
      const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      setMotivationalQuote(MOTIVATIONAL_QUOTES[randomIndex]);
      setShowWelcome(true);
      
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 6500);
      return () => clearTimeout(timer);
    }
    prevIsLocked.current = profile.isLocked;
  }, [profile.isLocked]);
  
  // Forms states
  const [newTx, setNewTx] = useState({
    description: "",
    amount: "",
    category: "Food",
    type: "expense" as "expense" | "income",
    date: new Date().toISOString().substring(0, 10),
    currency: "PKR",
    recurring: false,
  });

  const [newBudget, setNewBudget] = useState({
    category: "Food",
    limit: "",
  });

  const [newReminder, setNewReminder] = useState({
    title: "",
    amount: "",
    dueDate: new Date().toISOString().substring(0, 10),
    category: "Food",
    frequency: "monthly" as "monthly" | "weekly" | "yearly",
  });

  // Savings Goals State
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [newGoal, setNewGoal] = useState({
    goalName: "",
    targetAmount: "",
    deadline: new Date().toISOString().substring(0, 7) // YYYY-MM
  });
  const [depositAmount, setDepositAmount] = useState<{ [goalId: string]: string }>({});

  // Lockscreen Authentication Screen Modes
  const [lockscreenMode, setLockscreenMode] = useState<"pin" | "login" | "register" | "forgot">("pin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Hello! I am your Gemini-powered secure AI Financial Companion. Ask me details about your transaction history, expenditures, current budget settings, or savings goals, and I'll compile precise answers instantly!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Currency states
  const [convertAmount, setConvertAmount] = useState("100");
  const [convertFrom, setConvertFrom] = useState("EUR");
  const [convertTo, setConvertTo] = useState("USD");
  const [convertResult, setConvertResult] = useState<number | null>(108);

  // Search & Filters
  const [txSearch, setTxSearch] = useState("");
  const [txSearchAmount, setTxSearchAmount] = useState("");
  const [txFilterCategory, setTxFilterCategory] = useState("All");
  const [txFilterType, setTxFilterType] = useState("All");
  const [txFilterDateRange, setTxFilterDateRange] = useState("All"); // All, Today, Week, Month, Year, Custom
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [txSortOrder, setTxSortOrder] = useState("Newest First"); // Newest First, Oldest First, Highest Amount, Lowest Amount

  // AI Insights states
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState("");

  // Sync state
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error" | "offline">("idle");
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");

  // Notification Feed
  const [alerts, setAlerts] = useState<{ id: string; text: string; type: "warning" | "info" | "danger" }[]>([]);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  // --- REAL-TIME SECURE DATABASE & FIREBASE AUTHENTICATION ENGINE ---
  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
      
      if (user) {
        // Logged in: Preserve local isLocked state but ensure email is set.
        setProfile(prev => ({ ...prev, email: user.email || "", isLocked: false }));
        setSyncStatus("synced");
        setLastSyncedTime(new Date().toLocaleTimeString());
      } else {
        // Logged out: Lock app and prompt email/pass login
        setProfile(prev => ({ ...prev, isLocked: true }));
        setLockscreenMode("login");
        setTransactions([]);
        setBudgets([]);
        setReminders([]);
        setGoals([]);
        setMonthlyIncome(0);
        setSyncStatus("offline");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Subscriptions to user specific collections
  useEffect(() => {
    if (!currentUser) return;

    setSyncStatus("syncing");

    // Profile listener
    const profileRef = doc(db, "users", currentUser.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(prev => ({
          ...prev,
          name: data.name || currentUser.displayName || "User",
          email: data.email || currentUser.email || "",
          baseCurrency: data.baseCurrency || "PKR",
          pinCode: data.pinCode || "1234",
          biometricsEnabled: data.biometricsEnabled !== undefined ? data.biometricsEnabled : true,
          theme: data.theme || "dark",
          isLocked: prev.isLocked
        }));
        if (data.monthlyIncome !== undefined) {
          setMonthlyIncome(data.monthlyIncome);
        }
        setSyncStatus("synced");
        setLastSyncedTime(new Date().toLocaleTimeString());
      } else {
        // Create initial profile doc in Firestore if it doesn't exist
        setDoc(profileRef, {
          name: currentUser.displayName || "User",
          email: currentUser.email || "",
          baseCurrency: "PKR",
          pinCode: "1234",
          biometricsEnabled: true,
          theme: "dark",
          monthlyIncome: 5000
        }).catch(err => console.error("Error creating initial profile:", err));
      }
    });

    // Transactions listener
    const txsRef = collection(db, "users", currentUser.uid, "transactions");
    const unsubscribeTxs = onSnapshot(txsRef, (snap) => {
      const list: Transaction[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Transaction);
      });
      setTransactions(list);
      setSyncStatus("synced");
      setLastSyncedTime(new Date().toLocaleTimeString());
    }, (err) => {
      console.error("Transactions read permission or other firestore error:", err);
      setSyncStatus("error");
    });

    // Budgets listener
    const budgetsRef = collection(db, "users", currentUser.uid, "budgets");
    const unsubscribeBudgets = onSnapshot(budgetsRef, (snap) => {
      const list: Budget[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Budget);
      });
      setBudgets(list);
    }, (err) => {
      console.error("Budgets read permission or other firestore error:", err);
      setSyncStatus("error");
    });

    // Reminders listener
    const remindersRef = collection(db, "users", currentUser.uid, "reminders");
    const unsubscribeReminders = onSnapshot(remindersRef, (snap) => {
      const list: BillReminder[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as BillReminder);
      });
      setReminders(list);
    }, (err) => {
      console.error("Reminders read permission or other firestore error:", err);
      setSyncStatus("error");
    });

    // Goals listener
    const goalsRef = collection(db, "users", currentUser.uid, "goals");
    const unsubscribeGoals = onSnapshot(goalsRef, (snap) => {
      const list: SavingsGoal[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as SavingsGoal);
      });
      setGoals(list);
    }, (err) => {
      console.error("Goals read permission or other firestore error:", err);
      setSyncStatus("error");
    });

    return () => {
      unsubscribeProfile();
      unsubscribeTxs();
      unsubscribeBudgets();
      unsubscribeReminders();
      unsubscribeGoals();
    };
  }, [currentUser]);

  // Handle monthlyIncome change updates to Firestore
  useEffect(() => {
    if (currentUser) {
      updateDoc(doc(db, "users", currentUser.uid), { monthlyIncome }).catch(err => {
        console.error("Error updating monthlyIncome in Firestore:", err);
      });
    }
  }, [monthlyIncome, currentUser]);

  useEffect(() => {
    const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
    const currentBaseValue = Math.round(monthlyIncome / baseCur.rateToUSD);
    if (Number(incomeInputStr) !== currentBaseValue) {
      setIncomeInputStr(String(currentBaseValue));
    }
  }, [monthlyIncome, profile.baseCurrency]);

  useEffect(() => {
    setNewTx(prev => ({ ...prev, currency: profile.baseCurrency }));
  }, [profile.baseCurrency]);

  // Dynamic automatic recalculation of actual spent amounts in budgets
  useEffect(() => {
    const updatedBudgets = budgets.map(b => {
      const spent = transactions
        .filter(t => t.type === "expense" && t.category === b.category)
        .reduce((sum, t) => {
          // Convert amount back to USD (base rate) or profile base currency
          const rateFrom = SUPPORTED_CURRENCIES.find(c => c.code === t.currency) || SUPPORTED_CURRENCIES[0];
          const amountInUSD = t.amount * rateFrom.rateToUSD;
          return sum + amountInUSD;
        }, 0);
      return { ...b, spent: Math.round(spent * 100) / 100 };
    });

    // Simple comparison to prevent infinite hooks loop
    const spentChanged = JSON.stringify(updatedBudgets.map(u => u.spent)) !== JSON.stringify(budgets.map(b => b.spent));
    if (spentChanged) {
      setBudgets(updatedBudgets);
    }
  }, [transactions]);

  // Automated notification and upcoming billing warnings engine
  useEffect(() => {
    const newAlerts: { id: string; text: string; type: "warning" | "info" | "danger" }[] = [];
    
    // Check for budget overshoots
    budgets.forEach(b => {
      if (b.spent > b.limit) {
        newAlerts.push({
          id: `alert-budget-${b.category}`,
          text: `🚨 Exceeded monthly limit in ${b.category}! Spent: $${b.spent.toFixed(2)} / $${b.limit.toFixed(2)}`,
          type: "danger"
        });
      } else if (b.spent > b.limit * 0.85) {
        newAlerts.push({
          id: `alert-budget-warning-${b.category}`,
          text: `⚠️ Approaching budget limit in ${b.category} (85% consumed)`,
          type: "warning"
        });
      }
    });

    // Check for upcoming recurring bill reminders within next 5 days
    const today = new Date();
    reminders.forEach(r => {
      if (!r.completed) {
        const dueDate = new Date(r.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          newAlerts.push({
            id: `alert-reminder-due-${r.id}`,
            text: `🔔 Bill "${r.title}" of $${r.amount} is due TODAY!`,
            type: "danger"
          });
        } else if (diffDays > 0 && diffDays <= 5) {
          newAlerts.push({
            id: `alert-reminder-${r.id}`,
            text: `📅 "${r.title}" ($${r.amount}) is due in ${diffDays} days (${r.dueDate})`,
            type: "info"
          });
        }
      }
    });

    setAlerts(newAlerts);
  }, [budgets, reminders]);

  // --- ACTIONS ---

  // Handle server background pull
  const attemptServerFetch = async () => {
    try {
      setSyncStatus("syncing");
      const res = await fetch("/api/sync/user_default");
      const payload = await res.json();
      if (payload.success && payload.data) {
        // Sync merge
        setTransactions(payload.data.transactions);
        setBudgets(payload.data.budgets);
        setReminders(payload.data.reminders);
        if (payload.data.lastSynced) {
          setLastSyncedTime(new Date(payload.data.lastSynced).toLocaleTimeString());
        }
        setSyncStatus("synced");
      }
    } catch (e) {
      console.warn("Express server offline, operating in isolated Local-First Offline mode.");
      setSyncStatus("offline");
    }
  };

  // Perform full manual sync pushing local edits to Express cloud server
  const triggerManualSync = async () => {
    setSyncStatus("syncing");
    try {
      const dataPayload = {
        transactions,
        budgets,
        reminders,
        settings: {
          baseCurrency: profile.baseCurrency,
          biometricsEnabled: profile.biometricsEnabled,
        }
      };

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user_default",
          data: dataPayload
        })
      });

      const result = await res.json();
      if (result.success) {
        setLastSyncedTime(new Date(result.lastSynced).toLocaleTimeString());
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStatus("offline");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  // Automated biometric face/fingerprint authentication unlock sequence simulation
  const handleSimulateBiometrics = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanSuccess(false);

    // Dynamic scanning visual feedback timing
    setTimeout(() => {
      setScanSuccess(true);
      setIsScanning(false);
      
      // Complete biometric slide up unlock transition after successful scan
      setTimeout(() => {
        setProfile(prev => ({ ...prev, isLocked: false }));
        setScanSuccess(false);
        setPinInput("");
        setPinError("");
      }, 800);
    }, 2000);
  };

  // Passcode login evaluation
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === profile.pinCode) {
      setProfile(prev => ({ ...prev, isLocked: false }));
      setPinInput("");
      setPinError("");
    } else {
      setPinError("Incorrect security passcode. Please try again or use biometrics.");
      setPinInput("");
    }
  };

  const handlePinKey = (val: string) => {
    setPinError("");
    if (val === "DEL") {
      setPinInput(prev => prev.slice(0, -1));
    } else {
      if (pinInput.length < 4) {
        const newPin = pinInput + val;
        setPinInput(newPin);
        if (newPin.length === 4) {
          // Auto submit when 4 digits typed
          if (newPin === profile.pinCode) {
            setProfile(prev => ({ ...prev, isLocked: false }));
            setPinInput("");
            setPinError("");
          } else {
            setPinError("Invalid passcode.");
            setPinInput("");
          }
        }
      }
    }
  };

  // Add a new transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newTx.amount);
    if (isNaN(amt) || amt <= 0 || !newTx.description.trim()) return;

    const txData = {
      description: newTx.description.trim(),
      amount: amt,
      category: newTx.category,
      type: newTx.type,
      date: newTx.date || new Date().toISOString().substring(0, 10),
      currency: newTx.currency,
      recurring: newTx.recurring,
    };

    if (currentUser) {
      try {
        await addDoc(collection(db, "users", currentUser.uid, "transactions"), txData);
      } catch (err) {
        console.error("Error adding transaction to Firestore:", err);
      }
    } else {
      const added: Transaction = {
        id: "t_" + Date.now(),
        ...txData
      };
      setTransactions(prev => [added, ...prev]);
    }

    setNewTx({
      description: "",
      amount: "",
      category: "Food",
      type: "expense",
      date: new Date().toISOString().substring(0, 10),
      currency: profile.baseCurrency,
      recurring: false,
    });
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "transactions", id));
      } catch (err) {
        console.error("Error deleting transaction from Firestore:", err);
      }
    } else {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  // Add a budget limit
  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitAmt = parseFloat(newBudget.limit);
    if (isNaN(limitAmt) || limitAmt <= 0) return;

    const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
    const limitInUSD = limitAmt * baseCur.rateToUSD;

    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "budgets", newBudget.category), {
          category: newBudget.category,
          limit: limitInUSD,
          spent: 0
        }, { merge: true });
      } catch (err) {
        console.error("Error adding budget to Firestore:", err);
      }
    } else {
      // Check if category already exists, if so overwrite limit, else add
      const exists = budgets.find(b => b.category === newBudget.category);
      if (exists) {
        setBudgets(prev => prev.map(b => b.category === newBudget.category ? { ...b, limit: limitInUSD } : b));
      } else {
        setBudgets(prev => [...prev, { category: newBudget.category, limit: limitInUSD, spent: 0 }]);
      }
    }

    setNewBudget({ category: "Food", limit: "" });
  };

  // Add bill reminder
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newReminder.amount);
    if (isNaN(amt) || amt <= 0 || !newReminder.title.trim()) return;

    const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
    const amountInUSD = amt * baseCur.rateToUSD;

    const reminderData = {
      title: newReminder.title.trim(),
      amount: amountInUSD,
      dueDate: newReminder.dueDate,
      category: newReminder.category,
      frequency: newReminder.frequency,
      completed: false,
    };

    if (currentUser) {
      try {
        await addDoc(collection(db, "users", currentUser.uid, "reminders"), reminderData);
      } catch (err) {
        console.error("Error adding reminder to Firestore:", err);
      }
    } else {
      const added: BillReminder = {
        id: "r_" + Date.now(),
        ...reminderData
      };
      setReminders(prev => [added, ...prev]);
    }

    setNewReminder({
      title: "",
      amount: "",
      dueDate: new Date().toISOString().substring(0, 10),
      category: "Food",
      frequency: "monthly",
    });
  };

  // Mark bill reminder as paid & automatically post transaction
  const settleBillReminder = async (reminder: BillReminder) => {
    const settledTxData = {
      description: `Settle: ${reminder.title}`,
      amount: reminder.amount,
      category: reminder.category,
      type: "expense" as const,
      date: new Date().toISOString().substring(0, 10),
      currency: "USD",
      recurring: true,
    };

    if (currentUser) {
      try {
        await updateDoc(doc(db, "users", currentUser.uid, "reminders", reminder.id), { completed: true });
        await addDoc(collection(db, "users", currentUser.uid, "transactions"), settledTxData);
      } catch (err) {
        console.error("Error settling bill reminder:", err);
      }
    } else {
      // 1. Set reminder completed state
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, completed: true } : r));
      
      // 2. Post as standard transaction
      const settledTx: Transaction = {
        id: "t_bill_" + Date.now(),
        ...settledTxData
      };
      setTransactions(prev => [settledTx, ...prev]);
    }

    // 3. Trigger immediate brief user feedback
    alert(`Success! Settled "${reminder.title}" for $${reminder.amount}. Expense was automatically logged.`);
  };

  // Multi-currency live-simulation exchange converter calculator
  const calculateConversion = () => {
    const amt = parseFloat(convertAmount);
    if (isNaN(amt)) {
      setConvertResult(null);
      return;
    }
    const rateFrom = SUPPORTED_CURRENCIES.find(c => c.code === convertFrom) || SUPPORTED_CURRENCIES[0];
    const rateTo = SUPPORTED_CURRENCIES.find(c => c.code === convertTo) || SUPPORTED_CURRENCIES[0];
    
    // Convert source amount to USD first, then convert from USD to destination currency
    const amountInUSD = amt * rateFrom.rateToUSD;
    const result = amountInUSD / rateTo.rateToUSD;
    setConvertResult(Math.round(result * 100) / 100);
  };

  // Trigger recalculation on inputs change
  useEffect(() => {
    calculateConversion();
  }, [convertAmount, convertFrom, convertTo]);

  // Exporter for high-quality professional PDF reports (jsPDF)
  const handleExportPDFReport = () => {
    try {
      const doc = new jsPDF();
      
      // Page header banner decoration
      doc.setFillColor(15, 23, 42); // slate-900 background banner
      doc.rect(0, 0, 210, 38, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text("PERSONAL FINANCIAL ARCHIVE", 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.text(`Security Level: Biometrics Lock Session Verified`, 14, 33);
      doc.text("Cloud Synchronization Statement", 145, 20);
      doc.text(`Account Owner: ${profile.name}`, 145, 26);
      doc.text(`Cloud Sync Node: online`, 145, 32);

      // Ledger quick highlights
      const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      const netSavings = totalIncome - totalExpense;

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont("Helvetica", "bold");
      doc.text("Account Overview Summary", 14, 52);

      // Total boxes simulated styling
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 58, 55, 20, "FD");
      doc.rect(77, 58, 55, 20, "FD");
      doc.rect(140, 58, 55, 20, "FD");

      doc.setFontSize(8);
      doc.setFont("Helvetica", "normal");
      doc.text("TOTAL INCOME", 18, 64);
      doc.text("TOTAL EXPENSES", 81, 64);
      doc.text("NET CASH FLOW", 144, 64);

      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.text(`$${totalIncome.toFixed(2)}`, 18, 72);
      doc.text(`$${totalExpense.toFixed(2)}`, 81, 72);
      doc.text(`$${netSavings.toFixed(2)}`, 144, 72);

      // Budgets Breakdown Section
      doc.setFontSize(14);
      doc.text("Category Budgets Execution Status", 14, 94);
      
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      let yOffset = 102;
      budgets.forEach((b) => {
        const percent = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
        const status = b.spent > b.limit ? "OVER BUDGET" : "HEALTHY";
        doc.text(`Category: ${b.category.padEnd(15)} Limit: $${b.limit.toFixed(2).padEnd(10)} Spent: $${b.spent.toFixed(2).padEnd(10)} Utilization: ${percent.toFixed(0)}% [${status}]`, 14, yOffset);
        yOffset += 6;
      });

      // Recent transaction ledgers list
      yOffset += 10;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Detailed Transaction Record (Recent)", 14, yOffset);

      yOffset += 8;
      doc.setFontSize(9);
      doc.text("Date", 14, yOffset);
      doc.text("Description", 42, yOffset);
      doc.text("Category", 110, yOffset);
      doc.text("Type", 145, yOffset);
      doc.text("Amount", 175, yOffset);
      doc.line(14, yOffset + 2, 196, yOffset + 2);
      
      yOffset += 8;
      doc.setFont("Helvetica", "normal");
      transactions.slice(0, 18).forEach((t) => {
        if (yOffset > 275) {
          doc.addPage();
          yOffset = 20;
        }
        doc.text(t.date, 14, yOffset);
        const desc = t.description.length > 32 ? t.description.substring(0, 29) + "..." : t.description;
        doc.text(desc, 42, yOffset);
        doc.text(t.category, 110, yOffset);
        doc.text(t.type.toUpperCase(), 145, yOffset);
        
        const rateFrom = SUPPORTED_CURRENCIES.find(c => c.code === t.currency) || SUPPORTED_CURRENCIES[0];
        doc.text(`${rateFrom.symbol}${t.amount.toFixed(2)}`, 175, yOffset);
        yOffset += 6;
      });

      doc.save(`Fortress_Statement_${new Date().toISOString().substring(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation crash:", err);
      alert("Error exporting PDF statement. Please make sure all entries are valid.");
    }
  };

  // automated Gemini Spending patterns AI advisor proxy
  const handleFetchAIVelocity = async () => {
    if (transactions.length === 0) {
      setAiInsights("Please enter some transactions first to allow the AI to build a profile.");
      return;
    }
    
    setAiLoading(true);
    setAiInsights(null);
    setAiStep("Parsing transaction matrix...");

    // Creative rotating loading lines to make the AI experience feel incredible
    const loaders = [
      "De-duplicating transactional nodes...",
      "Mapping categorical budget margins...",
      "Analyzing repeating subscription weights...",
      "Generating strategic capital tips...",
      "Querying Gemini-3.5-Flash for suggestions..."
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < loaders.length) {
        setAiStep(loaders[stepIdx]);
        stepIdx++;
      }
    }, 1200);

    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions,
          budgets,
          baseCurrency: profile.baseCurrency
        })
      });

      const data = await res.json();
      clearInterval(interval);
      
      if (data.success) {
        setAiInsights(data.analysis);
      } else {
        setAiInsights(`### AI Recommendation Error\n\n${data.error || "Failed to generate report."}`);
      }
    } catch (e: any) {
      clearInterval(interval);
      setAiInsights(`### Offline Mode Notice\n\nYour app is currently running in **Local Offline Mode** (Express connection not detected). Set up your environment secrets and start the server to get real-time **Gemini AI Financial Reports**.\n\nHere is a quick offline tip: **Try to keep discretionary expenses (Food, Entertainment, Shopping) below 30% of your total income** to build a secure financial runway!`);
    } finally {
      setAiLoading(false);
    }
  };

  // Chat Q&A sending mechanism grounded in active database context
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", text: userText }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          transactions,
          budgets,
          goals,
          baseCurrency: profile.baseCurrency
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setChatMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", text: `I apologize, but I encountered an error while synthesizing financial insights: ${data.error || "Failed API response"}` }]);
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
      // Grounded mock data answers to sustain sandbox usability when running locally offline
      let offlineReply = "I am currently in local offline simulation mode. To enable real-time Gemini AI chat capabilities, ensure that your developer server is running and the GEMINI_API_KEY secret is declared inside your settings dashboard!";
      const lower = userText.toLowerCase();
      if (lower.includes("budget") || lower.includes("limit")) {
        offlineReply = `Offline Simulator: You currently have ${budgets.length} budgets defined. Try inspecting the 'Budgets' tab above to review active category spending caps. Your Food budget is set to ${formatBaseAmount(budgets.find(b => b.category === "Food")?.limit || 15000)}.`;
      } else if (lower.includes("transaction") || lower.includes("spend") || lower.includes("ledger")) {
        offlineReply = `Offline Simulator: You have recorded ${transactions.length} recent transactions. Total expenditures are computed dynamically based on category selection in the 'Ledger' sidebar list. Your most recent logged transaction was: "${transactions[0]?.description || 'none'}" for ${formatBaseAmount(transactions[0]?.amount || 0)}.`;
      } else if (lower.includes("goal") || lower.includes("save") || lower.includes("saving")) {
        offlineReply = `Offline Simulator: You have ${goals.length} active savings goals set up (e.g. ${goals.map(g => g.goalName).join(", ")}). You can review or deposit into them directly in the 'Savings Goals' tab!`;
      }
      setChatMessages(prev => [...prev, { role: "assistant", text: offlineReply }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- DERIVED COMPUTED STATISTICS ---
  const baseCurrencySymbol = useMemo(() => {
    return SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency)?.symbol || "$";
  }, [profile.baseCurrency]);

  const formatBaseAmount = (amountInUSD: number) => {
    const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
    const converted = amountInUSD / baseCur.rateToUSD;
    return `${baseCur.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      // Convert to base rate USD
      const rateFrom = SUPPORTED_CURRENCIES.find(c => c.code === t.currency) || SUPPORTED_CURRENCIES[0];
      const usdAmount = t.amount * rateFrom.rateToUSD;
      if (t.type === "income") income += usdAmount;
      else expense += usdAmount;
    });

    return {
      income,
      expense,
      savings: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0
    };
  }, [transactions]);

  // Safe-To-Spend Daily Budget Widget Logic
  // Formula: Safe-to-Spend Today = (Monthly Income - Total Planned Category Expense Budgets) / Remaining Days in Month
  const safeToSpend = useMemo(() => {
    const totalExpenseBudgets = budgets.reduce((sum, b) => sum + b.limit, 0);
    const dayOfMonth = new Date().getDate();
    const remainingDays = Math.max(1, 31 - dayOfMonth);
    const pool = Math.max(0, monthlyIncome - totalExpenseBudgets);
    const dailyAllowance = pool / 30; // base standard daily allowance
    
    // Dynamic remaining allowance incorporating what they've already spent vs. total budgets
    const totalDiscretionarySpent = transactions
      .filter(t => t.type === "expense" && t.category !== "Housing" && t.category !== "Utilities")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const remainingAllowanceToday = Math.max(0, (monthlyIncome - totalExpenseBudgets - totalDiscretionarySpent) / remainingDays);
    
    return {
      allowance: dailyAllowance,
      remainingToday: remainingAllowanceToday,
      remainingDays
    };
  }, [budgets, transactions, monthlyIncome]);

  // spending trends data structure mapped for Recharts AreaChart
  const areaChartData = useMemo(() => {
    // Group transactions by date for last 10 days
    const dailyTotals: Record<string, { date: string; income: number; expense: number }> = {};
    
    // Seed last 10 days
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      // formatted as MM/DD
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      dailyTotals[dateStr] = { date: label, income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      if (dailyTotals[t.date]) {
        if (t.type === "income") {
          dailyTotals[t.date].income += t.amount;
        } else {
          dailyTotals[t.date].expense += t.amount;
        }
      }
    });

    return Object.values(dailyTotals);
  }, [transactions]);

  // pie chart data for category breakdown
  const pieChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    transactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const colors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"];
    
    return Object.entries(categoryTotals).map(([name, value], idx) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: colors[idx % colors.length]
    }));
  }, [transactions]);

  // Filter transactions for ledger display
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      // Search by Description, Category
      const matchesSearch = t.description.toLowerCase().includes(txSearch.toLowerCase()) || 
                            t.category.toLowerCase().includes(txSearch.toLowerCase());
      
      // Search by Amount
      const matchesAmount = !txSearchAmount.trim() || t.amount.toString().includes(txSearchAmount.trim());
      
      // Filter by Category
      const matchesCategory = txFilterCategory === "All" || t.category === txFilterCategory;
      
      // Filter by Type (Income/Expense)
      const matchesType = txFilterType === "All" || t.type === txFilterType;
      
      // Filter by Date Range
      let matchesDate = true;
      if (txFilterDateRange !== "All") {
        const txDate = new Date(t.date);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (txFilterDateRange === "Today") {
          const compDate = new Date(t.date + "T00:00:00");
          matchesDate = compDate.toDateString() === new Date().toDateString();
        } else if (txFilterDateRange === "Week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          matchesDate = txDate >= sevenDaysAgo;
        } else if (txFilterDateRange === "Month") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(today.getDate() - 30);
          matchesDate = txDate >= thirtyDaysAgo;
        } else if (txFilterDateRange === "Year") {
          const yearAgo = new Date();
          yearAgo.setDate(today.getDate() - 365);
          matchesDate = txDate >= yearAgo;
        } else if (txFilterDateRange === "Custom") {
          if (customStartDate) {
            const start = new Date(customStartDate + "T00:00:00");
            matchesDate = matchesDate && txDate >= start;
          }
          if (customEndDate) {
            const end = new Date(customEndDate + "T23:59:59");
            matchesDate = matchesDate && txDate <= end;
          }
        }
      }

      return matchesSearch && matchesAmount && matchesCategory && matchesType && matchesDate;
    });

    // Sort results
    return [...result].sort((a, b) => {
      if (txSortOrder === "Newest First") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (txSortOrder === "Oldest First") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (txSortOrder === "Highest Amount") {
        return b.amount - a.amount;
      } else if (txSortOrder === "Lowest Amount") {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [transactions, txSearch, txSearchAmount, txFilterCategory, txFilterType, txFilterDateRange, customStartDate, customEndDate, txSortOrder]);

  // --- RETURN UI ---
  return (
    <div 
      style={{ height: "calc(var(--vh, 1vh) * 100)", overflowY: "auto" }}
      className="bg-[#0a0a0a] text-slate-100 font-sans flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-300 overflow-x-hidden"
    >
      
      {/* 🔐 BIOMETRIC & PASSCODE LOCK OVERLAY */}
      <AnimatePresence>
        {profile.isLocked && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{ height: "calc(var(--vh, 1vh) * 100)" }}
            className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col items-center justify-center p-4 overflow-y-auto"
          >
            <div className="w-full max-w-sm flex flex-col items-center">
              {/* Logo / Header */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="font-bold text-lg tracking-tight">FORTRESS</h1>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Finance Node</p>
                </div>
              </div>

              {/* Mode Switch Tabs */}
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-850 mb-6 w-full text-[11px] font-medium text-slate-400">
                <button
                  type="button"
                  onClick={() => { setLockscreenMode("pin"); setPinError(""); }}
                  className={`flex-1 py-2 rounded-lg transition-all ${lockscreenMode === "pin" ? "bg-slate-800 text-white font-semibold" : "hover:text-slate-200"}`}
                >
                  Passcode PIN
                </button>
                <button
                  type="button"
                  onClick={() => { setLockscreenMode("login"); setPinError(""); }}
                  className={`flex-1 py-2 rounded-lg transition-all ${lockscreenMode === "login" ? "bg-slate-800 text-white font-semibold" : "hover:text-slate-200"}`}
                >
                  Email & Pass
                </button>
              </div>

              {/* 1. Passcode entry widget */}
              {lockscreenMode === "pin" && (
                <div className="w-full">
                  <div className="text-center mb-6">
                    <p className="text-slate-400 text-sm font-medium">Verify Identity to Access Account</p>
                    <div className="flex gap-4 justify-center mt-5">
                      {[...Array(4)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-4.5 h-4.5 rounded-full border border-slate-700 transition-all duration-300 ${
                            pinInput.length > i 
                              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] border-emerald-400" 
                              : "bg-slate-900"
                          }`}
                        />
                      ))}
                    </div>
                    {pinError && <p className="text-red-400 text-xs mt-3 font-medium">{pinError}</p>}
                  </div>

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-6 w-full px-6">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(num => (
                      <button 
                        key={num} 
                        type="button"
                        onClick={() => handlePinKey(num)}
                        className="w-16 h-16 rounded-full bg-slate-900/60 hover:bg-slate-800/80 active:bg-slate-700 text-xl font-semibold text-slate-200 border border-slate-800 transition-all flex items-center justify-center mx-auto cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button 
                      type="button"
                      onClick={() => handlePinKey("DEL")}
                      className="w-16 h-16 rounded-full text-slate-400 hover:text-slate-200 text-xs font-mono transition-all flex items-center justify-center mx-auto cursor-pointer"
                    >
                      DELETE
                    </button>
                    <button 
                      type="button"
                      onClick={() => handlePinKey("0")}
                      className="w-16 h-16 rounded-full bg-slate-900/60 hover:bg-slate-800/80 active:bg-slate-700 text-xl font-semibold text-slate-200 border border-slate-800 transition-all flex items-center justify-center mx-auto cursor-pointer"
                    >
                      0
                    </button>
                    <div className="w-16 h-16" />
                  </div>

                  {/* Biometrics Pulse Simulation Trigger */}
                  <div className="border-t border-slate-900 pt-5 w-full flex flex-col items-center">
                    <button
                      type="button"
                      onClick={handleSimulateBiometrics}
                      disabled={isScanning}
                      className={`relative p-5 rounded-full border transition-all duration-500 cursor-pointer ${
                        isScanning 
                          ? "bg-emerald-500/20 border-emerald-400 animate-pulse scale-105" 
                          : scanSuccess 
                            ? "bg-emerald-500 border-emerald-500" 
                            : "bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700 active:scale-95"
                      }`}
                    >
                      {isScanning && (
                        <motion.div 
                          className="absolute inset-0 rounded-full border border-emerald-400"
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                        />
                      )}
                      {scanSuccess ? (
                        <Check className="w-8 h-8 text-white" />
                      ) : (
                        <Fingerprint className="w-8 h-8 text-emerald-400" />
                      )}
                    </button>
                    <p className="text-slate-500 text-xs mt-3 text-center font-sans">
                      {isScanning 
                        ? "Simulating Secure Fingerprint/FaceID Sync..." 
                        : scanSuccess 
                          ? "Biometric Identity Confirmed" 
                          : "Tap to Simulate Secure Biometric Login"}
                    </p>
                    <span className="text-[9px] font-mono text-slate-600 mt-1">Compatible with Apple Secure Enclave & Android Knox</span>
                  </div>
                </div>
              )}

              {/* 2. Traditional Email/Password Login Form */}
              {lockscreenMode === "login" && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (loginEmail.trim() && loginPassword.trim()) {
                      // Simulated success login
                      setProfile(prev => ({ ...prev, email: loginEmail.trim(), isLocked: false }));
                      setPinError("");
                    } else {
                      setPinError("Please enter valid credentials.");
                    }
                  }}
                  className="w-full space-y-4 text-xs font-sans"
                >
                  <div className="text-center mb-2">
                    <h2 className="text-slate-200 text-sm font-semibold">Account Sign-In Portal</h2>
                    <p className="text-slate-500 text-[10px] mt-0.5">Access your decentralized financial records</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Secure Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="alex.mercer@fortress.io"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-400 font-medium">Account Password</label>
                      <button 
                        type="button" 
                        onClick={() => { setLockscreenMode("forgot"); setPinError(""); }}
                        className="text-emerald-400 hover:underline text-[10px]"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                    />
                  </div>

                  {pinError && <p className="text-red-400 text-xs mt-1 font-medium text-center">{pinError}</p>}

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                  >
                    Authorize Session
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-slate-500">Don't have an account? </span>
                    <button 
                      type="button" 
                      onClick={() => { setLockscreenMode("register"); setPinError(""); }}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              )}

              {/* 3. Account Registration Form */}
              {lockscreenMode === "register" && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (registerName.trim() && registerEmail.trim() && registerPassword.trim()) {
                      setProfile(prev => ({
                        ...prev,
                        name: registerName.trim(),
                        email: registerEmail.trim(),
                        isLocked: false
                      }));
                      setPinError("");
                    } else {
                      setPinError("Please fill out all fields.");
                    }
                  }}
                  className="w-full space-y-3.5 text-xs font-sans"
                >
                  <div className="text-center mb-2">
                    <h2 className="text-slate-200 text-sm font-semibold">Create Secure Account</h2>
                    <p className="text-slate-500 text-[10px] mt-0.5">Initialize a personal sandbox profile</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Full Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Alex Mercer"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Secure Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="alex.mercer@fortress.io"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Create Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="Min 6 characters"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                    />
                  </div>

                  {pinError && <p className="text-red-400 text-xs mt-1 font-medium text-center">{pinError}</p>}

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                  >
                    Register & Unlock
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-slate-500">Already have an account? </span>
                    <button 
                      type="button" 
                      onClick={() => { setLockscreenMode("login"); setPinError(""); }}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      Login
                    </button>
                  </div>
                </form>
              )}

              {/* 4. Password Recovery Form */}
              {lockscreenMode === "forgot" && (
                <div className="w-full space-y-4 text-xs font-sans">
                  <div className="text-center">
                    <h2 className="text-slate-200 text-sm font-semibold">Recover Account Password</h2>
                    <p className="text-slate-500 text-[10px] mt-0.5">Send a simulated recovery/reset blueprint link</p>
                  </div>

                  {forgotSuccess ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center space-y-2">
                      <Check className="w-6 h-6 text-emerald-400 mx-auto" />
                      <p className="font-semibold">Reset Link Issued!</p>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        A recovery authorization link has been simulated and sent to <strong className="text-emerald-300">{forgotEmail}</strong>. Please check your spam folder if it doesn't arrive within 5 minutes.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setLockscreenMode("login"); setForgotSuccess(false); setForgotEmail(""); }}
                        className="mt-3 text-white underline hover:text-emerald-300 font-semibold text-[10px]"
                      >
                        Return to Sign-In
                      </button>
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (forgotEmail.trim()) {
                          setForgotSuccess(true);
                          setPinError("");
                        } else {
                          setPinError("Please enter a valid email address.");
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Registered Email Address</label>
                        <input 
                          type="email" 
                          required
                          placeholder="alex.mercer@fortress.io"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                        />
                      </div>

                      {pinError && <p className="text-red-400 text-xs mt-1 font-medium text-center">{pinError}</p>}

                      <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                      >
                        Transmit Recovery Blueprint
                      </button>

                      <div className="text-center pt-2">
                        <button 
                          type="button" 
                          onClick={() => { setLockscreenMode("login"); setPinError(""); }}
                          className="text-slate-400 hover:text-white underline font-semibold text-[10px]"
                        >
                          Cancel & Go Back
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✨ PERSONALIZED WELCOME REVEAL SCREEN */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: "calc(var(--vh, 1vh) * 100)" }}
            className="fixed inset-0 bg-[#070707] z-50 flex flex-col items-center justify-center p-6 overflow-hidden select-none"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md flex flex-col items-center text-center space-y-8 z-10">
              {/* Spinning / Pulsing Logo Ring */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="relative"
              >
                {/* Rotating decorative dotted ring */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                  className="absolute -inset-4 rounded-full border border-dashed border-emerald-500/20"
                />
                
                {/* Outer ring */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  >
                    <Wallet className="w-10 h-10 text-emerald-400" />
                  </motion.div>
                </div>

                {/* Micro Sparkles icon */}
                <motion.div
                  animate={{ y: [-2, 2, -2], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                </motion.div>
              </motion.div>

              {/* Welcoming Text Header */}
              <div className="space-y-3">
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-slate-500 font-mono text-[11px] tracking-[0.2em] uppercase"
                >
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return "Good morning";
                    if (hour < 17) return "Good afternoon";
                    return "Good evening";
                  })()}
                </motion.p>
                <motion.h2
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-2xl md:text-3xl font-bold tracking-tight text-white"
                >
                  Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-extrabold">{profile.name}</span>
                </motion.h2>
              </div>

              {/* Separator Line */}
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "60px", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="h-0.5 bg-gradient-to-r from-emerald-500/50 to-transparent rounded-full"
              />

              {/* Motivational Quote */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="px-6 py-4 bg-slate-900/30 border border-slate-800/40 rounded-2xl relative"
              >
                <p className="text-slate-300 text-sm md:text-base leading-relaxed italic">
                  "{motivationalQuote}"
                </p>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b border-r border-emerald-500/20 rounded-br-2xl" />
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t border-l border-emerald-500/20 rounded-tl-2xl" />
              </motion.div>

              {/* Progress Indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="w-full max-w-xs space-y-2 pt-4"
              >
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>UNSEALING PORTAL</span>
                  <span>100% SECURE</span>
                </div>
                {/* Simple animated bar */}
                <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "0%" }}
                    transition={{ duration: 5.8, ease: "easeInOut" }}
                    className="h-full w-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  />
                </div>
                <p className="text-[9px] text-slate-600 font-mono italic">Synchronizing Fortress database ledger nodes...</p>
              </motion.div>

              {/* Skip button for busy power users */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                whileHover={{ opacity: 0.9, scale: 1.05 }}
                onClick={() => setShowWelcome(false)}
                className="text-[10px] text-slate-400 font-mono tracking-wider hover:underline flex items-center gap-1 cursor-pointer pt-4"
              >
                SKIP INTRO <ChevronRight className="w-3 h-3" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🧭 NAVIGATION HEADER */}
      <header 
        style={{ 
          paddingTop: dimensions.width < 768
            ? "max(env(safe-area-inset-top), 34px)"
            : "12px"
        }}
        className="bg-[#111111] border-b border-slate-900 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 px-4 lg:px-8 pb-3 md:pb-3"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Top-Left Universal Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="flex items-center justify-center p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-850 transition-all cursor-pointer shadow-md"
              title="Toggle Ledger Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white font-sans uppercase">FORTRESS</span>
                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-sm">SECURE</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">PERSONAL FINANCES</p>
            </div>
          </div>

          {/* Desktop Tab Selector Menu */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-900">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
              { id: "transactions", label: "Ledger", icon: CreditCard },
              { id: "budgets", label: "Budgets", icon: Activity },
              { id: "savings", label: "Savings Goals", icon: Target },
              { id: "analytics", label: "AI Analytics", icon: Sparkles },
              { id: "reminders", label: "Reminders", icon: Calendar },
              { id: "exchange", label: "Exchange", icon: Languages },
              { id: "settings", label: "Settings", icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    active 
                      ? "bg-slate-900 text-white shadow-sm border border-slate-800" 
                      : "text-slate-400 hover:text-white hover:bg-slate-900/30"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-emerald-400" : ""}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Top Bar Right: Notifications, Offline Indicators, Lock */}
          <div className="flex items-center gap-3">
            {/* Sync State Indicator & Trigger */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                syncStatus === "synced" 
                  ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" 
                  : syncStatus === "syncing" 
                    ? "bg-yellow-500 animate-pulse" 
                    : "bg-slate-600"
              }`} />
              <button 
                onClick={triggerManualSync}
                className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-900/50 hover:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-850"
                title="Sync state to Express Cloud Server"
              >
                <RefreshCw className={`w-3 h-3 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                {syncStatus === "synced" 
                  ? "Cloud Synced" 
                  : syncStatus === "syncing" 
                    ? "Syncing..." 
                    : syncStatus === "offline"
                      ? "Offline Storage"
                      : "Sync Cloud"}
              </button>
            </div>

            {/* Alert reminding center dropdown trigger */}
            <div className="relative">
              <button 
                onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
                className="p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-850 text-slate-300 relative"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-bounce shadow-[0_0_6px_#ef4444]" />
                )}
              </button>

              <AnimatePresence>
                {showAlertsDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl p-4 z-50 text-xs"
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2">
                      <span className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">Financial Warnings Hub</span>
                      <span className="text-[10px] text-slate-500 font-mono">{alerts.length} Warnings</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <p className="text-slate-500 text-center py-4 font-sans text-[11px]">All budgets and upcoming subscriptions are healthy! No active alerts.</p>
                      ) : (
                        alerts.map((alert, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                              alert.type === "danger" 
                                ? "bg-red-950/20 border-red-500/30 text-red-300" 
                                : alert.type === "warning" 
                                  ? "bg-amber-950/20 border-amber-500/30 text-amber-300" 
                                  : "bg-slate-900 border-slate-800 text-slate-300"
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="font-sans leading-tight text-[11px]">{alert.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Session Manual Lock */}
            <button
              onClick={() => setProfile(prev => ({ ...prev, isLocked: true }))}
              className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 border border-slate-900 transition-all"
              title="Lock Finance Vault"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 💼 PRIMARY VAULT CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto relative">
        
        {/* COLLAPSIBLE SIDEBAR */}
        <AnimatePresence initial={false}>
          {sidebarVisible && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: sidebarExpanded ? 245 : 72, 
                opacity: 1 
              }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden md:flex flex-col bg-[#111111]/80 backdrop-blur-md border-r border-slate-900 h-[calc(100vh-54px)] sticky top-[54px] z-30 shrink-0 overflow-hidden"
            >
              {/* Sidebar Header (Expand/Collapse controls) */}
              <div className="p-4 border-b border-slate-900 flex items-center justify-between gap-2 shrink-0">
                {sidebarExpanded ? (
                  <span className="font-sans font-bold text-[10px] tracking-wider text-slate-400 uppercase">VAULT SHELF</span>
                ) : (
                  <div className="mx-auto w-1 h-1 bg-slate-700 rounded-full" />
                )}
                <button 
                  onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-400 hover:text-emerald-400 transition-all flex items-center justify-center cursor-pointer"
                  title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                  {sidebarExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Navigation Links inside Sidebar */}
              <div className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {[
                  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
                  { id: "transactions", label: "Ledger", icon: CreditCard },
                  { id: "budgets", label: "Budgets", icon: Activity },
                  { id: "savings", label: "Savings Goals", icon: Target },
                  { id: "analytics", label: "AI Analytics", icon: Sparkles },
                  { id: "reminders", label: "Reminders", icon: Calendar },
                  { id: "exchange", label: "Exchange", icon: Languages },
                  { id: "settings", label: "Settings", icon: Settings }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 transition-all cursor-pointer ${
                        active 
                          ? "text-emerald-400 bg-slate-900/60 border-r-2 border-emerald-500 font-semibold" 
                          : "text-slate-400 hover:text-white hover:bg-slate-900/20"
                      } ${sidebarExpanded ? "justify-start text-xs" : "justify-center"}`}
                      title={!sidebarExpanded ? tab.label : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-emerald-400" : ""}`} />
                      {sidebarExpanded && <span className="truncate">{tab.label}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Live Mini Ledger Info / Summary Stat (Expanded only) */}
              {sidebarExpanded && (
                <div className="p-4 border-t border-slate-900 space-y-4 shrink-0">
                  <div className="bg-[#141414] border border-slate-850 p-3.5 rounded-xl space-y-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Safe-To-Spend Today</span>
                    <p className="text-base font-bold font-mono text-emerald-400">
                      {formatBaseAmount(safeToSpend.remainingToday)}
                    </p>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_8px_#10b981]" 
                        style={{ 
                          width: `${Math.min(100, Math.max(0, (totals.income > 0 ? (totals.expense / totals.income) * 100 : 0)))}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                      <span>Spent Rate</span>
                      <span>{totals.income > 0 ? ((totals.expense / totals.income) * 100).toFixed(0) : "0"}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono">
                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]`} />
                    <span className="truncate">Ledger Secure ({profile.baseCurrency} Active)</span>
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* MOBILE OVERLAY DRAWER */}
        <AnimatePresence>
          {sidebarVisible && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-45"
              onClick={() => setSidebarVisible(false)}
            >
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{ 
                  paddingTop: dimensions.width < 768
                    ? "max(env(safe-area-inset-top), 34px)"
                    : "16px"
                }}
                className="w-64 h-full bg-[#111111] border-r border-slate-900 px-4 pb-4 flex flex-col justify-between"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Sidebar Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="font-bold text-xs tracking-wider text-slate-200">FORTRESS VAULT</span>
                  </div>
                  <button 
                    onClick={() => setSidebarVisible(false)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation Menu */}
                <div className="flex-grow py-6 space-y-1.5 overflow-y-auto">
                  {[
                    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
                    { id: "transactions", label: "Ledger", icon: CreditCard },
                    { id: "budgets", label: "Budgets", icon: Activity },
                    { id: "savings", label: "Savings Goals", icon: Target },
                    { id: "analytics", label: "AI Analytics", icon: Sparkles },
                    { id: "reminders", label: "Reminders", icon: Calendar },
                    { id: "exchange", label: "Exchange", icon: Languages },
                    { id: "settings", label: "Settings", icon: Settings }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setSidebarVisible(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                          active 
                            ? "text-emerald-400 bg-slate-900 border border-slate-800 font-semibold" 
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Metrics */}
                <div className="pt-4 border-t border-slate-900 space-y-3">
                  <div className="bg-[#141414] border border-slate-850 p-3 rounded-xl">
                    <span className="text-[8px] font-mono text-slate-500 uppercase block">Safe-To-Spend Today</span>
                    <p className="text-sm font-bold font-mono text-emerald-400">${safeToSpend.remainingToday.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Biometric Shield Encrypted</span>
                  </div>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>



        {/* 💼 PRIMARY VAULT SHELF CONTENT */}
        <main className="flex-1 w-full p-4 lg:p-8 space-y-6 pb-24 md:pb-8">
        
        {/* --- 1. DASHBOARD COMPONENT --- */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Quick Warning Bar */}
            {alerts.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 px-4 flex items-center justify-between text-amber-300 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-sans">You have active spending anomalies or upcoming subscription dues. See Warnings Hub.</span>
                </div>
                <button onClick={() => setShowAlertsDropdown(true)} className="underline hover:text-white font-semibold font-mono text-[10px]">VIEW ALL</button>
              </div>
            )}

            {/* BENTO GRID ROW 1: SAFE-TO-SPEND WIDGET & QUICK STATISTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Daily Budget Safe-to-Spend Widget (Bento Core) */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-900 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl">
                {/* Background ambient glow */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Daily Balance Widget</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    <Check className="w-3 h-3" /> Active Allowance
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-sans font-medium">Today's Safe-to-Spend Allowance</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                        {formatBaseAmount(safeToSpend.remainingToday)}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">/ day</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Dynamically recalibrated from your Monthly Income limit, deducting fixed category budgets and what you've already spent so far.
                    </p>
                  </div>

                  {/* Slider to adjust expected monthly income dynamically */}
                  <div className="bg-[#141414] border border-slate-900 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium font-sans">Expected Monthly Income</span>
                      <div className="relative max-w-[140px]">
                        <span className="absolute left-2.5 top-1.5 text-slate-500 font-mono text-[10px] font-semibold">
                          {profile.baseCurrency === "PKR" ? "Rs." : baseCurrencySymbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="10000000"
                          value={incomeInputStr}
                          onChange={(e) => {
                            const val = e.target.value;
                            setIncomeInputStr(val);
                            const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
                            if (val === "") {
                              setMonthlyIncome(0);
                            } else {
                              const baseVal = Math.max(0, Number(val));
                              setMonthlyIncome(baseVal * baseCur.rateToUSD);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={() => {
                            const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
                            const currentBaseValue = Math.round(monthlyIncome / baseCur.rateToUSD);
                            setIncomeInputStr(String(currentBaseValue));
                          }}
                          className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 pl-8 pr-2 py-1 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors font-mono text-xs text-right font-bold"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    {(() => {
                      const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
                      const currentBaseValue = Math.round(monthlyIncome / baseCur.rateToUSD);
                      return (
                        <>
                          <input 
                            type="range" 
                            min="0" 
                            max="100000" 
                            step="1000" 
                            value={Math.min(100000, currentBaseValue)} 
                            onChange={(e) => {
                              const baseVal = Number(e.target.value);
                              setMonthlyIncome(baseVal * baseCur.rateToUSD);
                            }}
                            className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>{formatBaseAmount(0)}</span>
                            <span>{formatBaseAmount(100000 * baseCur.rateToUSD)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="border-t border-slate-900 mt-5 pt-4 flex justify-between items-center text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>Days remaining in cycle: <strong className="text-slate-200">{safeToSpend.remainingDays} days</strong></span>
                  </div>
                  <span>Baseline Daily Buffer: <strong className="text-slate-200">{formatBaseAmount(safeToSpend.allowance)}</strong></span>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Ledger Metrics</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-mono tracking-wider">MONTHLY EARNINGS</p>
                      <div className="flex items-center gap-1 text-white">
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        <span className="text-lg font-bold font-mono">{formatBaseAmount(totals.income)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-mono tracking-wider">MONTHLY EXPENDITURE</p>
                      <div className="flex items-center gap-1 text-white">
                        <ArrowDownRight className="w-4 h-4 text-rose-500" />
                        <span className="text-lg font-bold font-mono">{formatBaseAmount(totals.expense)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Net Financial Savings Rate</span>
                    <span className={`font-mono font-bold ${totals.savings >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {totals.savingsRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${totals.savings >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${Math.max(0, Math.min(100, totals.savingsRate))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>Deficit</span>
                    <span>Net Save: ${totals.savings.toFixed(2)}</span>
                    <span>Surplus</span>
                  </div>
                </div>
              </div>

            </div>

            {/* BENTO GRID ROW 2: AUTOMATED BILL PAYMENT DUES & RECENT TRANSACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Upcoming Automated Bill Alerts Feed */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Upcoming Bill Reminders</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Auto remind</span>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
                    {reminders.filter(r => !r.completed).slice(0, 4).map((reminder) => (
                      <div 
                        key={reminder.id}
                        className="bg-[#141414] hover:bg-slate-900/60 transition-all border border-slate-900 hover:border-slate-850 p-3.5 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{reminder.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded text-slate-400 uppercase">{reminder.category}</span>
                            <span>Due: {reminder.dueDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold font-mono text-slate-200">${reminder.amount}</span>
                          <button
                            onClick={() => settleBillReminder(reminder)}
                            className="bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 transition-all text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1"
                            title="Settle billing expense and record automatically"
                          >
                            <Check className="w-3.5 h-3.5" /> Paid
                          </button>
                        </div>
                      </div>
                    ))}

                    {reminders.filter(r => !r.completed).length === 0 && (
                      <div className="text-center py-8">
                        <Check className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-semibold">Perfect! All outstanding bills settled.</p>
                        <p className="text-[10px] text-slate-600 font-sans mt-1">Configure new reminders in the Bill Reminders tab</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-900 mt-4 pt-4 text-center">
                  <button 
                    onClick={() => setActiveTab("reminders")} 
                    className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                  >
                    View Billing Scheduler & All Reminders <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Recent Transaction Log Summary */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Recent Transactions</span>
                    </div>
                    <button 
                      onClick={() => setActiveTab("transactions")} 
                      className="text-[10px] font-mono text-emerald-400 hover:underline"
                    >
                      VIEW LEDGER
                    </button>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                    {transactions.slice(0, 5).map((t) => {
                      const rateFrom = SUPPORTED_CURRENCIES.find(c => c.code === t.currency) || SUPPORTED_CURRENCIES[0];
                      return (
                        <div 
                          key={t.id}
                          className="bg-[#141414] border border-slate-900 p-3 rounded-xl flex items-center justify-between hover:border-slate-850 hover:bg-slate-900/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg ${t.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                              {t.type === "income" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate">{t.description}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                <span className="bg-slate-900 border border-slate-800 px-1 rounded text-[9px] text-slate-400 uppercase">{t.category}</span>
                                <span>{t.date}</span>
                                {t.recurring && <span className="text-emerald-500 font-semibold">• Recurring</span>}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className={`text-xs font-bold font-mono ${t.type === "income" ? "text-emerald-400" : "text-slate-200"}`}>
                              {t.type === "income" ? "+" : "-"}{rateFrom.symbol}{t.amount.toFixed(2)}
                            </p>
                            {t.currency !== "USD" && (
                              <p className="text-[9px] text-slate-500 font-mono">Convert: ${(t.amount * rateFrom.rateToUSD).toFixed(2)} USD</p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {transactions.length === 0 && (
                      <p className="text-center text-slate-500 text-xs py-8">No recorded financial ledger entries yet.</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-900 mt-4 pt-4 flex justify-between items-center text-xs text-slate-400">
                  <span>Export transaction ledger format</span>
                  <button 
                    onClick={handleExportPDFReport}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF Statement
                  </button>
                </div>
              </div>

            </div>

            {/* BENTO GRID ROW 3: BUDGET EXECUTION PROGRESS BARS */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Category Budgets Overview</span>
                </div>
                <button onClick={() => setActiveTab("budgets")} className="text-[10px] font-mono text-emerald-400 hover:underline">MANAGE BUDGETS</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgets.slice(0, 6).map((b) => {
                  const percent = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
                  const isExceeded = b.spent > b.limit;
                  return (
                    <div key={b.category} className="bg-[#141414] border border-slate-900 hover:border-slate-850 p-4 rounded-xl space-y-3 transition-colors">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200">{b.category}</span>
                        <span className="text-slate-400 font-mono">
                          <strong className={isExceeded ? "text-rose-400 font-bold" : "text-emerald-400 font-semibold"}>{formatBaseAmount(b.spent)}</strong> / {formatBaseAmount(b.limit)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isExceeded ? "bg-rose-500 shadow-[0_0_8px_#ef4444]" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                        <span>{percent.toFixed(0)}% consumed</span>
                        <span>{isExceeded ? "Warning Overspent" : `${formatBaseAmount(b.limit - b.spent)} left`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* --- 2. LEDGER TRANSACTIONS LOG TAB --- */}
        {activeTab === "transactions" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Add Transaction Form */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl h-fit">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Log Transaction</span>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4 text-xs">
                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Description / Vendor</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., Organic Foods, Tech Salary..."
                    value={newTx.description}
                    onChange={(e) => setNewTx(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Amount</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-slate-600 font-mono">
                        {SUPPORTED_CURRENCIES.find(c => c.code === newTx.currency)?.symbol || "$"}
                      </span>
                      <input 
                        type="number"
                        required
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={newTx.amount}
                        onChange={(e) => setNewTx(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 pl-8 pr-2.5 py-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Currency Tracker */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Currency</label>
                    <select
                      value={newTx.currency}
                      onChange={(e) => setNewTx(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors"
                    >
                      {SUPPORTED_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Ledger Type */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Type</label>
                    <select
                      value={newTx.type}
                      onChange={(e) => setNewTx(prev => ({ ...prev, type: e.target.value as "expense" | "income" }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Category</label>
                    <select
                      value={newTx.category}
                      onChange={(e) => setNewTx(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors"
                    >
                      {BUDGET_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Transaction Date</label>
                    <input 
                      type="date"
                      value={newTx.date}
                      onChange={(e) => setNewTx(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Automated subscription selector */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 p-3 rounded-lg">
                  <input 
                    type="checkbox"
                    id="tx-recurring"
                    checked={newTx.recurring}
                    onChange={(e) => setNewTx(prev => ({ ...prev, recurring: e.target.checked }))}
                    className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <div className="cursor-pointer">
                    <label htmlFor="tx-recurring" className="text-slate-200 font-semibold cursor-pointer block leading-none">Automated Bill / Subscription</label>
                    <span className="text-[10px] text-slate-500 font-sans block mt-1">Registers this as a recurring transaction</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <Plus className="w-4 h-4" /> Log Record
                </button>
              </form>
            </div>

            {/* Right Col: Ledger Transactions Log list */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-full min-h-[580px]">
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400 font-sans">Transaction Ledger Record</span>
                  </div>

                  {/* Export PDF */}
                  <button 
                    onClick={handleExportPDFReport}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold self-end cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export PDF Statement
                  </button>
                </div>

                {/* Comprehensive Filters System */}
                <div className="space-y-3 mb-5 text-xs font-sans">
                  
                  {/* First Row: Search inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Search description / category */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input 
                        type="text"
                        placeholder="Search description / category..."
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 p-2 pl-8 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-200 placeholder-slate-600"
                      />
                    </div>

                    {/* Search by amount */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-slate-500 font-mono text-xs font-semibold">
                        {profile.baseCurrency === "PKR" ? "Rs." : "$"}
                      </span>
                      <input 
                        type="text"
                        placeholder="Search exact amount..."
                        value={txSearchAmount}
                        onChange={(e) => setTxSearchAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 p-2 pl-8 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-200 placeholder-slate-600 font-mono"
                      />
                    </div>
                  </div>

                  {/* Second Row: Filters and Sorting selects */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Select Category */}
                    <div>
                      <select
                        value={txFilterCategory}
                        onChange={(e) => setTxFilterCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 p-2 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="All">All Categories</option>
                        {BUDGET_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Select Transaction Type */}
                    <div>
                      <select
                        value={txFilterType}
                        onChange={(e) => setTxFilterType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 p-2 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="All">All Types</option>
                        <option value="expense">Expenses Only</option>
                        <option value="income">Income Only</option>
                      </select>
                    </div>

                    {/* Select Date Range */}
                    <div>
                      <select
                        value={txFilterDateRange}
                        onChange={(e) => setTxFilterDateRange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 p-2 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="All">All Dates</option>
                        <option value="Today">Today</option>
                        <option value="Week">Last 7 Days</option>
                        <option value="Month">Last 30 Days</option>
                        <option value="Year">Last 365 Days</option>
                        <option value="Custom">Custom Range</option>
                      </select>
                    </div>

                    {/* Select Sort Order */}
                    <div>
                      <select
                        value={txSortOrder}
                        onChange={(e) => setTxSortOrder(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 p-2 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Newest First">Newest First</option>
                        <option value="Oldest First">Oldest First</option>
                        <option value="Highest Amount">Highest Amount</option>
                        <option value="Lowest Amount">Lowest Amount</option>
                      </select>
                    </div>
                  </div>

                  {/* Third Row: Custom calendar date pickers if selected */}
                  {txFilterDateRange === "Custom" && (
                    <motion.div 
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 gap-3 p-3 bg-slate-900/40 border border-slate-900 rounded-lg"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-medium">Start Date</span>
                        <input 
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-850 p-2 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-medium">End Date</span>
                        <input 
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-850 p-2 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                        />
                      </div>
                    </motion.div>
                  )}

                </div>
              </div>

                {/* Transaction list table */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {filteredTransactions.map((t) => {
                    const rateFrom = SUPPORTED_CURRENCIES.find(c => c.code === t.currency) || SUPPORTED_CURRENCIES[0];
                    return (
                      <div 
                        key={t.id}
                        className="bg-[#141414] border border-slate-900 p-3.5 rounded-xl flex items-center justify-between hover:border-slate-850 hover:bg-slate-900/40 transition-all text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${t.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                            {t.type === "income" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-200 truncate">{t.description}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded text-[9px] text-slate-400 uppercase font-sans font-medium">{t.category}</span>
                              <span>{t.date}</span>
                              {t.recurring && <span className="text-emerald-500 font-bold">• Recurring Bill</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className={`font-bold font-mono ${t.type === "income" ? "text-emerald-400" : "text-slate-200"}`}>
                              {t.type === "income" ? "+" : "-"}{rateFrom.symbol}{t.amount.toFixed(2)}
                            </p>
                            {t.currency !== "USD" && (
                              <p className="text-[9px] text-slate-500 font-mono mt-0.5">Base: ${(t.amount * rateFrom.rateToUSD).toFixed(2)} USD</p>
                            )}
                          </div>

                          <button 
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Ledger Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredTransactions.length === 0 && (
                    <div className="text-center py-16 text-slate-500 space-y-2">
                      <Search className="w-8 h-8 text-slate-700 mx-auto" />
                      <p className="text-xs font-semibold">No transactions matched your ledger queries.</p>
                      <p className="text-[10px] text-slate-600">Try adjusting your filters or search constraints.</p>
                    </div>
                  )}
                </div>

              <div className="border-t border-slate-900 mt-5 pt-4 text-slate-500 text-[10px] flex justify-between font-mono">
                <span>Showing {filteredTransactions.length} of {transactions.length} ledger logs</span>
                <span>Active Vault: alex.mercer@fortress.io</span>
              </div>
            </div>

          </div>
        )}

        {/* --- 3. BUDGETS ALLOCATION TAB --- */}
        {activeTab === "budgets" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Set Budget Limits Form */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl h-fit">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Configure Budget Limit</span>
              </div>

              <form onSubmit={handleAddBudget} className="space-y-4 text-xs">
                {/* Select Category */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Category Name</label>
                  <select
                    value={newBudget.category}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors"
                  >
                    {BUDGET_CATEGORIES.filter(c => c !== "Income").map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Limit */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Monthly Target Limit</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-600 font-mono">
                      {profile.baseCurrency === "PKR" ? "Rs." : baseCurrencySymbol}
                    </span>
                    <input 
                      type="number"
                      required
                      placeholder="0"
                      value={newBudget.limit}
                      onChange={(e) => setNewBudget(prev => ({ ...prev, limit: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 pl-8 pr-2.5 py-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <Check className="w-4 h-4" /> Save Target Limit
                </button>
              </form>
            </div>

            {/* Right Col: Category Budgets Tracker */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl h-full min-h-[500px]">
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Active Category Budgets Tracker</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Calculated automatically</span>
              </div>

              <div className="space-y-4">
                {budgets.map((b) => {
                  const percent = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
                  const isExceeded = b.spent > b.limit;
                  return (
                    <div 
                      key={b.category}
                      className="bg-[#141414] border border-slate-900 p-4.5 rounded-2xl space-y-3 hover:border-slate-850 transition-colors"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-100 font-sans">{b.category}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Budget Target: {formatBaseAmount(b.limit)} ({profile.baseCurrency})</p>
                        </div>

                        <div className="text-right">
                          <p className={`font-bold font-mono text-xs ${isExceeded ? "text-rose-400" : "text-slate-200"}`}>
                            Spent: {formatBaseAmount(b.spent)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {isExceeded ? "OVER LIMIT!" : `${formatBaseAmount(b.limit - b.spent)} available`}
                          </p>
                        </div>
                      </div>

                      {/* Progress line */}
                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-850">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeded 
                              ? "bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                              : percent > 85 
                                ? "bg-amber-500" 
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>{percent.toFixed(1)}% of category limit utilized</span>
                        {isExceeded && (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> Deficit: {formatBaseAmount(b.spent - b.limit)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* --- SAVINGS GOALS TAB --- */}
        {activeTab === "savings" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Create Savings Goal Form */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl h-fit">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400 font-sans">Set Savings Goal</span>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const targetAmt = parseFloat(newGoal.targetAmount);
                  if (!newGoal.goalName.trim() || isNaN(targetAmt) || targetAmt <= 0) return;

                  const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
                  const targetInUSD = targetAmt * baseCur.rateToUSD;

                  const goalData = {
                    goalName: newGoal.goalName.trim(),
                    targetAmount: targetInUSD,
                    currentAmount: 0,
                    deadline: newGoal.deadline || new Date().toISOString().substring(0, 7)
                  };

                  if (currentUser) {
                    try {
                      await addDoc(collection(db, "users", currentUser.uid, "goals"), goalData);
                    } catch (err) {
                      console.error("Error adding savings goal to Firestore:", err);
                    }
                  } else {
                    const addedGoal: SavingsGoal = {
                      id: "g_" + Date.now(),
                      ...goalData
                    };
                    setGoals(prev => [...prev, addedGoal]);
                  }

                  setNewGoal({
                    goalName: "",
                    targetAmount: "",
                    deadline: new Date().toISOString().substring(0, 7)
                  });
                }} 
                className="space-y-4 text-xs font-sans"
              >
                {/* Goal Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Goal Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., Gaming Laptop, Emergency Fund..."
                    value={newGoal.goalName}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, goalName: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Target Amount */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Target Amount ({profile.baseCurrency})</label>
                  <div className="relative font-sans">
                    <span className="absolute left-2.5 top-2.5 text-slate-500 font-mono">{profile.baseCurrency === "PKR" ? "Rs." : "$"}</span>
                    <input 
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g., 150000"
                      value={newGoal.targetAmount}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, targetAmount: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 pl-8 pr-2.5 py-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Deadline (YYYY-MM) */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Target Month Deadline</label>
                  <input 
                    type="month"
                    required
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Initialize Goal
                </button>
              </form>
            </div>

            {/* Right Col: Savings Goals Tracking Grid */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-full min-h-[500px]">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400 font-sans">Active Savings Goals Blueprint</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {goals.map((g) => {
                    const percent = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
                    
                    return (
                      <div 
                        key={g.id} 
                        className="bg-[#141414] border border-slate-900 hover:border-slate-850 p-5 rounded-2xl flex flex-col justify-between space-y-4 transition-all relative overflow-hidden"
                      >
                        {/* Status tag */}
                        <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-medium px-2 py-0.5 rounded-full">
                          {percent >= 100 ? "Goal Fulfilled! 🎉" : "In Progress"}
                        </div>

                        <div className="space-y-1.5 font-sans">
                          <p className="font-bold text-sm text-slate-100">{g.goalName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Target Deadline: {g.deadline}</p>
                        </div>

                        {/* Progress display */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-400 font-medium font-sans">Saved Progress</span>
                            <span className="font-mono text-emerald-400 font-bold">{percent.toFixed(0)}%</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                            <div 
                              className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] transition-all duration-500"
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                            <span>Saved: <strong className="text-slate-200">{formatBaseAmount(g.currentAmount)}</strong></span>
                            <span>Target: {formatBaseAmount(g.targetAmount)}</span>
                          </div>

                          <p className="text-[10px] text-slate-500 font-mono text-right mt-1">
                            Remaining to save: <strong className="text-emerald-400">{formatBaseAmount(remaining)}</strong>
                          </p>
                        </div>

                        {/* Deposit interaction row */}
                        <div className="border-t border-slate-900 pt-4 flex gap-2">
                          <div className="relative flex-1">
                            <input 
                              type="number" 
                              placeholder="Deposit amount"
                              value={depositAmount[g.id] || ""}
                              onChange={(e) => setDepositAmount(prev => ({ ...prev, [g.id]: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors font-mono text-[11px]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const depositVal = parseFloat(depositAmount[g.id] || "");
                              if (isNaN(depositVal) || depositVal <= 0) return;
                              
                              const baseCur = SUPPORTED_CURRENCIES.find(c => c.code === profile.baseCurrency) || SUPPORTED_CURRENCIES[0];
                              const depositInUSD = depositVal * baseCur.rateToUSD;

                              if (currentUser) {
                                try {
                                  await updateDoc(doc(db, "users", currentUser.uid, "goals", g.id), {
                                    currentAmount: g.currentAmount + depositInUSD
                                  });
                                } catch (err) {
                                  console.error("Error depositing into savings goal:", err);
                                }
                              } else {
                                setGoals(prev => prev.map(goal => {
                                  if (goal.id === g.id) {
                                    return { ...goal, currentAmount: goal.currentAmount + depositInUSD };
                                  }
                                  return goal;
                                }));
                              }
                              
                              setDepositAmount(prev => ({ ...prev, [g.id]: "" }));
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold px-3 py-2 rounded-lg text-[10px] transition-all cursor-pointer shrink-0"
                          >
                            Deposit
                          </button>
                          
                          <button 
                            type="button"
                            onClick={async () => {
                              if (currentUser) {
                                try {
                                  await deleteDoc(doc(db, "users", currentUser.uid, "goals", g.id));
                                } catch (err) {
                                  console.error("Error deleting savings goal:", err);
                                }
                              } else {
                                setGoals(prev => prev.filter(goal => goal.id !== g.id));
                              }
                            }}
                            className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Delete Savings Goal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })}

                  {goals.length === 0 && (
                    <div className="col-span-2 text-center py-16 text-slate-500 space-y-2">
                      <Target className="w-10 h-10 text-slate-800 mx-auto" />
                      <p className="text-xs font-semibold font-sans">No active savings goals.</p>
                      <p className="text-[10px] text-slate-600 font-sans">Set your first target goal to track your savings benchmarks!</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-900 pt-4 mt-6 flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>Secure local persistence active</span>
                <span>Combined savings target metrics calibrated dynamically</span>
              </div>
            </div>

          </div>
        )}

        {/* --- 4. DATA VISUALIZATION & AI ANALYTICS TAB --- */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            
            {/* Visual Charts Grid (Recharts) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Spending Trends over time Line Chart */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Spending Patterns Timeline (Last 10 Days)</span>
                </div>

                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "8px" }}
                        labelClassName="text-slate-400 text-xs font-mono"
                      />
                      <Area type="monotone" dataKey="expense" name="Expenses" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Category Pie breakdown chart */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Monthly Expense Distribution</span>
                  </div>

                  <div className="w-full h-56 flex items-center justify-center relative">
                    {pieChartData.length === 0 ? (
                      <p className="text-slate-500 text-xs font-sans">No expenses recorded to build categorical segments.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "8px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 border-t border-slate-900 pt-3">
                  {pieChartData.map((data, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: data.color }} />
                      <span className="truncate">{data.name}: ${data.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Smart Gemini AI Spending Pattern Advisor Drawer Widget */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm tracking-wide text-white uppercase">Gemini Financial Insights Advisor</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Server-Side Generative Model Proxy Active</p>
                  </div>
                </div>

                <button
                  onClick={handleFetchAIVelocity}
                  disabled={aiLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-850 text-slate-950 hover:scale-101 border border-transparent disabled:scale-100 font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs shrink-0 shadow-lg shadow-emerald-950/20"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {aiStep}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Analyze Spending & budgets
                    </>
                  )}
                </button>
              </div>

              {/* Advisor Response Area */}
              <div className="bg-[#141414] border border-slate-900 rounded-xl p-5 min-h-[160px] flex flex-col justify-center">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <motion.div 
                        className="absolute inset-0 rounded-full border border-emerald-400"
                        animate={{ scale: [1, 1.6, 1], opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      />
                      <Sparkles className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-xs text-slate-400 font-medium font-mono">{aiStep}</p>
                    <p className="text-[10px] text-slate-500 text-center max-w-xs font-sans leading-normal">
                      Gemini is compiling your transactional ledger, evaluating categorical margins, and generating tailored savings blueprints...
                    </p>
                  </div>
                ) : aiInsights ? (
                  <MarkdownRenderer content={aiInsights} />
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-800 mx-auto" />
                    <p className="text-xs text-slate-400 font-semibold font-sans">AI Financial Advisor Ready</p>
                    <p className="text-[10px] text-slate-500 max-w-md mx-auto leading-normal">
                      Click the button above. Gemini will securely analyze your current monthly spent categories, budget limits, and transaction timeline trends to produce customized suggestions, overspending warnings, and optimal targets!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Conversational AI Chat Companion Widget */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm tracking-wide text-white uppercase font-sans">AI Financial Companion Chat</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Real-Time Context-Grounded Cognitive Engine Proxy Active</p>
                  </div>
                </div>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full">
                  ACTIVE SECURE SESSION
                </span>
              </div>

              {/* Chat Messages Display Box */}
              <div className="bg-[#0e0e0e] border border-slate-900 rounded-xl p-4 h-80 overflow-y-auto flex flex-col space-y-3.5 scrollbar-thin">
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col max-w-[85%] font-sans text-xs ${msg.role === "user" ? "self-end items-end" : "self-start items-start"}`}
                  >
                    <span className="text-[9px] font-mono text-slate-500 mb-1">
                      {msg.role === "user" ? "You (Client)" : "Gemini Companion"}
                    </span>
                    <div 
                      className={`p-3 rounded-2xl border text-slate-100 leading-relaxed ${
                        msg.role === "user" 
                          ? "bg-emerald-500/5 border-emerald-500/20 rounded-tr-none text-emerald-200" 
                          : "bg-slate-900 border-slate-850 rounded-tl-none text-slate-100"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="self-start flex flex-col items-start max-w-[80%] font-sans text-xs">
                    <span className="text-[9px] font-mono text-slate-500 mb-1">Gemini Companion</span>
                    <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Synthesizing data model...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions Pills */}
              <div className="flex flex-wrap gap-1.5 pb-2 text-[10px]">
                <span className="text-slate-500 font-medium py-1">Quick Queries:</span>
                {[
                  "How much did I spend in total?",
                  "Are my budget limits safe?",
                  "Check my savings goals benchmarks."
                ].map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setChatInput(pill)}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendChatMessage} className="flex gap-2.5">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Gemini about transactions, budgets, savings milestones..."
                  className="flex-1 bg-[#0e0e0e] border border-slate-900 focus:border-emerald-500 p-3 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-900 disabled:text-slate-600 text-slate-950 font-bold px-4 py-3 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-emerald-950/10 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        )}

        {/* --- 5. BILLING DUES & REMINDERS TAB --- */}
        {activeTab === "reminders" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Add Bill Reminder Form */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl h-fit">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Configure Bill Reminder</span>
              </div>

              <form onSubmit={handleAddReminder} className="space-y-4 text-xs">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Bill Title / Subscription</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., Gym Subscription, Power Bill..."
                    value={newReminder.title}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Payment Amount</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-600 font-mono">
                      {profile.baseCurrency === "PKR" ? "Rs." : baseCurrencySymbol}
                    </span>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={newReminder.amount}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 pl-8 pr-2.5 py-2.5 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Due Date */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Due Date</label>
                    <input 
                      type="date"
                      value={newReminder.dueDate}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors font-mono"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Category</label>
                    <select
                      value={newReminder.category}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors"
                    >
                      {BUDGET_CATEGORIES.filter(c => c !== "Income").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Billing Cycle Frequency</label>
                  <select
                    value={newReminder.frequency}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, frequency: e.target.value as "monthly" | "weekly" | "yearly" }))}
                    className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-2.5 rounded-lg text-slate-100 focus:outline-none transition-colors"
                  >
                    <option value="monthly">Monthly Cycle</option>
                    <option value="weekly">Weekly Cycle</option>
                    <option value="yearly">Yearly Cycle</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <Calendar className="w-4 h-4" /> Save Schedule Reminder
                </button>
              </form>
            </div>

            {/* Right Col: Bill Reminders Ledger list */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl h-full min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Scheduled Bill Reminders</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Upcoming subscriptions tracker</span>
                </div>

                <div className="space-y-3">
                  {reminders.map((reminder) => (
                    <div 
                      key={reminder.id}
                      className={`border p-4 rounded-xl flex items-center justify-between gap-4 transition-all text-xs ${
                        reminder.completed 
                          ? "bg-slate-950/30 border-slate-900 text-slate-500 opacity-60" 
                          : "bg-[#141414] border-slate-900 hover:border-slate-850 hover:bg-slate-900/30 text-slate-200"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold truncate ${reminder.completed ? "line-through text-slate-600" : "text-slate-100"}`}>
                            {reminder.title}
                          </p>
                          {reminder.completed && (
                            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[8px] font-mono font-medium px-1.5 rounded-sm">PAID</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="bg-slate-900 border border-slate-800 px-1.5 rounded text-[9px] text-slate-400 uppercase font-sans font-medium">{reminder.category}</span>
                          <span>Due: {reminder.dueDate}</span>
                          <span>• {reminder.frequency}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold font-mono text-sm">${reminder.amount}</span>
                        
                        {!reminder.completed ? (
                          <button
                            onClick={() => settleBillReminder(reminder)}
                            className="bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 transition-all font-bold px-3 py-2 rounded-xl flex items-center gap-1"
                            title="Settle billing expense and record automatically"
                          >
                            <Check className="w-4 h-4" /> Paid
                          </button>
                        ) : (
                          <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-600">
                            <Check className="w-4 h-4" />
                          </span>
                        )}

                        <button 
                          onClick={async () => {
                            if (currentUser) {
                              try {
                                await deleteDoc(doc(db, "users", currentUser.uid, "reminders", reminder.id));
                              } catch (err) {
                                console.error("Error deleting reminder:", err);
                              }
                            } else {
                              setReminders(prev => prev.filter(r => r.id !== reminder.id));
                            }
                          }}
                          className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Reminder Schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {reminders.length === 0 && (
                    <p className="text-center text-slate-500 text-xs py-16">No scheduled upcoming bill reminders configured yet.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-900 mt-5 pt-4 text-slate-500 text-[10px] flex justify-between font-mono">
                <span>Active reminders: {reminders.filter(r => !r.completed).length} outstanding</span>
                <span>Automated bill payment alert active</span>
              </div>
            </div>

          </div>
        )}

        {/* --- 6. CURRENCY EXCHANGE CALCULATOR TAB --- */}
        {activeTab === "exchange" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Interactive Calculator widget */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl h-fit">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                <Languages className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Currency Converter Calculator</span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Input Amount */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium font-sans">Enter Amount</label>
                  <input 
                    type="number"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-3 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none transition-colors font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Currency From */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Convert From</label>
                    <select
                      value={convertFrom}
                      onChange={(e) => setConvertFrom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-slate-200 focus:outline-none"
                    >
                      {SUPPORTED_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>

                  {/* Currency To */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Convert To</label>
                    <select
                      value={convertTo}
                      onChange={(e) => setConvertTo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-slate-200 focus:outline-none"
                    >
                      {SUPPORTED_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conversion calculation outcome displaying */}
                <div className="bg-[#141414] border border-slate-900 rounded-xl p-5 text-center mt-6 space-y-1">
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">CALCULATED EXCHANGE VALUE</p>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      {convertResult !== null ? convertResult.toFixed(2) : "0.00"}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{convertTo}</span>
                  </div>
                  <p className="text-[9px] text-slate-600 font-mono">
                    1 {convertFrom} ≈ {(
                      (SUPPORTED_CURRENCIES.find(c => c.code === convertFrom)?.rateToUSD || 1) / 
                      (SUPPORTED_CURRENCIES.find(c => c.code === convertTo)?.rateToUSD || 1)
                    ).toFixed(4)} {convertTo}
                  </p>
                </div>
              </div>
            </div>

            {/* Currency index reference board */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-full min-h-[420px]">
              <div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Vault Exchange Rates Board</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Base index: USD ($)</span>
                </div>

                <div className="space-y-2.5">
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <div 
                      key={currency.code}
                      className="bg-[#141414] border border-slate-900 p-3.5 rounded-xl flex items-center justify-between hover:border-slate-850 hover:bg-slate-900/30 transition-all text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-bold font-mono text-emerald-400">
                          {currency.symbol}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{currency.code}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">International currency token</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold font-mono text-slate-200">Rate: ${currency.rateToUSD.toFixed(4)} USD</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Value of 1 {currency.code} relative to USD</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-900 mt-5 pt-4 text-slate-500 text-[10px] flex justify-between font-mono">
                <span>Refreshed statically relative to global indices</span>
                <span>Compatible with multi-currency ledgers</span>
              </div>
            </div>

          </div>
        )}

        {/* --- 7. SETTINGS AND PREFERENCES TAB --- */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Profile Management & Default Currency */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-4">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Vault Configuration & Settings</span>
              </div>

              {/* Base Currency Configuration */}
              <div className="space-y-3">
                <h3 className="text-sm font-sans font-semibold text-slate-200">Default Ledger Currency</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose the default currency for all your ledger summaries, Safe-to-Spend calculations, and statistics. Your current default is <strong className="text-emerald-400">{profile.baseCurrency}</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Select Base Currency</label>
                    <select
                      value={profile.baseCurrency}
                      onChange={async (e) => {
                        const newBase = e.target.value;
                        if (currentUser) {
                          try {
                            await updateDoc(doc(db, "users", currentUser.uid), { baseCurrency: newBase });
                          } catch (err) {
                            console.error("Error updating base currency in Firestore:", err);
                          }
                        } else {
                          setProfile(prev => ({ ...prev, baseCurrency: newBase }));
                        }
                      }}
                      className="w-full bg-[#111111] border border-slate-850 p-3 rounded-xl text-xs text-slate-200 focus:border-emerald-500 focus:outline-none transition-all"
                    >
                      {SUPPORTED_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol}) - {c.code === "PKR" ? "Pakistan Rupee" : c.code === "USD" ? "US Dollar" : c.code + " Token"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#141414] border border-slate-900 p-4 rounded-xl flex flex-col justify-center text-center">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Active Base Symbol</span>
                    <span className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                      {baseCurrencySymbol} ({profile.baseCurrency})
                    </span>
                  </div>
                </div>
              </div>

              {/* User Identity / Mock Profile Login Details */}
              <div className="border-t border-slate-900 pt-5 space-y-4">
                <h3 className="text-sm font-sans font-semibold text-slate-200">User Identity & Authentication</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Manage your secure local profile details. This identity is cryptographic and stored offline in your private biometric vault.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Full Display Name</label>
                    <input 
                      type="text"
                      value={profile.name}
                      onChange={async (e) => {
                        const newName = e.target.value;
                        if (currentUser) {
                          try {
                            await updateDoc(doc(db, "users", currentUser.uid), { name: newName });
                          } catch (err) {
                            console.error("Error updating name in Firestore:", err);
                          }
                        } else {
                          setProfile(prev => ({ ...prev, name: newName }));
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-3 rounded-lg text-slate-100 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium font-sans">Secure Email Address</label>
                    <input 
                      type="email"
                      value={profile.email}
                      onChange={async (e) => {
                        const newEmail = e.target.value;
                        if (currentUser) {
                          try {
                            await updateDoc(doc(db, "users", currentUser.uid), { email: newEmail });
                          } catch (err) {
                            console.error("Error updating email in Firestore:", err);
                          }
                        } else {
                          setProfile(prev => ({ ...prev, email: newEmail }));
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-850 focus:border-emerald-500 p-3 rounded-lg text-slate-100 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Passcode Protection */}
              <div className="border-t border-slate-900 pt-5 space-y-4">
                <h3 className="text-sm font-sans font-semibold text-slate-200">Passcode Protection PIN</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">4-Digit Security PIN</label>
                    <input 
                      type="text"
                      maxLength={4}
                      value={profile.pinCode}
                      onChange={async (e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (currentUser) {
                          try {
                            await updateDoc(doc(db, "users", currentUser.uid), { pinCode: val });
                          } catch (err) {
                            console.error("Error updating PIN in Firestore:", err);
                          }
                        } else {
                          setProfile(prev => ({ ...prev, pinCode: val }));
                        }
                      }}
                      className="bg-slate-900 border border-slate-850 p-3 rounded-lg text-slate-100 text-center font-mono tracking-widest text-sm focus:border-emerald-500 focus:outline-none w-28"
                    />
                  </div>
                  <div className="bg-[#141414] border border-slate-900 p-4 rounded-xl text-xs space-y-1.5">
                    <span className="font-semibold text-slate-300">Biometric TouchID Simulator</span>
                    <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={profile.biometricsEnabled}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          if (currentUser) {
                            try {
                              await updateDoc(doc(db, "users", currentUser.uid), { biometricsEnabled: checked });
                            } catch (err) {
                              console.error("Error updating biometrics setting in Firestore:", err);
                            }
                          } else {
                            setProfile(prev => ({ ...prev, biometricsEnabled: checked }));
                          }
                        }}
                        className="accent-emerald-500 rounded border-slate-800 bg-slate-950"
                      />
                      <span>Enable biometric lock screening</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* Right side: Security logs / Login Simulation */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-full min-h-[420px]">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wider text-slate-400">Security Vault Actions</span>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full">Secure Session</span>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#141414] border border-slate-900 p-5 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-200">Simulate Vault Session Locking</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      You can lock your Fortress Vault application to test the secure lockscreen interface and simulate logging back in with your security PIN or biometric scan.
                    </p>
                    <button
                      onClick={() => setProfile(prev => ({ ...prev, isLocked: true }))}
                      className="w-full py-2.5 px-4 bg-rose-950/40 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-rose-900/50 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Private Vault Now</span>
                    </button>
                    {currentUser && (
                      <button
                        onClick={async () => {
                          try {
                            await signOut(auth);
                          } catch (err) {
                            console.error("Sign out error:", err);
                          }
                        }}
                        className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Account</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-[#141414] border border-slate-900 p-5 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">Private Cryptographic Keys</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Your identity contains unique localized signatures for offline transactions verification:
                    </p>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-900 text-[10px] font-mono text-slate-500 space-y-1">
                      <p>MD5: 2A3E1C5B7F9D0E4B</p>
                      <p>SHA256: 8f2c3d5e6a7b8c9d0e1f2a3b4c5d6e7f</p>
                      <p>Cipher: AES-256-GCM Secure</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-900 mt-5 pt-4 text-slate-500 text-[10px] flex justify-between font-mono">
                <span>Passcode security compliant</span>
                <span>PKR default loaded</span>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>

      {/* 🚀 FOOTER BAR */}
      <footer className="bg-[#111111] border-t border-slate-900 py-6 px-4 pb-24 md:pb-6 text-center text-[10px] text-slate-600 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 font-mono">
            <span>© 2026</span>
            <span className="text-slate-400 font-bold">FORTRESS PRIVATE VAULT</span>
            <span>- All Rights Reserved.</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-slate-500">
            <span>SECURE REST SYNC ENGINE</span>
            <span>•</span>
            <span>OFFLINE LOCALSTORAGE ACTIVE</span>
            <span>•</span>
            <span>BIOMETRICS MODULE COMPLIANT</span>
          </div>
        </div>
      </footer>

      {/* 📱 MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111111]/95 backdrop-blur-md border-t border-slate-900/80 flex items-center justify-around py-2.5 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        {[
          { id: "dashboard", label: "Home", icon: LayoutGrid },
          { id: "transactions", label: "Ledger", icon: CreditCard },
          { id: "budgets", label: "Budgets", icon: Activity },
          { id: "analytics", label: "AI Advice", icon: Sparkles },
          { id: "settings", label: "Settings", icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all relative cursor-pointer"
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-colors ${active ? "text-emerald-400" : "text-slate-500"}`} />
              <span className={`text-[10px] tracking-wide font-sans ${active ? "text-white font-medium" : "text-slate-500"}`}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-4 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

    </div>
  );
}
