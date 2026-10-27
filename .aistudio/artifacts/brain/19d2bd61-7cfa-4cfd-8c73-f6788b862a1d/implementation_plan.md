# SC-200 Exam Gym

**SC-200 Exam Gym** is a personal, local-first study and exam readiness web application tailored for the **Microsoft SC-200: Microsoft Security Operations Analyst** certification. It combines the complete official Microsoft SC-200 syllabus, a resumable batch import pipeline with independent extraction and verification audit trails, evidence-based Microsoft Learn answer verification, interactive KQL/Hotspot/Drag-and-Drop exercises, visual portal navigation diagrams, spaced repetition with confidence tracking, and an honest, first-attempt-weighted readiness model.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following confirmed product decisions and critical reliability, privacy, and learning improvements govern the application build:

- **Confirmed Decision 1 — Initial Question Bank & Private PDF Import**: The app pre-seeds representative questions alongside Original Practice questions and Official Microsoft Learn resource references, while supporting resumable batch import for your 357-page SC-200 PDF (`sc-200-questions-answers-only.pdf`) and future uploads. To protect your privacy, the PDF is never served from a public static folder (`/public/assets/`); server-side PDF processing reads from private storage outside the public web root, validates file types/sizes, cleans up temporary buffers without logging sensitive question text, and clearly discloses whenever PDF pages or question text are sent to Gemini for extraction or verification.
- **Confirmed Decision 2 — Evidence-Based Answer Verification & Dual Confidence Tracking**: PDF extraction confidence (`High`, `Medium`, `Low`, `Needs Manual Fix`) is tracked completely separately from answer verification status (`Verified`, `Disputed`, `Unverified`, `Needs Review`). An answer is only marked `Verified` when backed by a specific, retrieved `learn.microsoft.com` documentation URL, the documented product behavior/feature, the verification date, explicit agreement/disagreement with the PDF key, and any licensing or product-version assumptions.
- **Confirmed Decision 3 — Interactive Exercises, Deeper KQL Learning & Spaced Repetition**: Hotspot, KQL completion, and drag-and-drop questions use interactive dropdowns and drag-or-click sequence builders without ever silently guessing missing fields. KQL exercises include the expected table schema, operator-by-operator breakdown, common mistakes, and clearly labeled **Simulated Output** tables. Every practice question includes post-answer confidence tracking (`Guessed`, `Unsure`, `Confident`) to drive spaced repetition and "Generate Equivalent Question" conceptual testing.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a complete, local-first training environment across all three official SC-200 domains (*Manage a security operations environment* 40–45%, *Respond to security incidents* 35–40%, and *Perform threat hunting* 20–25%), supporting Practice Mode, timed Exam Simulation, adaptive Focus Mode, Spaced Repetition, Visual Learning diagrams, and audited PDF question bank ingestion.
- **Target Audience / Persona**: A security operations analyst preparing for the latest Microsoft SC-200 certification who requires rigorous technical accuracy across Microsoft Defender XDR, Defender for Endpoint/Identity/Office 365/Cloud Apps/Cloud, Microsoft Purview, Microsoft Sentinel (including Data Lake, KQL jobs, summary rules, Sentinel Graph, and MCP Server), KQL Advanced Hunting, and Microsoft Security Copilot.
- **Key Value**: Replaces blind trust in third-party answer keys with evidence-based Microsoft Learn verification, separates first-attempt mastery from memorization via confidence tracking and equivalent question generation, and teaches portal workflows and KQL schemas visually.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Honest Readiness Dashboard Flow**: Immediately answers four core questions: *How prepared am I?* (internal learning indicator from 0–100 calculated from first-attempt accuracy, domain weights, syllabus breadth, topic mastery, and volume, paired with an explicit evidence summary and uncertainty explanation), *Which area am I weakest in?* (top 5 weak topics and low-confidence concepts), *What should I study next?* (one-click Focus session, Spaced Repetition due queue, or weak-topic drill), and *How much of the syllabus have I covered?* (domain and subtopic progress bars).
  2. **Interactive Practice, Confidence & Spaced Repetition Flow**: Filter by domain, topic, difficulty, question type, verification status, or source (`Imported`, `Original Practice`, `Official Resource Reference`). Answer single-choice, multi-select (with partial credit), Yes/No scenario series, Hotspot dropdowns, Drag-and-Drop sequences, KQL completion, and shared-scenario Case Studies. Immediately after answering, record your confidence (`Guessed`, `Unsure`, `Confident`) to schedule spaced repetition, inspect the evidence-based verification record and full explanation, or click **Test Concept with Equivalent Question** to verify true understanding rather than option memorization.
  3. **Deeper KQL & Visual Learning Flow**: For KQL questions and exercises, inspect the target table schema (columns and types), line-by-line operator explanations, common pitfalls, and a sample result table explicitly labeled **Simulated Output (Not Executed Against Live Sentinel/Defender)**. For portal and workflow questions, open interactive SVG/HTML diagrams that clearly distinguish between **Verified Current Portal Navigation** (with direct Microsoft Learn links) and **Conceptual Investigation Workflows**.
  4. **Timed Exam Simulation Flow**: Configure question count (default 50) and timer (default 100 minutes) with domain-weighted selection. Hides correctness feedback until submission, provides a question navigator, flag-for-review, and unanswered warnings, and concludes with a full domain/topic breakdown and clear notice that practice percentages are internal study indicators rather than official scaled Microsoft exam scores.
  5. **Audited, Resumable PDF Import & Manual Review Queue Flow**: Process private PDFs in manageable page batches with a clear privacy notice before transmitting batches to Gemini. Track discovered, fully usable, duplicate, skipped, and incomplete/ambiguous questions separately. Partially extracted questions or items with missing options/answers are held in an interactive **Import Review & Manual Correction Queue** (with original page image preview and field editors) and excluded from usable question counts and readiness metrics until resolved.
  6. **Privacy, Data Management & Settings Flow**: Configure study defaults, export/import personal progress as JSON, or execute **Delete Imported Bank** and **Clear Local Progress** behind confirmation dialogs that accurately explain local IndexedDB/server file deletion versus external API processing history.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Clean, distraction-free, utilitarian study workspace built for extended technical reading and KQL analysis.
  - *Color Palette & Mood (60-30-10 Distribution)*:
    - **60% Dominant Neutral Canvas**: Cool off-white main viewport (`#F8FAFC`) with crisp white cards (`#FFFFFF`) and subtle hairline borders (`#E2E8F0`).
    - **30% Structural Navigation & Contrast**: Dark navy sidebar (`#0F172A` with `#1E293B` active states and `#F8FAFC` text) containing the 10 navigation destinations.
    - **10% Restrained Blue & Semantic Accents**: Azure/Royal Blue primary interactive accent (`#0284C7` / `#2563EB`), paired with icon + text semantic indicators for Verified/Correct (`#16A34A` Emerald), Disputed/Needs Review/Unsure (`#D97706` Amber), and Incorrect/Error (`#DC2626` Crimson).
  - *Typography & Hierarchy (2+1 Font Rule)*:
    - **Display & Navigation**: `Plus Jakarta Sans` (SemiBold/Bold, `text-wrap: balance`).
    - **Body Prose & Scenarios**: `DM Sans` (Regular/Medium, 15px–16px, 1.6 line-height, 65–75ch measure).
    - **KQL Code, Schemas, Metrics & Timers**: `JetBrains Mono` with `font-variant-numeric: tabular-nums`.
  - *Component Styling & Layout*:
    - 260px dark navy sidebar on desktop (responsive drawer on tablet/mobile) + clean 3-zone top context header + single-elevation cards (`border border-slate-200 bg-white rounded-xl`).
    - Unboxed inline metadata with middot separators (`Domain 3 · KQL Hunting · Intermediate · Extraction: High · Verification: Verified`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Strict Private Document Handling & Explicit Gemini Transmission Consent**
  - *Chosen Approach*: Move any pre-supplied PDF out of `/public/assets/` into a private server-only directory (`.private_data/`) so it is never publicly downloadable as a static asset. Enforce strict file validation (PDF MIME/header check, 50MB size cap), clean up temporary buffers immediately, never log question text to console logs, and show an explicit disclosure banner before sending any PDF batch or question text to Gemini.
  - *Why*: Ensures the user's private study material is never exposed publicly while maintaining full transparency about server-side AI processing.

- **Decision 2: Dual Audit Trail (Extraction Confidence vs. Evidence-Based Verification)**
  - *Chosen Approach*: Store `extractionAudit` (`confidence`: High/Medium/Low, `missingFields`, `isUsable`, `sourcePage`, `pageImageCrop`) separately from `verificationAudit` (`status`: Verified/Disputed/Unverified/Needs Review, `officialUrl`, `documentedBehavior`, `verifiedDate`, `agreesWithOriginal`, `assumptionsOrAmbiguities`). Gemini verification calls use Google Search grounding restricted to official Microsoft documentation (`learn.microsoft.com`), and any claim without a valid supporting `learn.microsoft.com` citation is automatically downgraded to `Unverified` or `Needs Review`.
  - *Why*: Prevents AI hallucination or blind agreement with outdated exam dump keys, and ensures malformed extractions never pollute practice sessions or readiness scores.

- **Decision 3: First-Attempt Readiness & Spaced Repetition Scheduling**
  - *Chosen Approach*: Weight the readiness model heavily on **first-attempt accuracy** per topic, official domain weightings (42.5% / 37.5% / 20%), syllabus coverage breadth, and total unique questions attempted. Repeated retries of the same question improve the spaced-repetition mastery state and clear items from the "Due for Revision" queue, but cannot artificially inflate the primary readiness score. Low-confidence correct answers (`Guessed` or `Unsure`) are automatically scheduled for revision alongside incorrect answers.
  - *Why*: Accurately reflects true exam preparedness rather than rote memorization of repeated questions.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SC-200 EXAM GYM (Browser SPA)                        │
├──────────────────────┬───────────────────────────────────────────────────────┤
│  Dark Navy Sidebar   │               Main Content Viewport                   │
│  (10 Destinations)   │                                                       │
│  ├─ 1. Dashboard     │  ┌──────────────────────┐ ┌────────────────────────┐  │
│  ├─ 2. Practice      │  │ Honest Readiness &   │ │ Question & KQL Engine  │  │
│  ├─ 3. Exam Sim      │  │ Spaced Repetition    │ │ ├─ Interactive Widgets │  │
│  ├─ 4. Full Syllabus │  │ ├─ 1st-Attempt Model │ │ ├─ Confidence Selector │  │
│  ├─ 5. Weak Areas    │  │ ├─ Evidence & Caveat │ │ ├─ Evidence Audit Card │  │
│  ├─ 6. Bookmarks     │  │ └─ Due for Revision  │ │ ├─ KQL Schema & Sim    │  │
│  ├─ 7. Wrong Answers │  └──────────────────────┘ │ └─ Equivalent Q Gen    │  │
│  ├─ 8. Visual Learn  │  ┌──────────────────────┐ └────────────────────────┘  │
│  ├─ 9. Import PDF    │  │ Visual Learning Hub  │ ┌────────────────────────┐  │
│  └─ 10. Settings     │  │ ├─ Verified Portal   │ │ Audited PDF Importer   │  │
│                      │  │    Paths (w/ Links)  │ │ ├─ Privacy Disclosure  │  │
│                      │  │ └─ Conceptual Flows  │ │ ├─ Extraction vs Verif │  │
│                      │  └──────────────────────┘ │ └─ Manual Review Queue │  │
│                      │                           └────────────────────────┘  │
├──────────────────────┴───────────────────────────────────────────────────────┤
│               Local-First Persistence Layer (IndexedDB Store)                │
│  [questions] [attempts] [spacedRepetition] [syllabus] [importJobs] [settings]│
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ REST API (/api/*)
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                 Node.js / Express Server Runtime (Private)                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  ├─ Private Storage (.private_data/) — Never publicly served via /public     │
│  ├─ POST /api/pdf/import-batch                                               │
│  │    Validates PDF, extracts page text/images, calls Gemini with strict     │
│  │    extraction audit schema (never guesses missing options or answers)     │
│  ├─ POST /api/questions/verify                                               │
│  │    Uses Gemini + Google Search grounding (learn.microsoft.com) to verify  │
│  │    documented behavior, citation URLs, agreement, and licensing notes     │
│  ├─ POST /api/questions/generate-equivalent                                  │
│  │    Generates fresh scenario/KQL question testing the same core concept    │
│  ├─ POST /api/syllabus/refresh                                               │
│  │    Retrieves latest official SC-200 study guide & flags affected items    │
│  └─ POST /api/privacy/delete-private-pdf                                     │
│       Removes server-side private PDF copies & temporary buffers             │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **`Question`**:
    - Core: `id`, `fingerprint` (normalized text hash for deduplication), `source` (`Imported` | `Original Practice` | `Official Resource Reference`), `type`, `domainId`, `topicId`, `subtopic`, `difficulty`, `stem`, `caseStudyContext`, `exhibit`, `options`, `interactiveSlots`.
    - Extraction Audit: `sourcePage`, `originalQuestionNumber`, `originalAnswerKey`, `extractionConfidence` (`high` | `medium` | `low`), `missingOrAmbiguousFields` (array), `isUsable` (boolean — `false` if any required part is missing or unparsed).
    - Verification Audit: `verifiedAnswerKey`, `verificationStatus` (`verified` | `disputed` | `unverified` | `needs_review`), `agreesWithOriginal` (boolean | null), `documentedBehavior`, `disagreementExplanation`, `knownAmbiguitiesOrAssumptions`, `verifiedDate`, `officialReferences` (array of `{ title, url, snippet, lastUpdated }`).
    - Learning & KQL Content: `explanation` (`whyCorrect`, `whyOthersIncorrect`, `examTip`), `kqlLearning` (`tableSchemas`, `operatorBreakdown`, `simulatedOutputTable`, `commonMistakes`), `visualWalkthrough` (`isVerifiedPortalPath`, `portalName`, `steps`, `officialDocUrl`, `conceptualNote`).
  - **`UserAttempt & SpacedRepetitionItem`**:
    - `questionId`, `attemptNumber`, `isFirstAttempt`, `selectedAnswer`, `isCorrect`, `partialScore`, `confidence` (`guessed` | `unsure` | `confident` | `unrated`), `timeSpentSeconds`, `timestamp`.
    - Spaced Repetition state: `easeFactor`, `intervalDays`, `nextReviewDate`, `consecutiveConfidentCorrect`, `needsConceptTransferTest`.

- **Phased Implementation & Acceptance Gates**:
  - **Phase 1 — Core Foundation**: Functional Readiness Dashboard, complete official SC-200 Syllabus tree with progress indicators, core Question Engine (all 7 interactive question types), immediate answer feedback, and IndexedDB persistence.
  - **Phase 2 — Private Resumable PDF Import & Review Queue**: Move supplied PDF out of `/public/` to private server storage, implement batch PDF text/image extraction with Gemini, duplicate detection, extraction confidence tracking, and the interactive Manual Review & Correction Queue.
  - **Phase 3 — Evidence-Based Verification, KQL Deep Learning & Visual Walkthroughs**: Official Microsoft Learn citation verification, KQL table schemas + operator breakdowns + labeled Simulated Outputs, progressive KQL exercises, and interactive Portal Navigation vs. Conceptual Workflow SVG diagrams.
  - **Phase 4 — Exam Simulation, Focus Mode, Spaced Repetition & Honest Readiness**: Timed 100-minute Exam Simulation, adaptive Focus Mode, post-answer confidence tracking (`Guessed` / `Unsure` / `Confident`), Equivalent Question generation, and the first-attempt weighted Readiness & Weak-Area analytics engine.
  - **Phase 5 — Privacy Controls, Backup/Restore, Accessibility & Acceptance Verification**: Working Delete Imported Bank & Clear Local Progress actions with transparent disclosures, JSON export/import, keyboard accessibility, error resilience, and verification against all 18 acceptance criteria.
