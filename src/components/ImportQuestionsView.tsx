import React, { useState, useEffect, useRef } from 'react';
import {
  Question,
  ImportJobState,
  ImportReviewItem,
} from '../types';
import { normalizeFingerprint } from '../services/db';
import {
  Upload,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Eye,
  Check,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface ImportQuestionsViewProps {
  questions: Question[];
  importJob: ImportJobState;
  reviewQueue: ImportReviewItem[];
  geminiConsentGranted: boolean;
  onUpdateConsent: (consented: boolean) => void;
  onSaveBatchResults: (
    newQuestions: Question[],
    newReviewItems: ImportReviewItem[],
    nextJobState: ImportJobState
  ) => void;
  onApproveReviewItem: (
    reviewItemId: string,
    approvedQuestion: Question
  ) => void;
  onDiscardReviewItem: (reviewItemId: string) => void;
}

export const ImportQuestionsView: React.FC<ImportQuestionsViewProps> = ({
  questions,
  importJob,
  reviewQueue,
  geminiConsentGranted,
  onUpdateConsent,
  onSaveBatchResults,
  onApproveReviewItem,
  onDiscardReviewItem,
}) => {
  const [serverPdfInfo, setServerPdfInfo] = useState<{
    available: boolean;
    fileName: string | null;
    totalPages: number;
    fileSizeBytes: number;
    storageLocation: string;
  } | null>(null);

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [customStartPage, setCustomStartPage] = useState<number>(
    importJob.lastCompletedPage + 1
  );

  const [fullScanning, setFullScanning] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const REVIEW_PAGE_SIZE = 10;

  // Manual review editor state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editStem, setEditStem] = useState<string>('');
  const [editAnswerKey, setEditAnswerKey] = useState<string>('A');
  const [previewPdfPage, setPreviewPdfPage] = useState<number | null>(null);

  const autoRunRef = useRef<boolean>(false);

  const fetchPdfStatus = async () => {
    try {
      const res = await fetch('/api/pdf/status');
      const data = await res.json();
      setServerPdfInfo(data);
    } catch {
      // Ignore transient error
    }
  };

  useEffect(() => {
    fetchPdfStatus();
  }, []);

  useEffect(() => {
    setCustomStartPage(Math.min(importJob.totalPages, importJob.lastCompletedPage + 1));
  }, [importJob.lastCompletedPage, importJob.totalPages]);

  const handleFullTextScanAllPages = async () => {
    setFullScanning(true);
    setBatchError(null);
    try {
      const res = await fetch('/api/pdf/extract-all-text', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Full PDF text scan failed');
      }

      const existingFingerprints = new Set(
        questions.map((q) => q.fingerprint || normalizeFingerprint(q.stem))
      );
      const existingReviewIds = new Set(reviewQueue.map((r) => r.id));

      const newUsable: Question[] = [];
      let duplicates = 0;
      for (const q of (data.usableQuestions || []) as Question[]) {
        const fp = q.fingerprint || normalizeFingerprint(q.stem);
        if (existingFingerprints.has(fp)) {
          duplicates += 1;
          continue;
        }
        existingFingerprints.add(fp);
        newUsable.push(q);
      }

      const newReviews: ImportReviewItem[] = [];
      for (const r of (data.reviewItems || []) as ImportReviewItem[]) {
        if (!existingReviewIds.has(r.id)) {
          existingReviewIds.add(r.id);
          newReviews.push(r);
        }
      }

      const totalPages = data.totalPages || serverPdfInfo?.totalPages || 357;
      const nextJobState: ImportJobState = {
        ...importJob,
        fileName: data.fileName || importJob.fileName,
        totalPages,
        processedPages: totalPages,
        lastCompletedPage: totalPages,
        currentBatch: Math.ceil(totalPages / importJob.batchSize),
        totalBatches: Math.ceil(totalPages / importJob.batchSize),
        discoveredCount: data.discoveredTotal || 484,
        importedUsableCount:
          questions.filter((q) => q.source === 'Imported').length + newUsable.length,
        duplicateCount: importJob.duplicateCount + duplicates,
        needsReviewCount: reviewQueue.length + newReviews.length,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      };

      onSaveBatchResults(newUsable, newReviews, nextJobState);
    } catch (err: any) {
      setBatchError(err?.message || 'Failed to scan full PDF.');
    } finally {
      setFullScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('pdfFile', file);
      const res = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload validation failed');
      }
      await fetchPdfStatus();
      const resetJob: ImportJobState = {
        ...importJob,
        fileName: data.fileName,
        totalPages: data.totalPages,
        processedPages: 0,
        lastCompletedPage: 0,
        currentBatch: 0,
        totalBatches: Math.ceil(data.totalPages / importJob.batchSize),
        status: 'idle',
        updatedAt: new Date().toISOString(),
      };
      onSaveBatchResults([], [], resetJob);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload PDF.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const processSingleBatch = async (startPageOverride?: number): Promise<boolean> => {
    if (!geminiConsentGranted) {
      setBatchError(
        'Please check the Gemini API processing consent box above before running PDF extraction batches.'
      );
      return false;
    }

    const totalPages = serverPdfInfo?.totalPages || importJob.totalPages || 357;
    const startPage =
      startPageOverride ?? Math.max(1, importJob.lastCompletedPage + 1);
    if (startPage > totalPages) {
      return false;
    }
    const endPage = Math.min(totalPages, startPage + importJob.batchSize - 1);

    setBatchProcessing(true);
    setBatchError(null);

    try {
      const res = await fetch('/api/pdf/import-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startPage,
          endPage,
          userConsented: geminiConsentGranted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Batch extraction failed');
      }

      const existingFingerprints = new Set(
        questions.map((q) => q.fingerprint || normalizeFingerprint(q.stem))
      );

      const newUsableQuestions: Question[] = [];
      const newReviewItems: ImportReviewItem[] = [];
      let duplicateIncrement = 0;

      for (const item of data.extractedItems || []) {
        const fp = normalizeFingerprint(item.stem || '');
        if (existingFingerprints.has(fp)) {
          duplicateIncrement += 1;
          continue;
        }
        existingFingerprints.add(fp);

        const validOptions =
          Array.isArray(item.options) && item.options.length >= 2
            ? item.options
            : [
                { id: 'A', label: 'A', text: 'Option A (Requires manual check)' },
                { id: 'B', label: 'B', text: 'Option B (Requires manual check)' },
              ];

        const isCompleteAndUsable =
          Boolean(item.isUsable) &&
          item.extractionConfidence !== 'low' &&
          Boolean(item.originalAnswerKey) &&
          (!item.missingOrAmbiguousFields ||
            item.missingOrAmbiguousFields.length === 0);

        if (!isCompleteAndUsable) {
          newReviewItems.push({
            id: `rev-p${item.sourcePage}-q${item.originalQuestionNumber}-${Date.now()}`,
            sourceFileName: data.fileName || importJob.fileName,
            sourcePage: item.sourcePage || startPage,
            originalQuestionNumber: String(item.originalQuestionNumber || '?'),
            rawStem: item.stem || 'Incomplete question stem on page',
            detectedType: item.type || 'single_choice',
            missingOrAmbiguousFields:
              item.missingOrAmbiguousFields?.length > 0
                ? item.missingOrAmbiguousFields
                : ['Low extraction confidence or missing options/answer key'],
            originalAnswerKeyRaw: String(item.originalAnswerKey || 'Missing'),
            extractionConfidence: item.extractionConfidence || 'low',
            suggestedDomainId:
              item.domainId === 1 || item.domainId === 2 || item.domainId === 3
                ? item.domainId
                : 1,
            suggestedTopicId: item.topicId || 'd1-t1',
            optionsDraft: validOptions,
            status: 'pending_review',
            createdAt: new Date().toISOString(),
          });
        } else {
          const hasValidMsLearnUrl =
            typeof item.officialDocUrl === 'string' &&
            item.officialDocUrl.startsWith('https://learn.microsoft.com');

          newUsableQuestions.push({
            id: `q-imp-p${item.sourcePage}-q${item.originalQuestionNumber}-${Date.now()}`,
            fingerprint: fp,
            source: 'Imported',
            type: 'single_choice',
            domainId:
              item.domainId === 1 || item.domainId === 2 || item.domainId === 3
                ? item.domainId
                : 1,
            topicId: item.topicId || 'd1-t1',
            subtopic: item.subtopic || 'Imported SC-200 Objective',
            difficulty:
              item.difficulty === 'Easy' ||
              item.difficulty === 'Intermediate' ||
              item.difficulty === 'Difficult'
                ? item.difficulty
                : 'Intermediate',
            stem: item.stem,
            scenarioContext: `Imported from ${data.fileName} (Page ${item.sourcePage}, Question #${item.originalQuestionNumber})`,
            options: validOptions,
            originalAnswerKey: item.originalAnswerKey,
            verifiedAnswerKey: item.verifiedAnswerKey || item.originalAnswerKey,
            extractionAudit: {
              confidence: item.extractionConfidence || 'high',
              sourceFileName: data.fileName || importJob.fileName,
              sourcePage: item.sourcePage || startPage,
              originalQuestionNumber: String(item.originalQuestionNumber),
              originalAnswerKey: item.originalAnswerKey,
              missingOrAmbiguousFields: [],
              isUsable: true,
              extractedAt: new Date().toISOString(),
            },
            verificationAudit: {
              status:
                item.verificationStatus === 'verified' && hasValidMsLearnUrl
                  ? 'verified'
                  : item.verificationStatus === 'disputed'
                  ? 'disputed'
                  : 'unverified',
              verifiedAnswerKey: item.verifiedAnswerKey || item.originalAnswerKey,
              agreesWithOriginal: Boolean(item.agreesWithOriginal),
              documentedBehavior: item.documentedBehavior,
              disagreementExplanation: item.disagreementExplanation || undefined,
              verifiedDate: new Date().toISOString().slice(0, 10),
              officialReferences: hasValidMsLearnUrl
                ? [
                    {
                      title:
                        item.officialDocTitle || 'Microsoft Learn Documentation',
                      url: item.officialDocUrl,
                    },
                  ]
                : [],
            },
            explanation: {
              whyCorrect: item.whyCorrect,
              whyOthersIncorrect: {},
              examTip: item.examTip,
            },
          });
        }
      }

      const pagesInThisBatch = endPage - startPage + 1;
      const nextJobState: ImportJobState = {
        ...importJob,
        fileName: data.fileName || importJob.fileName,
        totalPages,
        processedPages: Math.min(
          totalPages,
          importJob.processedPages + pagesInThisBatch
        ),
        lastCompletedPage: endPage,
        currentBatch: Math.ceil(endPage / importJob.batchSize),
        totalBatches: Math.ceil(totalPages / importJob.batchSize),
        discoveredCount:
          importJob.discoveredCount + (data.extractedItems?.length || 0),
        importedUsableCount:
          importJob.importedUsableCount + newUsableQuestions.length,
        duplicateCount: importJob.duplicateCount + duplicateIncrement,
        needsReviewCount: importJob.needsReviewCount + newReviewItems.length,
        status: endPage >= totalPages ? 'completed' : 'paused',
        lastError: undefined,
        updatedAt: new Date().toISOString(),
        userConsentedToGeminiProcessing: geminiConsentGranted,
      };

      onSaveBatchResults(newUsableQuestions, newReviewItems, nextJobState);
      return endPage < totalPages;
    } catch (err: any) {
      setBatchError(err?.message || 'Batch processing failed.');
      return false;
    } finally {
      setBatchProcessing(false);
    }
  };

  // Auto-run loop
  useEffect(() => {
    autoRunRef.current = autoRunning;
    if (!autoRunning) return;

    let cancelled = false;
    const loop = async () => {
      while (!cancelled && autoRunRef.current) {
        const hasMore = await processSingleBatch();
        if (!hasMore) {
          setAutoRunning(false);
          break;
        }
        await new Promise((r) => setTimeout(r, 800));
      }
    };
    loop();
    return () => {
      cancelled = true;
    };
  }, [autoRunning, importJob.lastCompletedPage]);

  const pendingReviewItems = reviewQueue.filter(
    (r) => r.status === 'pending_review'
  );
  const totalReviewPages = Math.max(
    1,
    Math.ceil(pendingReviewItems.length / REVIEW_PAGE_SIZE)
  );
  const paginatedReviewItems = pendingReviewItems.slice(
    (reviewPage - 1) * REVIEW_PAGE_SIZE,
    reviewPage * REVIEW_PAGE_SIZE
  );

  const startEditingReviewItem = (item: ImportReviewItem) => {
    setEditingReviewId(item.id);
    setEditStem(item.rawStem);
    setEditAnswerKey(item.originalAnswerKeyRaw || 'A');
    setPreviewPdfPage(item.sourcePage);
  };

  const handleSaveManualCorrection = (item: ImportReviewItem) => {
    const approvedQuestion: Question = {
      id: `q-imp-manual-${Date.now()}`,
      fingerprint: normalizeFingerprint(editStem),
      source: 'Imported',
      type: 'single_choice',
      domainId: item.suggestedDomainId,
      topicId: item.suggestedTopicId,
      subtopic: 'Manually Verified PDF Import',
      difficulty: 'Intermediate',
      stem: editStem,
      scenarioContext: `Imported & manually verified from ${item.sourceFileName} (Page ${item.sourcePage}, Question #${item.originalQuestionNumber})`,
      options: item.optionsDraft,
      originalAnswerKey: editAnswerKey,
      verifiedAnswerKey: editAnswerKey,
      extractionAudit: {
        confidence: 'high',
        sourceFileName: item.sourceFileName,
        sourcePage: item.sourcePage,
        originalQuestionNumber: item.originalQuestionNumber,
        originalAnswerKey: editAnswerKey,
        missingOrAmbiguousFields: [],
        isUsable: true,
        adaptationNote: 'Manually corrected and approved from Import Review Queue.',
        extractedAt: new Date().toISOString(),
      },
      verificationAudit: {
        status: 'unverified',
        verifiedAnswerKey: editAnswerKey,
        agreesWithOriginal: true,
        documentedBehavior:
          'Manually approved from PDF review queue. Use "Verify with Microsoft Learn" during practice to retrieve official citations.',
        verifiedDate: new Date().toISOString().slice(0, 10),
        officialReferences: [],
      },
      explanation: {
        whyCorrect: `Approved answer key (${editAnswerKey}) from page ${item.sourcePage}.`,
        whyOthersIncorrect: {},
        examTip: 'Click "Re-Verify Against Live Microsoft Learn" in Practice Mode to enrich this question with full citations.',
      },
    };

    onApproveReviewItem(item.id, approvedQuestion);
    setEditingReviewId(null);
  };

  const progressPct = Math.min(
    100,
    Math.round(
      ((importJob.lastCompletedPage || 0) /
        Math.max(1, serverPdfInfo?.totalPages || importJob.totalPages)) *
        100
    )
  );

  return (
    <div className="space-y-6">
      {/* Header & Private Storage Verification */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Private Local-First PDF Import Pipeline · Never Publicly Served</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Import & Audit SC-200 PDF Question Bank
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl">
              Process your 357-page <code>sc-200-questions-answers-only.pdf</code> (484 total questions: 280 complete text questions + 204 image/hotspot questions). Use Instant Local Text Scan to load all 280 text questions immediately, or run Gemini Multimodal Batches for image-based questions.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer transition-colors shrink-0">
            <Upload className="w-4 h-4 text-sky-600" />
            <span>{uploadingPdf ? 'Validating PDF...' : 'Upload Another PDF'}</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {uploadError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {uploadError}
          </div>
        )}

        {/* Active Private File Status + Privacy Consent */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-6 p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Active Private Document on Server</span>
            </div>
            {serverPdfInfo?.available ? (
              <div className="space-y-1 text-xs text-slate-600">
                <div>
                  File: <strong className="text-slate-900 font-mono">{serverPdfInfo.fileName}</strong>
                </div>
                <div>
                  Pages: <strong className="text-slate-900 font-mono tabular-nums">{serverPdfInfo.totalPages} pages · 484 Questions</strong> ({Math.round(serverPdfInfo.fileSizeBytes / 1024 / 1024 * 10) / 10} MB)
                </div>
                <div>
                  Storage: <span className="text-emerald-700 font-medium">{serverPdfInfo.storageLocation}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-800">
                No private PDF currently stored on server. Use "Upload Another PDF" above to select a PDF file.
              </div>
            )}
          </div>

          <div className="lg:col-span-6 p-4 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-sky-950">
                External AI Processing Transparency & Consent
              </div>
              <p className="text-xs text-sky-900 leading-relaxed">
                Local text extraction runs 100% on your private server without external calls. Extracting embedded hotspot/KQL images via Gemini Multimodal Batches transmits the selected 3-page slice to the server-side Gemini API.
              </p>
            </div>
            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-900 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={geminiConsentGranted}
                onChange={(e) => onUpdateConsent(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>
                I understand and authorize sending PDF page batches to server-side Gemini for multimodal image extraction & verification
              </span>
            </label>
          </div>
        </div>

        {/* Batch Progress & Actual Counts */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-800">
              PDF Scan Progress: Page {importJob.lastCompletedPage} of{' '}
              {serverPdfInfo?.totalPages || importJob.totalPages} ({progressPct}%)
            </span>
            <span className="font-mono text-slate-500 tabular-nums">
              Batch {importJob.currentBatch} of {importJob.totalBatches} ({importJob.batchSize} pages/batch)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-600 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* 5 Honest Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500">Discovered in PDF</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {importJob.discoveredCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500">Usable Imported</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                {questions.filter((q) => q.source === 'Imported' && q.extractionAudit.isUsable).length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500">Duplicates Skipped</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-700">
                {importJob.duplicateCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500">Image Qs in Review Queue</div>
              <div className="text-lg font-bold font-mono tabular-nums text-amber-700">
                {pendingReviewItems.length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500">Total Active Bank</div>
              <div className="text-lg font-bold font-mono tabular-nums text-sky-700">
                {questions.filter((q) => q.extractionAudit.isUsable).length}
              </div>
            </div>
          </div>

          {batchError && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-4">
              <span>{batchError}</span>
              <button
                type="button"
                onClick={() => processSingleBatch()}
                className="px-3 py-1 bg-rose-700 text-white rounded-md font-medium shrink-0"
              >
                Retry Batch
              </button>
            </div>
          )}

          {/* Batch Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={fullScanning || batchProcessing || !serverPdfInfo?.available}
                onClick={handleFullTextScanAllPages}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                {fullScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning All 357 Pages Locally...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Instant Scan All 357 Pages (Load All 280 Text Qs + 204 Image Review Items)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={batchProcessing || autoRunning || !serverPdfInfo?.available}
                onClick={() => processSingleBatch()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 transition-colors"
              >
                {batchProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      Extracting Pages {importJob.lastCompletedPage + 1}–
                      {Math.min(
                        importJob.totalPages,
                        importJob.lastCompletedPage + importJob.batchSize
                      )}
                      ...
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      Gemini Multimodal Batch (Pages {Math.min(importJob.totalPages, importJob.lastCompletedPage + 1)}–
                      {Math.min(
                        importJob.totalPages,
                        importJob.lastCompletedPage + importJob.batchSize
                      )}
                      )
                    </span>
                  </>
                )}
              </button>

              {!autoRunning ? (
                <button
                  type="button"
                  disabled={batchProcessing || !serverPdfInfo?.available}
                  onClick={() => setAutoRunning(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Auto-Run Gemini Batches</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAutoRunning(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Continuous Import</span>
                </button>
              )}
            </div>

            {/* Jump to specific page range */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">Gemini extract page:</span>
              <input
                type="number"
                min={1}
                max={serverPdfInfo?.totalPages || 357}
                value={customStartPage}
                onChange={(e) => setCustomStartPage(Number(e.target.value))}
                className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums"
              />
              <button
                type="button"
                disabled={batchProcessing || autoRunning || !serverPdfInfo?.available}
                onClick={() => processSingleBatch(customStartPage)}
                className="px-3 py-1.5 font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 disabled:opacity-40"
              >
                Extract Page {customStartPage}–{Math.min(serverPdfInfo?.totalPages || 357, customStartPage + 2)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Review & Correction Queue */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>Zero Silent Guessing Policy · Held Back from Readiness & Practice Counts</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Import Review & Manual Correction Queue ({pendingReviewItems.length})
            </h3>
            <p className="text-xs text-slate-600">
              Questions with hotspot/drag-and-drop images, cropped exhibits, or missing text options are placed here instead of guessing. Inspect the original PDF page and complete the fields (or run Gemini Multimodal Extract on that page) to promote a question into your usable bank.
            </p>
          </div>

          {pendingReviewItems.length > REVIEW_PAGE_SIZE && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={reviewPage <= 1}
                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="font-mono text-slate-600">
                Page {reviewPage} of {totalReviewPages}
              </span>
              <button
                type="button"
                disabled={reviewPage >= totalReviewPages}
                onClick={() => setReviewPage((p) => Math.min(totalReviewPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {pendingReviewItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/70">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
            No pending extraction failures in the review queue.
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedReviewItems.map((item) => {
              const isEditing = editingReviewId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-mono text-amber-900">
                      <span className="font-semibold">
                        PDF Page {item.sourcePage} · Question #{item.originalQuestionNumber}
                      </span>
                      <span>·</span>
                      <span>Extraction Confidence: {item.extractionConfidence.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPdfPage(
                            previewPdfPage === item.sourcePage ? null : item.sourcePage
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {previewPdfPage === item.sourcePage
                            ? 'Hide Page Preview'
                            : `Inspect Page ${item.sourcePage}`}
                        </span>
                      </button>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEditingReviewItem(item)}
                          className="px-3 py-1 rounded-md bg-sky-600 text-white font-medium hover:bg-sky-700"
                        >
                          Manual Fix & Approve
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDiscardReviewItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Discard item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-800 whitespace-pre-line">{item.rawStem}</p>

                  <div className="text-xs text-rose-800 space-y-0.5">
                    <div className="font-semibold">Flagged Issues:</div>
                    <ul className="list-disc list-inside">
                      {item.missingOrAmbiguousFields.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  {previewPdfPage === item.sourcePage && (
                    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                      <iframe
                        title={`Review PDF Page ${item.sourcePage}`}
                        src={`/api/pdf/page/${item.sourcePage}`}
                        className="w-full h-[420px]"
                      />
                    </div>
                  )}

                  {isEditing && (
                    <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Corrected Question Stem
                        </label>
                        <textarea
                          rows={3}
                          value={editStem}
                          onChange={(e) => setEditStem(e.target.value)}
                          className="w-full p-2.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Verified Correct Option ID (A, B, C, or D)
                        </label>
                        <select
                          value={editAnswerKey}
                          onChange={(e) => setEditAnswerKey(e.target.value)}
                          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveManualCorrection(item)}
                          className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Promote to Usable Practice Bank</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReviewId(null)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
