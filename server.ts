import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "10mb" }));

// In-memory data persistence for real-time cloud sync simulation
// In a full application this would be a database, but an in-memory/fs store ensures out-of-the-box working sync
interface SyncData {
  transactions: any[];
  budgets: any[];
  reminders: any[];
  settings: any;
  lastSynced: string;
}

let serverSyncStore: Record<string, SyncData> = {};

// Default mock sync data to start with if none exists
const defaultSyncData: SyncData = {
  transactions: [
    { id: "t1", description: "Organic Foods Co.", amount: 84.50, category: "Food", type: "expense", date: "2026-06-25", currency: "USD" },
    { id: "t2", description: "Monthly Rent Apartment 4B", amount: 1500.00, category: "Housing", type: "expense", date: "2026-06-01", currency: "USD" },
    { id: "t3", description: "TechCorp Salary", amount: 4200.00, category: "Income", type: "income", date: "2026-06-25", currency: "USD" },
    { id: "t4", description: "City Power & Gas", amount: 112.40, category: "Utilities", type: "expense", date: "2026-06-15", currency: "USD" },
    { id: "t5", description: "Subway Ride", amount: 2.75, category: "Transport", type: "expense", date: "2026-06-26", currency: "USD" },
    { id: "t6", description: "Cloud Gaming Service", amount: 14.99, category: "Entertainment", type: "expense", date: "2026-06-24", currency: "USD", recurring: true },
    { id: "t7", description: "Premium Gym Membership", amount: 65.00, category: "Health", type: "expense", date: "2026-06-20", currency: "USD", recurring: true },
    { id: "t8", description: "Boutique Coffee", amount: 12.50, category: "Food", type: "expense", date: "2026-06-27", currency: "USD" },
  ],
  budgets: [
    { category: "Food", limit: 400, spent: 97.00 },
    { category: "Housing", limit: 1600, spent: 1500.00 },
    { category: "Utilities", limit: 300, spent: 112.40 },
    { category: "Transport", limit: 150, spent: 2.75 },
    { category: "Entertainment", limit: 200, spent: 14.99 },
    { category: "Health", limit: 100, spent: 65.00 },
    { category: "Shopping", limit: 250, spent: 0.00 },
  ],
  reminders: [
    { id: "r1", title: "Monthly Rent Payment", amount: 1500.00, dueDate: "2026-07-01", category: "Housing", frequency: "monthly", completed: false },
    { id: "r2", title: "City Power & Gas Bill", amount: 125.00, dueDate: "2026-07-15", category: "Utilities", frequency: "monthly", completed: false },
    { id: "r3", title: "Premium Gym Subscription", amount: 65.00, dueDate: "2026-07-20", category: "Health", frequency: "monthly", completed: false },
    { id: "r4", title: "Cloud Storage Backup", amount: 9.99, dueDate: "2026-07-05", category: "Utilities", frequency: "monthly", completed: false },
  ],
  settings: {
    baseCurrency: "USD",
    pinCode: "1234",
    biometricsEnabled: true,
    theme: "dark"
  },
  lastSynced: new Date().toISOString()
};

// Seed an initial test session
serverSyncStore["user_default"] = { ...defaultSyncData };

// --- LAZY INITIALIZATION OF GEMINI CLIENT ---
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or contains placeholder in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST Sync Endpoints
app.post("/api/sync", (req, res) => {
  const { userId = "user_default", data } = req.body;
  if (!data) {
    return res.status(400).json({ error: "Missing data payload" });
  }
  
  serverSyncStore[userId] = {
    ...data,
    lastSynced: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: "Data successfully synchronized with the cloud",
    lastSynced: serverSyncStore[userId].lastSynced,
    data: serverSyncStore[userId]
  });
});

app.get("/api/sync/:userId?", (req, res) => {
  const userId = req.params.userId || "user_default";
  const data = serverSyncStore[userId];
  
  if (!data) {
    // If no data exists, seed with default data and return
    serverSyncStore[userId] = { ...defaultSyncData, lastSynced: new Date().toISOString() };
    return res.json({
      success: true,
      message: "Initialized new user profile on cloud store",
      data: serverSyncStore[userId]
    });
  }
  
  res.json({
    success: true,
    data: data
  });
});

// Gemini spending analysis proxy
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { transactions, budgets, baseCurrency = "USD" } = req.body;
    
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "No transactions provided for analysis." });
    }

    const client = getGeminiClient();
    
    // Construct a compact, highly descriptive text summary for Gemini
    const transactionSummary = transactions
      .slice(0, 40) // Limit to recent 40 to avoid overloading context & stay efficient
      .map(t => `- ${t.date}: ${t.description} (${t.category}) -> ${t.amount} ${t.currency || baseCurrency} [${t.type}]`)
      .join("\n");

    const budgetSummary = budgets
      .map((b: any) => `- Category: ${b.category}, Budget: ${b.limit} ${baseCurrency}, Spent so far: ${b.spent} ${baseCurrency}`)
      .join("\n");

    const systemInstruction = 
      "You are a professional, friendly, and objective financial advisor AI. Your role is to analyze a user's transactions and budget data to provide actionable, clear, and high-quality financial insights. Do not use generic filler words or self-praising fluff. Provide precise pointers, warnings on overspending, and practical advice to optimize savings.";

    const prompt = `
Please analyze my recent financial history and current budget settings to provide:
1. A concise overview of my spending behavior (what stands out, major categories, current financial velocity).
2. Warnings or alerts if I am overspending or about to overshoot my budget in any categories.
3. 3 highly specific, customized savings recommendations or optimization strategies based on my transactions.
4. An automated recurring bills analysis (e.g., alert if subscription weights are high).

Here is my data:
-- BASE CURRENCY --
${baseCurrency}

-- RECENT TRANSACTIONS --
${transactionSummary}

-- BUDGET LIMITS vs CURRENT SPENDING --
${budgetSummary}

Please return the response as a clear markdown summary containing distinct headings:
- **Financial Health Summary**
- **Budget Alerts & Category Velocity**
- **Actionable Optimization Pointers**
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({
      success: true,
      analysis: response.text
    });
  } catch (error: any) {
    console.error("Gemini API Analysis Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An error occurred while generating insights. Please make sure your GEMINI_API_KEY is properly set up."
    });
  }
});

// Gemini Chat Q&A Assistant proxy
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, transactions = [], budgets = [], goals = [], baseCurrency = "USD" } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "No user message provided." });
    }

    const client = getGeminiClient();
    
    // Construct transaction, budget, and savings goals summaries to ground the answers
    const transactionSummary = transactions
      .slice(0, 40)
      .map((t: any) => `- ${t.date}: ${t.description} (${t.category}) -> ${t.amount} ${t.currency || baseCurrency} [${t.type}]`)
      .join("\n");

    const budgetSummary = budgets
      .map((b: any) => `- Category: ${b.category}, Limit: ${b.limit}, Spent: ${b.spent}`)
      .join("\n");

    const goalsSummary = goals
      .map((g: any) => `- Goal: ${g.goalName}, Target: ${g.targetAmount}, Saved: ${g.currentAmount}, Deadline: ${g.deadline}`)
      .join("\n");

    const systemInstruction = 
      "You are a helpful, extremely precise, and friendly AI Financial Companion. You answer user questions about their budget, expenditures, income, and financial goals directly and conversationally. You must use the provided real financial data to give accurate figures (e.g. if the user asks 'How much did I spend on food?', look through the recent transactions and sum up expenditures in the Food category or cite the budget spent amount). Be concise, clear, and professional. Avoid filler words.";

    const prompt = `
The user has asked this question:
"${message}"

Here is the user's current localized financial database to base your answer on:
-- BASE CURRENCY --
${baseCurrency}

-- SAVINGS GOALS --
${goalsSummary || "No active savings goals configured yet."}

-- BUDGET SETTINGS --
${budgetSummary || "No active category budgets configured yet."}

-- RECENT TRANSACTION LEDGER (40 MOST RECENT) --
${transactionSummary || "No transactions recorded yet."}

Please answer the user's question precisely, referring to actual figures from the ledger where relevant. If the user asks for calculations (e.g. how much they spent in a certain category), compute it from the list of transactions provided above.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // low temperature for precise calculations and answers
      }
    });

    res.json({
      success: true,
      reply: response.text
    });
  } catch (error: any) {
    console.error("Gemini API Chat Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An error occurred while answering your question."
    });
  }
});


// Vite middleware and static serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to start Vite/Express full-stack server:", err);
});
