import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { processDirectoryCSV } from './src/utils/csvParser.ts';
import { ContactRecord, DirectoryData } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '15mb' }));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SHEET_ID = '1oenzjQh390rwWfXbybfcHGqVisqmeKUPRPvWDhNhau4';
const SHEET_GID = '1561800236'; // Sheet2
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const SHEET_CSV_FALLBACK_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet2`;

// In-memory cache
let cachedData: DirectoryData | null = null;
let lastFetchedTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

async function fetchSheetData(forceRefresh = false): Promise<DirectoryData> {
  const now = Date.now();
  if (!forceRefresh && cachedData && now - lastFetchedTime < CACHE_TTL_MS) {
    return cachedData;
  }

  let csvText = '';
  try {
    const response = await fetch(SHEET_CSV_URL, {
      headers: {
        'User-Agent': 'Gov-Contact-Directory-Service/1.0',
        'Accept': 'text/csv,text/plain,*/*',
      },
    });

    if (response.ok) {
      csvText = await response.text();
    } else {
      throw new Error(`Primary endpoint returned ${response.status}`);
    }
  } catch (err) {
    // Try gviz endpoint as backup
    const fallbackResponse = await fetch(SHEET_CSV_FALLBACK_URL, {
      headers: {
        'User-Agent': 'Gov-Contact-Directory-Service/1.0',
        'Accept': 'text/csv,text/plain,*/*',
      },
    });
    if (!fallbackResponse.ok) {
      throw new Error(`Failed to retrieve Sheet2 data: ${fallbackResponse.status}`);
    }
    csvText = await fallbackResponse.text();
  }

  const parsed = processDirectoryCSV(csvText);
  cachedData = parsed;
  lastFetchedTime = now;
  return parsed;
}

// System instruction generator grounded with verified directory database
function buildSystemInstruction(contacts: ContactRecord[] = []): string {
  const talukList = 'Eral, Ettayapuram, Kayathar, Kovilpatti, Ottapidaram, Sathankulam, Srivaikundam, Thoothukudi, Tiruchendur, Vilathikulam';

  // Format directory database into structured records
  const directoryEntries = contacts
    .map((c) => `[Taluk: ${c.taluk} | Department: ${c.department} | Office: ${c.locationType} | Designation: ${c.designation} | Mobile: ${c.mobileNo || 'Not Listed'}]`)
    .join('\n');

  return `You are the Disaster Management AI Directory Assistant for the Disaster Management Response Network.

YOUR ROLE & MISSION:
- Help users, officers, and emergency teams find verified phone numbers, designations, and response personnel across all 10 Taluks (${talukList}).
- Provide rapid contact details for incident coordination, disaster mitigation, flood rescue, highway clearance, public safety, and administrative response.

VERIFIED DISASTER MANAGEMENT DIRECTORY RECORDS:
${directoryEntries}

MANDATORY RULES WHEN ANSWERING CONTACT/NUMBER INQUIRIES:
1. When a citizen asks for an officer, designation, or phone number in any Taluk (e.g., "Tahsildar in Thoothukudi", "ADE Highways in Kovilpatti", "Fire Station Officer in Tiruchendur", "who is Tahsildar of Vilathikulam?"):
   - Look up the matching entry in the verified directory database above.
   - Explicitly display:
     • Official Designation / Title (e.g., **Tahsildar**)
     • Taluk (e.g., **Thoothukudi**)
     • Department (e.g., **Revenue**)
     • Office Location (e.g., **Taluk Office**)
     • Verified Mobile Number (e.g., **9445000680**)
     • Direct Call: tel:+91XXXXXXXXXX
     • Direct WhatsApp: https://wa.me/91XXXXXXXXXX
2. Format the response cleanly so it is pleasant both to read and to hear spoken aloud.
3. If multiple officers match (e.g., Tahsildar, Zonal Deputy Tahsildar, Deputy Tahsildar), list all of them clearly with their designations and mobile numbers.
4. If an officer's phone number is missing in the record, clearly state that the number is not listed in the official sheet yet, but give their office designation and location.
5. If someone asks via voice or casual language (e.g., "give me kovilpatti tahsildar number"), extract the taluk and designation and answer immediately with the requested mobile number and designation details.`;
}

// API Routes
app.get('/api/contacts', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const data = await fetchSheetData(forceRefresh);
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: 'Unable to retrieve directory data from spreadsheet at this time.',
    });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'government-contact-directory' });
});

// Intelligent local directory search fallback when external AI models are busy or down
function lookupDirectoryLocally(query: string, contacts: ContactRecord[]): string {
  const q = String(query || '').toLowerCase().trim();
  const words = q
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length > 2 && !['the', 'and', 'for', 'who', 'what', 'give', 'number', 'contact', 'officer', 'phone', 'please', 'tell', 'show'].includes(w));

  const allTaluks = ['eral', 'ettayapuram', 'kayathar', 'kovilpatti', 'ottapidaram', 'sathankulam', 'srivaikundam', 'thoothukudi', 'tiruchendur', 'vilathikulam'];
  const matchedTaluks = allTaluks.filter((t) => q.includes(t));

  let matches = contacts.filter((c) => {
    const talukMatch = matchedTaluks.length === 0 || matchedTaluks.includes(c.taluk.toLowerCase());
    if (!talukMatch) return false;

    const des = c.designation.toLowerCase();
    const dept = c.department.toLowerCase();
    return words.some((w) => des.includes(w) || dept.includes(w));
  });

  if (matches.length === 0 && matchedTaluks.length > 0) {
    matches = contacts.filter((c) => matchedTaluks.includes(c.taluk.toLowerCase())).slice(0, 6);
  }

  if (matches.length === 0 && words.length > 0) {
    matches = contacts.filter((c) => {
      const allText = `${c.taluk} ${c.department} ${c.designation} ${c.locationType}`.toLowerCase();
      return words.some((w) => allText.includes(w));
    });
  }

  if (matches.length === 0) {
    return `I searched the **Disaster Management Directory** for "${query}", but could not find a matching officer.\n\nPlease check the Taluk name (e.g., *Kovilpatti, Tiruchendur, Thoothukudi*) or designation (e.g., *Tahsildar, Fire & Rescue, BDO*), or use the search filters above.`;
  }

  const topMatches = matches.slice(0, 5);
  const formatted = topMatches.map((c) => {
    const rawNum = c.mobileNo?.replace(/\D/g, '') || '';
    const phoneLinks = rawNum.length >= 10
      ? `\n  - **Direct Actions:** [Call Officer](tel:+91${rawNum}) • [WhatsApp](https://wa.me/91${rawNum})`
      : '';

    return `* **${c.designation}**\n  - **Taluk:** ${c.taluk}\n  - **Department:** ${c.department}\n  - **Office Location:** ${c.locationType}\n  - **Verified Mobile:** **${c.mobileNo || 'Not Listed'}**${phoneLinks}`;
  }).join('\n\n');

  return `Here are the verified contact details from the **Disaster Management Directory**:\n\n${formatted}`;
}

// POST /api/chat - Multi-turn Gemini chat endpoint with instant directory fallback
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, modelPreference } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: "messages" array is required.',
      });
    }

    // Extract latest user query for local lookup fallback
    const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
    const latestUserQuery = userMessages.length > 0 ? String(userMessages[userMessages.length - 1].content || '') : '';

    // Fetch latest directory records
    let contacts: ContactRecord[] = [];
    try {
      const directoryData = await fetchSheetData().catch(() => null);
      contacts = directoryData?.contacts || [];
    } catch {}

    // Priority model: gemini-3.1-flash-lite delivers sub-second responses with high availability
    let candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    if (modelPreference === 'complex' || modelPreference === 'gemini-3.1-pro-preview') {
      candidateModels = ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
    }

    // Format conversation history and ensure it begins with a user message for Gemini compatibility
    let formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));

    while (formattedContents.length > 0 && formattedContents[0].role === 'model') {
      formattedContents.shift();
    }

    if (formattedContents.length === 0 && latestUserQuery) {
      formattedContents = [{ role: 'user', parts: [{ text: latestUserQuery }] }];
    }

    const systemInstruction = buildSystemInstruction(contacts);
    let replyText = '';
    let finalModelUsed = candidateModels[0];

    for (const modelCandidate of candidateModels) {
      try {
        // Enforce a 6-second timeout so model demand spikes never freeze the chat
        const apiPromise = ai.models.generateContent({
          model: modelCandidate,
          contents: formattedContents,
          config: {
            systemInstruction,
            topP: 0.95,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Model timeout after 6s')), 6000)
        );

        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        if (response && response.text) {
          replyText = response.text;
          finalModelUsed = modelCandidate;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelCandidate} failed (${err?.message || err}), attempting fallback...`);
      }
    }

    // If external AI models are experiencing high demand (503), immediately use verified local directory engine
    if (!replyText) {
      console.warn('External AI models busy; serving immediate answer via local directory search engine.');
      replyText = lookupDirectoryLocally(latestUserQuery, contacts);
      finalModelUsed = 'Directory Engine (Verified)';
    }

    return res.json({
      success: true,
      reply: replyText,
      modelUsed: finalModelUsed,
    });
  } catch (error: any) {
    console.warn('Chat endpoint notice:', error?.message || error);
    // Even in catch block, never fail: look up locally!
    try {
      const { messages } = req.body;
      const userMessages = Array.isArray(messages) ? messages.filter((m: any) => m.role === 'user') : [];
      const q = userMessages.length > 0 ? String(userMessages[userMessages.length - 1].content || '') : '';
      const directoryData = await fetchSheetData().catch(() => null);
      const fallbackReply = lookupDirectoryLocally(q, directoryData?.contacts || []);
      return res.json({
        success: true,
        reply: fallbackReply,
        modelUsed: 'Directory Engine (Emergency Fallback)',
      });
    } catch {
      return res.status(200).json({
        success: true,
        reply: 'Please use the Taluk and Department dropdowns directly above to search all 134 verified emergency officers.',
        modelUsed: 'Direct Directory System',
      });
    }
  }
});

// Dev or Production Vite integration
async function bootstrap() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(express.static(path.resolve(__dirname, 'public')));
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
