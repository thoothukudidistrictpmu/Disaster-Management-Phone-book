import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { processDirectoryCSV } from './src/utils/csvParser.ts';
import { ContactRecord, DirectoryData } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

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

  return `You are the Official Citizen AI Helpdesk Assistant for the Government Contact Directory of Thoothukudi District Administration.

YOUR ROLE & MISSION:
- Help citizens find official contact details, designations, departments, and verified mobile numbers across all 10 Taluks (${talukList}).
- Provide clear guidance on public service procedures, grievance petitions, revenue certificates (Patta, Chitta, Income, Community), and emergency protocols (Fire & Rescue, Police 112, Ambulance 108).

OFFICIAL VERIFIED DISTRICT CONTACT DIRECTORY (Thoothukudi District):
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

// POST /api/chat - Multi-turn Gemini chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, modelPreference, role } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: "messages" array is required.',
      });
    }

    // Determine target model based on user preference or task type:
    // - Complex tasks: 'gemini-3.1-pro-preview'
    // - Fast tasks: 'gemini-3.1-flash-lite'
    // - General tasks: 'gemini-3.5-flash'
    let requestedModel = 'gemini-3.5-flash';
    if (modelPreference === 'complex' || modelPreference === 'gemini-3.1-pro-preview') {
      requestedModel = 'gemini-3.1-pro-preview';
    } else if (modelPreference === 'fast' || modelPreference === 'gemini-3.1-flash-lite') {
      requestedModel = 'gemini-3.1-flash-lite';
    } else {
      requestedModel = 'gemini-3.5-flash';
    }

    // Fetch latest directory records to ground the chatbot with exact official contacts
    const directoryData = await fetchSheetData().catch(() => null);
    const contacts = directoryData?.contacts || [];
    const systemInstruction = buildSystemInstruction(contacts);

    // Format multi-turn conversation history for @google/genai
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));

    let replyText = '';
    let finalModelUsed = requestedModel;

    try {
      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: formattedContents,
        config: {
          systemInstruction,
          topP: 0.95,
        },
      });
      replyText = response.text || 'I am currently unable to generate a response. Please try again.';
    } catch (modelError: any) {
      // If gemini-3.1-pro-preview encounters 429 quota/tier error, fallback to gemini-3.5-flash
      if (requestedModel === 'gemini-3.1-pro-preview') {
        const fallbackModel = 'gemini-3.5-flash';
        const fallbackResponse = await ai.models.generateContent({
          model: fallbackModel,
          contents: formattedContents,
          config: {
            systemInstruction,
            topP: 0.95,
          },
        });
        replyText = fallbackResponse.text || 'Response generated successfully.';
        finalModelUsed = fallbackModel;
      } else {
        throw modelError;
      }
    }

    return res.json({
      success: true,
      reply: replyText,
      modelUsed: finalModelUsed,
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Government Helpdesk Assistant is temporarily busy. Please try again in a few moments.',
    });
  }
});

// Dev or Production Vite integration
async function bootstrap() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
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
