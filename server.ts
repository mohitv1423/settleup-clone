import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Group, Member, Expense } from './src/types';

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB state
interface Database {
  groups: Record<string, Group>;
}

function readDb(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading database file, resetting to empty', err);
  }
  return { groups: {} };
}

function writeDb(db: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database', err);
  }
}

// Lazy load Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set. Please add it in Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

// Middleware for JSON parsing
app.use(express.json({ limit: '10mb' }));

// --- API Endpoints ---

// Create a new group
app.post('/api/groups', (req, res) => {
  try {
    const { name, currency, members } = req.body;
    if (!name || !currency) {
      return res.status(400).json({ error: 'Name and currency are required.' });
    }

    const groupId = 'g_' + Math.random().toString(36).substring(2, 11);
    
    // Map initial members string array to Member objects
    const formattedMembers: Member[] = (members || []).map((mName: string) => ({
      id: 'm_' + Math.random().toString(36).substring(2, 11),
      name: mName.trim()
    }));

    const newGroup: Group = {
      id: groupId,
      name: name.trim(),
      currency: currency.toUpperCase(),
      members: formattedMembers,
      expenses: [],
      createdAt: new Date().toISOString()
    };

    const db = readDb();
    db.groups[groupId] = newGroup;
    writeDb(db);

    res.status(201).json(newGroup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a group by ID
app.get('/api/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDb();
    const group = db.groups[id];
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add a member to a group
app.post('/api/groups/:id/members', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Member name is required.' });
    }

    const db = readDb();
    const group = db.groups[id];
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Check if name already exists
    if (group.members.some(m => m.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Member with this name already exists in the group.' });
    }

    const newMember: Member = {
      id: 'm_' + Math.random().toString(36).substring(2, 11),
      name: name.trim()
    };

    group.members.push(newMember);
    writeDb(db);

    res.status(201).json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add an expense (or settlement) to a group
app.post('/api/groups/:id/expenses', (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, date, payerId, recipientId, splitType, shares, category, isSettlement, notes } = req.body;

    if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }
    if (!payerId) {
      return res.status(400).json({ error: 'Payer is required.' });
    }

    const db = readDb();
    const group = db.groups[id];
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Verify members exist
    const memberIds = group.members.map(m => m.id);
    if (!memberIds.includes(payerId)) {
      return res.status(400).json({ error: 'Payer must be a valid member of this group.' });
    }

    if (isSettlement) {
      if (!recipientId || !memberIds.includes(recipientId)) {
        return res.status(400).json({ error: 'Valid recipient is required for settlement transactions.' });
      }
      if (payerId === recipientId) {
        return res.status(400).json({ error: 'Payer and recipient cannot be the same person.' });
      }
    }

    const newExpense: Expense = {
      id: 'e_' + Math.random().toString(36).substring(2, 11),
      title: isSettlement ? 'Settlement Payment' : (title || 'Unspecified Expense').trim(),
      amount: Number(amount),
      date: date || new Date().toISOString(),
      payerId,
      recipientId,
      splitType: splitType || 'equal',
      shares: shares || {},
      category: isSettlement ? 'Settlement' : (category || 'Other'),
      isSettlement: !!isSettlement,
      notes: (notes || '').trim()
    };

    group.expenses.push(newExpense);
    writeDb(db);

    res.status(201).json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edit an expense
app.put('/api/groups/:id/expenses/:expenseId', (req, res) => {
  try {
    const { id, expenseId } = req.params;
    const { title, amount, date, payerId, recipientId, splitType, shares, category, isSettlement, notes } = req.body;

    const db = readDb();
    const group = db.groups[id];
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const expenseIdx = group.expenses.findIndex(e => e.id === expenseId);
    if (expenseIdx === -1) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const existingExpense = group.expenses[expenseIdx];

    const updatedExpense: Expense = {
      ...existingExpense,
      title: isSettlement ? 'Settlement Payment' : (title || existingExpense.title).trim(),
      amount: amount !== undefined ? Number(amount) : existingExpense.amount,
      date: date || existingExpense.date,
      payerId: payerId || existingExpense.payerId,
      recipientId: isSettlement ? recipientId : undefined,
      splitType: splitType || existingExpense.splitType,
      shares: shares || existingExpense.shares,
      category: isSettlement ? 'Settlement' : (category || existingExpense.category),
      isSettlement: isSettlement !== undefined ? !!isSettlement : existingExpense.isSettlement,
      notes: notes !== undefined ? notes.trim() : existingExpense.notes
    };

    group.expenses[expenseIdx] = updatedExpense;
    writeDb(db);

    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an expense
app.delete('/api/groups/:id/expenses/:expenseId', (req, res) => {
  try {
    const { id, expenseId } = req.params;

    const db = readDb();
    const group = db.groups[id];
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const filteredExpenses = group.expenses.filter(e => e.id !== expenseId);
    if (filteredExpenses.length === group.expenses.length) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    group.expenses = filteredExpenses;
    writeDb(db);

    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Smart AI Expense Parser (via Gemini)
app.post('/api/groups/:id/parse-expense', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, image, mimeType } = req.body;

    const db = readDb();
    const group = db.groups[id];
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!text && !image) {
      return res.status(400).json({ error: 'Either prompt text or a receipt image must be provided.' });
    }

    // Instantiate Gemini Client safely
    let ai;
    try {
      ai = getGeminiClient();
    } catch (apiErr: any) {
      return res.status(400).json({
        error: 'Gemini API not configured.',
        details: apiErr.message,
        missingApiKey: true
      });
    }

    // Prepare contents
    const contents: any[] = [];
    
    let userPrompt = "Parse this bill/receipt/expense for a bill splitting app.\n";
    if (group.members.length > 0) {
      userPrompt += `Available group members: ${group.members.map(m => `"${m.name}"`).join(', ')}. Try to match the payer name and splitting participants to these members if possible.\n`;
    }
    
    if (text) {
      userPrompt += `User Description: "${text}"\n`;
    }

    contents.push({ text: userPrompt });

    if (image) {
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: image // Base64 encoded image
        }
      });
    }

    // Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: contents },
      config: {
        systemInstruction: "You are an expert bill and receipt parsing engine. Extract the merchant/expense title, total amount (always a number), a standard category (one of: Food, Travel, Lodging, Entertainment, Groceries, Shopping, Utilities, Other), the member name of who paid (if identifiable), and a list of participant names who should split the bill. Return details in strict JSON format.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title or merchant name of the expense" },
            amount: { type: Type.NUMBER, description: "Total amount of the bill" },
            category: { 
              type: Type.STRING, 
              description: "Category of expense. Must be one of: Food, Travel, Lodging, Entertainment, Groceries, Shopping, Utilities, Other" 
            },
            payerName: { type: Type.STRING, description: "Name of the person who paid the bill, or empty string if unknown" },
            splitParticipants: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Names of the people splitting the bill. If everyone or unspecified, leave as an empty array." 
            }
          },
          required: ['title', 'amount', 'category']
        }
      }
    });

    const parsedJson = JSON.parse(response.text || '{}');
    res.json(parsedJson);

  } catch (error: any) {
    console.error('Error in smart AI parser:', error);
    res.status(500).json({ error: 'Failed to parse receipt with AI.', details: error.message });
  }
});


// --- Vite or Static Asset Routing ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback route for any non-API requests
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Settle Up Clone backend running on http://localhost:${PORT}`);
  });
}

startServer();
