import {
  Question,
  UserAttempt,
  SpacedRepetitionItem,
  SyllabusDomain,
  ImportJobState,
  ImportReviewItem,
  ExamSimulationResult,
  AppSettings,
} from '../types';
import { SEED_QUESTIONS, INITIAL_REVIEW_QUEUE_ITEMS } from '../data/seedQuestions';
import { INITIAL_SYLLABUS_DOMAINS } from '../data/syllabusData';

const DB_NAME = 'sc200_exam_gym_db_v1';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  practiceQuestionCount: 20,
  defaultStudyMode: 'practice',
  defaultDifficulty: 'All',
  defaultDomainId: 'All',
  examTimeLimitMinutes: 100,
  examQuestionCount: 50,
  randomizeQuestionOrder: false,
  repeatAnsweredQuestions: true,
  showVisualWalkthroughAutomaticallyOnWrong: true,
  geminiTransmissionConsentGranted: false,
};

export const DEFAULT_IMPORT_JOB: ImportJobState = {
  id: 'default-pdf-job',
  fileName: 'sc-200-questions-answers-only.pdf',
  totalPages: 357,
  processedPages: 18,
  lastCompletedPage: 18,
  batchSize: 3,
  currentBatch: 6,
  totalBatches: 119,
  discoveredCount: 8,
  importedUsableCount: 7,
  duplicateCount: 0,
  skippedCount: 0,
  needsReviewCount: 1,
  status: 'paused',
  updatedAt: new Date().toISOString(),
  userConsentedToGeminiProcessing: false,
};

export interface FullStudySnapshot {
  questions: Question[];
  attempts: UserAttempt[];
  bookmarks: string[];
  revisionTopics: string[];
  spacedRepetition: SpacedRepetitionItem[];
  syllabus: SyllabusDomain[];
  importJob: ImportJobState;
  reviewQueue: ImportReviewItem[];
  examSimulations: ExamSimulationResult[];
  settings: AppSettings;
  lastSyllabusRefreshDate: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getKV<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const store = tx.objectStore('kv');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function setKV<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadInitialSnapshot(): Promise<FullStudySnapshot> {
  const existingQuestions = await getKV<Question[]>('questions');
  if (!existingQuestions || existingQuestions.length === 0) {
    const initialSnapshot: FullStudySnapshot = {
      questions: SEED_QUESTIONS,
      attempts: [],
      bookmarks: ['q-imp-1', 'q-orig-301'],
      revisionTopics: ['d3-t1', 'd2-t2'],
      spacedRepetition: [],
      syllabus: INITIAL_SYLLABUS_DOMAINS,
      importJob: DEFAULT_IMPORT_JOB,
      reviewQueue: INITIAL_REVIEW_QUEUE_ITEMS,
      examSimulations: [],
      settings: DEFAULT_SETTINGS,
      lastSyllabusRefreshDate: '2026-10-26',
    };
    await saveFullSnapshot(initialSnapshot);
    return initialSnapshot;
  }

  const [
    attempts,
    bookmarks,
    revisionTopics,
    spacedRepetition,
    syllabus,
    importJob,
    reviewQueue,
    examSimulations,
    settings,
    lastSyllabusRefreshDate,
  ] = await Promise.all([
    getKV<UserAttempt[]>('attempts'),
    getKV<string[]>('bookmarks'),
    getKV<string[]>('revisionTopics'),
    getKV<SpacedRepetitionItem[]>('spacedRepetition'),
    getKV<SyllabusDomain[]>('syllabus'),
    getKV<ImportJobState>('importJob'),
    getKV<ImportReviewItem[]>('reviewQueue'),
    getKV<ExamSimulationResult[]>('examSimulations'),
    getKV<AppSettings>('settings'),
    getKV<string>('lastSyllabusRefreshDate'),
  ]);

  return {
    questions: existingQuestions,
    attempts: attempts || [],
    bookmarks: bookmarks || [],
    revisionTopics: revisionTopics || [],
    spacedRepetition: spacedRepetition || [],
    syllabus: syllabus || INITIAL_SYLLABUS_DOMAINS,
    importJob: importJob || DEFAULT_IMPORT_JOB,
    reviewQueue: reviewQueue || INITIAL_REVIEW_QUEUE_ITEMS,
    examSimulations: examSimulations || [],
    settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
    lastSyllabusRefreshDate: lastSyllabusRefreshDate || '2026-10-26',
  };
}

export async function saveFullSnapshot(snapshot: FullStudySnapshot): Promise<void> {
  await Promise.all([
    setKV('questions', snapshot.questions),
    setKV('attempts', snapshot.attempts),
    setKV('bookmarks', snapshot.bookmarks),
    setKV('revisionTopics', snapshot.revisionTopics),
    setKV('spacedRepetition', snapshot.spacedRepetition),
    setKV('syllabus', snapshot.syllabus),
    setKV('importJob', snapshot.importJob),
    setKV('reviewQueue', snapshot.reviewQueue),
    setKV('examSimulations', snapshot.examSimulations),
    setKV('settings', snapshot.settings),
    setKV('lastSyllabusRefreshDate', snapshot.lastSyllabusRefreshDate),
  ]);
}

export async function clearLocalProgressOnly(
  currentSnapshot: FullStudySnapshot
): Promise<FullStudySnapshot> {
  const nextSnapshot: FullStudySnapshot = {
    ...currentSnapshot,
    attempts: [],
    bookmarks: [],
    revisionTopics: [],
    spacedRepetition: [],
    examSimulations: [],
  };
  await saveFullSnapshot(nextSnapshot);
  return nextSnapshot;
}

export async function deleteImportedQuestionBank(
  currentSnapshot: FullStudySnapshot
): Promise<FullStudySnapshot> {
  const nonImportedQuestions = currentSnapshot.questions.filter(
    (q) => q.source !== 'Imported'
  );
  const validQuestionIds = new Set(nonImportedQuestions.map((q) => q.id));
  const nextSnapshot: FullStudySnapshot = {
    ...currentSnapshot,
    questions: nonImportedQuestions,
    attempts: currentSnapshot.attempts.filter((a) =>
      validQuestionIds.has(a.questionId)
    ),
    bookmarks: currentSnapshot.bookmarks.filter((id) =>
      validQuestionIds.has(id)
    ),
    spacedRepetition: currentSnapshot.spacedRepetition.filter((sr) =>
      validQuestionIds.has(sr.questionId)
    ),
    reviewQueue: [],
    importJob: {
      ...DEFAULT_IMPORT_JOB,
      processedPages: 0,
      lastCompletedPage: 0,
      currentBatch: 0,
      discoveredCount: 0,
      importedUsableCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      needsReviewCount: 0,
      status: 'idle',
      updatedAt: new Date().toISOString(),
    },
  };
  await saveFullSnapshot(nextSnapshot);
  return nextSnapshot;
}

export function normalizeFingerprint(stem: string): string {
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 96);
}
