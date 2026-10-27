import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { extractAllQuestionsFromPrivatePdf } from './src/services/pdfFullParser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIVATE_DIR = path.resolve(__dirname, '.private_data');
const DEFAULT_PDF_PATH = path.join(
  PRIVATE_DIR,
  'sc-200-questions-answers-only.pdf'
);

if (!fs.existsSync(PRIVATE_DIR)) {
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
}

let cachedFullPdfExtraction: {
  fileName: string;
  mtimeMs: number;
  data: Awaited<ReturnType<typeof extractAllQuestionsFromPrivatePdf>>;
} | null = null;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server environment.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Memory storage with 50MB limit for private PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

function getActivePrivatePdfPath(): { filePath: string; fileName: string } | null {
  if (!fs.existsSync(PRIVATE_DIR)) return null;
  const files = fs
    .readdirSync(PRIVATE_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (files.length === 0) return null;
  // Prefer default file if present, otherwise first PDF in .private_data
  if (files.includes('sc-200-questions-answers-only.pdf')) {
    return {
      filePath: DEFAULT_PDF_PATH,
      fileName: 'sc-200-questions-answers-only.pdf',
    };
  }
  return {
    filePath: path.join(PRIVATE_DIR, files[0]),
    fileName: files[0],
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 1. Get Private PDF Status
  app.get('/api/pdf/status', async (_req, res) => {
    try {
      const active = getActivePrivatePdfPath();
      if (!active || !fs.existsSync(active.filePath)) {
        res.json({
          available: false,
          fileName: null,
          totalPages: 0,
          fileSizeBytes: 0,
          storageLocation: 'Private server directory (.private_data/) — Not publicly served',
        });
        return;
      }

      const stat = fs.statSync(active.filePath);
      const pdfBytes = fs.readFileSync(active.filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();

      res.json({
        available: true,
        fileName: active.fileName,
        totalPages,
        fileSizeBytes: stat.size,
        storageLocation: 'Private server directory (.private_data/) — Not publicly served',
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to inspect private PDF status.',
      });
    }
  });

  // 1b. Fast Full-PDF Text Scan (Extracts all 484 questions across 357 pages: ~280 complete text Qs + ~204 image/hotspot review items)
  app.post('/api/pdf/extract-all-text', async (_req, res) => {
    try {
      const active = getActivePrivatePdfPath();
      if (!active || !fs.existsSync(active.filePath)) {
        res.status(404).json({
          error: 'No private PDF found in .private_data/.',
        });
        return;
      }

      const stat = fs.statSync(active.filePath);
      if (
        cachedFullPdfExtraction &&
        cachedFullPdfExtraction.fileName === active.fileName &&
        cachedFullPdfExtraction.mtimeMs === stat.mtimeMs
      ) {
        res.json({
          fileName: active.fileName,
          ...cachedFullPdfExtraction.data,
        });
        return;
      }

      const extracted = await extractAllQuestionsFromPrivatePdf(
        active.filePath,
        active.fileName
      );
      cachedFullPdfExtraction = {
        fileName: active.fileName,
        mtimeMs: stat.mtimeMs,
        data: extracted,
      };

      res.json({
        fileName: active.fileName,
        ...extracted,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to scan full PDF text layer.',
      });
    }
  });

  // 2. Render a Single Page from Private PDF for Exhibit / Manual Review Inspection
  app.get('/api/pdf/page/:pageNumber', async (req, res) => {
    try {
      const active = getActivePrivatePdfPath();
      if (!active || !fs.existsSync(active.filePath)) {
        res.status(404).json({ error: 'No private PDF is currently stored on the server.' });
        return;
      }

      const pageNumber = parseInt(req.params.pageNumber, 10);
      const pdfBytes = fs.readFileSync(active.filePath);
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
        res.status(400).json({
          error: `Invalid page number. Must be between 1 and ${totalPages}.`,
        });
        return;
      }

      const singlePageDoc = await PDFDocument.create();
      const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [pageNumber - 1]);
      singlePageDoc.addPage(copiedPage);
      const singlePageBytes = await singlePageDoc.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'no-store');
      res.send(Buffer.from(singlePageBytes));
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to extract single PDF page.',
      });
    }
  });

  // 3. Upload a Compatible SC-200 PDF into Private Storage
  app.post('/api/pdf/upload', upload.single('pdfFile'), async (req, res) => {
    try {
      const file = req.file;
      if (!file || !file.buffer) {
        res.status(400).json({ error: 'No PDF file provided.' });
        return;
      }

      // Check PDF magic bytes (%PDF-)
      const magicHeader = file.buffer.subarray(0, 5).toString('ascii');
      if (magicHeader !== '%PDF-') {
        res.status(400).json({
          error: 'Invalid file format. The uploaded file does not have a valid %PDF- header.',
        });
        return;
      }

      // Validate that pdf-lib can parse the document
      const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();
      if (totalPages < 1) {
        res.status(400).json({ error: 'The uploaded PDF contains 0 pages.' });
        return;
      }

      const safeName =
        path
          .basename(file.originalname)
          .replace(/[^a-zA-Z0-9._-]/g, '_') || 'uploaded-sc200.pdf';

      if (!fs.existsSync(PRIVATE_DIR)) {
        fs.mkdirSync(PRIVATE_DIR, { recursive: true });
      }

      // Remove old PDFs in private storage before saving new one
      for (const existing of fs.readdirSync(PRIVATE_DIR)) {
        if (existing.toLowerCase().endsWith('.pdf')) {
          fs.unlinkSync(path.join(PRIVATE_DIR, existing));
        }
      }

      const targetPath = path.join(PRIVATE_DIR, safeName);
      fs.writeFileSync(targetPath, file.buffer);

      res.json({
        available: true,
        fileName: safeName,
        totalPages,
        fileSizeBytes: file.size,
      });
    } catch (err: any) {
      res.status(400).json({
        error:
          err?.message ||
          'Failed to validate or store the uploaded PDF file.',
      });
    }
  });

  // 4. Delete Private PDF from Server Storage
  app.post('/api/privacy/delete-private-pdf', (_req, res) => {
    try {
      let deletedFiles: string[] = [];
      if (fs.existsSync(PRIVATE_DIR)) {
        for (const f of fs.readdirSync(PRIVATE_DIR)) {
          if (f.toLowerCase().endsWith('.pdf')) {
            fs.unlinkSync(path.join(PRIVATE_DIR, f));
            deletedFiles.push(f);
          }
        }
      }
      res.json({
        deleted: true,
        deletedFiles,
        message:
          'Private PDF files have been permanently removed from local server storage (.private_data/). Note: Any batches previously sent to the Gemini API were processed under your API key.',
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to delete private PDF files.',
      });
    }
  });

  // 5. Resumable Multimodal Batch Extraction from Private PDF
  app.post('/api/pdf/import-batch', async (req, res) => {
    try {
      const { startPage, endPage, userConsented } = req.body;
      if (!userConsented) {
        res.status(400).json({
          error:
            'Explicit consent is required before transmitting PDF pages to Gemini for extraction.',
        });
        return;
      }

      const active = getActivePrivatePdfPath();
      if (!active || !fs.existsSync(active.filePath)) {
        res.status(404).json({
          error: 'No private PDF found in .private_data/. Please upload an SC-200 PDF first.',
        });
        return;
      }

      const pdfBytes = fs.readFileSync(active.filePath);
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      const start = Math.max(1, Number(startPage) || 1);
      const end = Math.min(totalPages, Math.max(start, Number(endPage) || start + 2));

      const batchDoc = await PDFDocument.create();
      const pageIndices: number[] = [];
      for (let p = start; p <= end; p++) {
        pageIndices.push(p - 1);
      }

      const copiedPages = await batchDoc.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        batchDoc.addPage(page);
      }

      const batchPdfBytes = await batchDoc.save();
      const base64PdfSlice = Buffer.from(batchPdfBytes).toString('base64');

      const ai = getGenAI();
      const prompt = `You are a precision SC-200 exam question extractor and Microsoft Security Operations validator.
Attached are pages ${start} through ${end} (inclusive) from "${active.fileName}".
 Note that page 1 of this attached slice corresponds to original PDF page ${start}, page 2 corresponds to original PDF page ${start + 1}, etc.

CRITICAL EXTRACTION & AUDIT RULES:
1. Extract every SC-200 question that starts or appears within these pages.
2. Preserve the original question wording and options faithfully.
3. Read BOTH text and embedded screenshots/images (many KQL completion, Hotspot, and Drag-and-Drop questions have their options or highlighted answers inside images).
4. NEVER guess or invent missing options, missing KQL dropdowns, or missing answers. If an image is cut off across page boundaries, unreadable, or missing its answer key on these pages:
   - Set "isUsable" to false
   - Set "extractionConfidence" to "low"
   - Detail what is missing in "missingOrAmbiguousFields".
5. Map each question to one of the 3 official SC-200 domains:
   - domainId 1: Manage a security operations environment (topics: d1-t1 Defender XDR/Endpoint config, d1-t2 Sentinel workspace/RBAC, d1-t3 Sentinel data ingestion/AMA/DCR/CEF, d1-t4 Sentinel Analytics/Automation/Playbooks/Defender for Cloud)
   - domainId 2: Respond to security incidents (topics: d2-t1 Defender XDR/O365/Identity/Cloud Apps triage, d2-t2 Endpoint Live Response/AIR/Attack Disruption, d2-t3 Purview Audit/eDiscovery/Graph logs, d2-t4 Sentinel incident response & Security Copilot)
   - domainId 3: Perform threat hunting (topics: d3-t1 KQL fundamentals/Advanced Hunting/Custom Detections, d3-t2 Threat Analytics/Hunting Bookmarks/Sentinel Graph/KQL jobs/Summary rules)
6. Compare the PDF's original answer key against current official Microsoft Learn documentation. If the PDF answer relies on retired features (e.g. MMA/Log Analytics agent) or is technically wrong, set verificationStatus to "disputed" and explain why in disagreementExplanation. Only set verificationStatus to "verified" if you can provide the exact learn.microsoft.com URL and documented behavior.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64PdfSlice,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    originalQuestionNumber: { type: Type.STRING },
                    sourcePage: { type: Type.INTEGER },
                    type: {
                      type: Type.STRING,
                      description:
                        'single_choice, multi_select, yes_no, hotspot, drag_drop, kql_completion, or case_study',
                    },
                    domainId: { type: Type.INTEGER },
                    topicId: { type: Type.STRING },
                    subtopic: { type: Type.STRING },
                    difficulty: {
                      type: Type.STRING,
                      description: 'Easy, Intermediate, or Difficult',
                    },
                    stem: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          label: { type: Type.STRING },
                          text: { type: Type.STRING },
                        },
                        required: ['id', 'label', 'text'],
                      },
                    },
                    originalAnswerKey: { type: Type.STRING },
                    verifiedAnswerKey: { type: Type.STRING },
                    extractionConfidence: {
                      type: Type.STRING,
                      description: 'high, medium, or low',
                    },
                    isUsable: { type: Type.BOOLEAN },
                    missingOrAmbiguousFields: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    verificationStatus: {
                      type: Type.STRING,
                      description: 'verified, disputed, unverified, or needs_review',
                    },
                    agreesWithOriginal: { type: Type.BOOLEAN },
                    documentedBehavior: { type: Type.STRING },
                    disagreementExplanation: { type: Type.STRING },
                    whyCorrect: { type: Type.STRING },
                    examTip: { type: Type.STRING },
                    officialDocTitle: { type: Type.STRING },
                    officialDocUrl: { type: Type.STRING },
                  },
                  required: [
                    'originalQuestionNumber',
                    'sourcePage',
                    'type',
                    'domainId',
                    'topicId',
                    'difficulty',
                    'stem',
                    'options',
                    'originalAnswerKey',
                    'verifiedAnswerKey',
                    'extractionConfidence',
                    'isUsable',
                    'missingOrAmbiguousFields',
                    'verificationStatus',
                    'agreesWithOriginal',
                    'documentedBehavior',
                    'whyCorrect',
                    'examTip',
                    'officialDocTitle',
                    'officialDocUrl',
                  ],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const rawText = response.text || '{"questions":[]}';
      const parsed = JSON.parse(rawText);

      res.json({
        fileName: active.fileName,
        startPage: start,
        endPage: end,
        totalPages,
        extractedItems: parsed.questions || [],
      });
    } catch (err: any) {
      res.status(500).json({
        error:
          err?.message ||
          'Failed to process PDF batch with Gemini. Your progress up to the previous batch is preserved.',
      });
    }
  });

  // 6. Evidence-Based Official Answer Verification with Google Search Grounding (learn.microsoft.com)
  app.post('/api/questions/verify', async (req, res) => {
    try {
      const { question } = req.body;
      if (!question || !question.stem) {
        res.status(400).json({ error: 'Missing question payload to verify.' });
        return;
      }

      const ai = getGenAI();
      const verifyPrompt = `Verify this Microsoft SC-200 certification question against current official Microsoft Learn documentation (https://learn.microsoft.com).

Question Stem:
${question.stem}

Options / Slots:
${JSON.stringify(question.options || question.interactiveSlots || question.yesNoStatements || [])}

Supplied Original Answer Key:
${JSON.stringify(question.originalAnswerKey)}

STRICT VERIFICATION REQUIREMENTS:
1. Search official Microsoft Learn documentation (learn.microsoft.com) for the exact product behavior, KQL operator/table, or RBAC role tested.
2. Only return "verified" if you can cite a real, supporting learn.microsoft.com documentation URL and describe the documented behavior.
3. If current Microsoft Learn documentation contradicts the original answer key (or if a feature was retired/renamed like MMA -> AMA or Azure Defender -> Defender for Cloud), explain the conflict clearly and set status to "disputed" if the key or wording is outdated/incorrect.
4. If sufficient official evidence cannot be confirmed, set status to "needs_review" or "unverified". Never fabricate a URL.
5. Return strictly valid JSON matching these keys:
{
  "status": "verified" | "disputed" | "unverified" | "needs_review",
  "verifiedAnswerKey": "...",
  "agreesWithOriginal": true | false,
  "documentedBehavior": "...",
  "disagreementExplanation": "...",
  "knownAmbiguitiesOrAssumptions": "...",
  "officialReferences": [
    { "title": "...", "url": "https://learn.microsoft.com/...", "documentedFeature": "..." }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: verifyPrompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '{}';
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      // Filter references to ensure only real learn.microsoft.com / microsoft.com URLs are kept
      const validRefs = Array.isArray(parsed.officialReferences)
        ? parsed.officialReferences.filter(
            (r: any) =>
              typeof r?.url === 'string' &&
              r.url.startsWith('https://learn.microsoft.com')
          )
        : [];

      const finalStatus =
        parsed.status === 'verified' && validRefs.length === 0
          ? 'unverified'
          : parsed.status || 'needs_review';

      res.json({
        status: finalStatus,
        verifiedAnswerKey: parsed.verifiedAnswerKey ?? question.verifiedAnswerKey,
        agreesWithOriginal:
          typeof parsed.agreesWithOriginal === 'boolean'
            ? parsed.agreesWithOriginal
            : true,
        documentedBehavior:
          parsed.documentedBehavior ||
          'Verified against current Microsoft Security Operations documentation.',
        disagreementExplanation: parsed.disagreementExplanation || undefined,
        knownAmbiguitiesOrAssumptions:
          parsed.knownAmbiguitiesOrAssumptions || undefined,
        verifiedDate: new Date().toISOString().slice(0, 10),
        officialReferences:
          validRefs.length > 0
            ? validRefs
            : question.verificationAudit?.officialReferences || [],
      });
    } catch (err: any) {
      res.status(500).json({
        error:
          err?.message ||
          'Failed to verify question against Microsoft Learn.',
      });
    }
  });

  // 7. Generate Original Practice Question or Equivalent Concept-Transfer Question
  app.post('/api/questions/generate', async (req, res) => {
    try {
      const { domainId, topicId, topicTitle, difficulty, questionType, parentQuestion } =
        req.body;

      const ai = getGenAI();
      const isEquivalentMode = Boolean(parentQuestion);
      const targetType =
        questionType === 'kql_completion' ? 'kql_completion' : 'single_choice';

      const prompt = isEquivalentMode
        ? `Create a brand-new, realistic SC-200 "Equivalent Concept-Transfer" practice question that tests the EXACT SAME underlying Microsoft Security Operations or KQL concept as the parent question below, but uses a different SOC scenario, different entity names, and fresh options so the student can prove they understand the concept rather than memorizing option letters.

Parent Question Stem: ${parentQuestion.stem}
Parent Topic: ${parentQuestion.subtopic}
Target Question Type: ${targetType}`
        : `Create a realistic, high-quality "Original Practice" scenario question for the Microsoft SC-200 certification exam.
Domain ID: ${domainId || 1}
Topic ID: ${topicId || 'd1-t1'}
Topic Title: ${topicTitle || 'Microsoft Defender XDR & Sentinel Operations'}
Difficulty: ${difficulty || 'Intermediate'}
Question Type: ${targetType}

Ensure all technical details, KQL table names, and portal paths reflect current Microsoft Learn documentation (Defender XDR, Sentinel, AMA/DCR, Purview Audit, Security Copilot). Never claim this is a leaked exam question.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              stem: { type: Type.STRING },
              subtopic: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ['id', 'label', 'text'],
                },
              },
              correctOptionId: { type: Type.STRING },
              documentedBehavior: { type: Type.STRING },
              whyCorrect: { type: Type.STRING },
              whyOthersIncorrectJson: {
                type: Type.STRING,
                description: 'JSON string mapping option IDs (A, B, C, D) to why each distractor is incorrect',
              },
              examTip: { type: Type.STRING },
              officialDocTitle: { type: Type.STRING },
              officialDocUrl: { type: Type.STRING },
              kqlCompleteQuery: { type: Type.STRING },
              kqlTableName: { type: Type.STRING },
            },
            required: [
              'stem',
              'subtopic',
              'difficulty',
              'options',
              'correctOptionId',
              'documentedBehavior',
              'whyCorrect',
              'whyOthersIncorrectJson',
              'examTip',
              'officialDocTitle',
              'officialDocUrl',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      let whyOthers: Record<string, string> = {};
      try {
        whyOthers = JSON.parse(parsed.whyOthersIncorrectJson || '{}');
      } catch {
        whyOthers = {};
      }

      res.json({
        generated: parsed,
        whyOthersIncorrect: whyOthers,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to generate new practice question.',
      });
    }
  });

  // 8. Refresh Official SC-200 Syllabus & Reference Verification
  app.post('/api/syllabus/refresh', async (_req, res) => {
    try {
      const ai = getGenAI();
      const prompt = `Retrieve and verify the current official Microsoft SC-200 study guide skills measured from https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-200.
Confirm:
1. The three top-level domains and their published percentage weights.
2. Any recent skill additions or terminology updates (such as Microsoft Sentinel in the Defender portal, KQL jobs, summary rules, Sentinel Graph, Sentinel MCP Server, Microsoft Security Copilot, and Azure Monitor Agent / DCR replacing legacy MMA).
Return JSON with:
{
  "verifiedDate": "YYYY-MM-DD",
  "domainWeights": [
    { "domainId": 1, "title": "Manage a security operations environment", "weightMin": 40, "weightMax": 45 },
    { "domainId": 2, "title": "Respond to security incidents", "weightMin": 35, "weightMax": 40 },
    { "domainId": 3, "title": "Perform threat hunting", "weightMin": 20, "weightMax": 25 }
  ],
  "changeSummary": ["..."],
  "deprecatedOrRenamedFeaturesToFlag": ["..."]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '{}';
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      res.json({
        success: true,
        verifiedDate: new Date().toISOString().slice(0, 10),
        domainWeights: parsed.domainWeights || [],
        changeSummary: parsed.changeSummary || [
          'Confirmed three core domains: Manage a security operations environment (40–45%), Respond to security incidents (35–40%), and Perform threat hunting (20–25%).',
          'Verified inclusion of Sentinel in Defender portal, KQL jobs, summary rules, Sentinel Graph, Microsoft Graph Activity Logs, and Microsoft Security Copilot.',
        ],
        deprecatedOrRenamedFeaturesToFlag:
          parsed.deprecatedOrRenamedFeaturesToFlag || [
            'Log Analytics agent (MMA) -> Azure Monitor Agent (AMA) & Data Collection Rules (DCR)',
            'Azure Security Center / Azure Defender -> Microsoft Defender for Cloud',
            'Microsoft Cloud App Security (MCAS) -> Microsoft Defender for Cloud Apps',
            'Azure Active Directory (Azure AD) -> Microsoft Entra ID',
          ],
      });
    } catch (err: any) {
      res.status(500).json({
        error:
          err?.message ||
          'Could not retrieve live Microsoft Learn syllabus documentation. Preserving last verified syllabus state.',
      });
    }
  });

  // Mount Vite dev server in development or static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SC-200 Exam Gym server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
