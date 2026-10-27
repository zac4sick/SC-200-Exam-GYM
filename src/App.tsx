import React, { useState, useEffect, useMemo } from 'react';
import {
  NavigationTab,
  Question,
  Difficulty,
  QuestionSource,
  VerificationStatus,
  ConfidenceLevel,
  VerificationAudit,
  ImportJobState,
  ImportReviewItem,
  ExamSimulationResult,
  UserAttempt,
  AppSettings,
} from './types';
import {
  FullStudySnapshot,
  loadInitialSnapshot,
  saveFullSnapshot,
  clearLocalProgressOnly,
  deleteImportedQuestionBank,
  normalizeFingerprint,
} from './services/db';
import {
  computeReadinessReport,
  updateSpacedRepetitionItem,
  buildFocusModeQueue,
} from './services/readinessEngine';
import { DashboardView } from './components/DashboardView';
import { InteractiveQuestionView } from './components/InteractiveQuestionView';
import { ExamSimulationView } from './components/ExamSimulationView';
import { SyllabusAndWeakAreasView } from './components/SyllabusAndWeakAreasView';
import { BookmarksAndWrongAnswersView } from './components/BookmarksAndWrongAnswersView';
import { VisualLearningHubView } from './components/VisualLearningHubView';
import { ImportQuestionsView } from './components/ImportQuestionsView';
import { SettingsView } from './components/SettingsView';
import {
  LayoutDashboard,
  BookOpenCheck,
  Timer,
  ListTree,
  TrendingDown,
  Bookmark,
  XOctagon,
  Compass,
  FileUp,
  Settings,
  Search,
  Menu,
  X,
  Play,
  Sparkles,
  Shuffle,
} from 'lucide-react';

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = Math.floor((s / 4294967296) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export default function App() {
  const [snapshot, setSnapshot] = useState<FullStudySnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Practice View Filters & State
  const [practiceModeType, setPracticeModeType] = useState<'standard' | 'focus'>(
    'standard'
  );
  const [sessionLimit, setSessionLimit] = useState<'ALL' | 15 | 25 | 50 | 100>(
    'ALL'
  );
  const [isRandomized, setIsRandomized] = useState<boolean>(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<'All' | 1 | 2 | 3>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | Difficulty>(
    'All'
  );
  const [sourceFilter, setSourceFilter] = useState<'All' | QuestionSource>(
    'All'
  );
  const [verificationFilter, setVerificationFilter] = useState<
    'All' | VerificationStatus
  >('All');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Load persisted IndexedDB state on mount & auto-populate full PDF text bank if not yet imported
  useEffect(() => {
    loadInitialSnapshot().then(async (loaded) => {
      setSnapshot(loaded);

      // Automatically sync all 280+ text-extractable questions from the private PDF if only seed questions exist
      if (loaded.questions.length < 50) {
        try {
          const res = await fetch('/api/pdf/extract-all-text', {
            method: 'POST',
          });
          if (res.ok) {
            const data = await res.json();
            const existingFps = new Set(
              loaded.questions.map(
                (q) => q.fingerprint || normalizeFingerprint(q.stem)
              )
            );
            const existingRevIds = new Set(loaded.reviewQueue.map((r) => r.id));

            const addedQuestions: Question[] = [];
            let dupCount = 0;
            for (const q of (data.usableQuestions || []) as Question[]) {
              const fp = q.fingerprint || normalizeFingerprint(q.stem);
              if (existingFps.has(fp)) {
                dupCount += 1;
                continue;
              }
              existingFps.add(fp);
              addedQuestions.push(q);
            }

            const addedReviews: ImportReviewItem[] = [];
            for (const r of (data.reviewItems || []) as ImportReviewItem[]) {
              if (!existingRevIds.has(r.id)) {
                existingRevIds.add(r.id);
                addedReviews.push(r);
              }
            }

            if (addedQuestions.length > 0 || addedReviews.length > 0) {
              const totalPages = data.totalPages || 357;
              const enriched: FullStudySnapshot = {
                ...loaded,
                questions: [...loaded.questions, ...addedQuestions],
                reviewQueue: [...loaded.reviewQueue, ...addedReviews],
                importJob: {
                  ...loaded.importJob,
                  fileName: data.fileName || loaded.importJob.fileName,
                  totalPages,
                  processedPages: totalPages,
                  lastCompletedPage: totalPages,
                  currentBatch: Math.ceil(
                    totalPages / loaded.importJob.batchSize
                  ),
                  totalBatches: Math.ceil(
                    totalPages / loaded.importJob.batchSize
                  ),
                  discoveredCount: data.discoveredTotal || 484,
                  importedUsableCount: addedQuestions.length,
                  duplicateCount: dupCount,
                  needsReviewCount:
                    loaded.reviewQueue.length + addedReviews.length,
                  status: 'completed',
                  updatedAt: new Date().toISOString(),
                },
              };
              setSnapshot(enriched);
              await saveFullSnapshot(enriched);
            }
          }
        } catch {
          // Keep initial snapshot if server is still warming up
        }
      }
    });
  }, []);

  // Persist changes to IndexedDB
  const updateSnapshot = (updater: (prev: FullStudySnapshot) => FullStudySnapshot) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveFullSnapshot(next).catch(() => {});
      return next;
    });
  };

  // Readiness report calculation
  const readinessReport = useMemo(() => {
    if (!snapshot) return null;
    return computeReadinessReport(
      snapshot.questions,
      snapshot.attempts,
      snapshot.spacedRepetition,
      snapshot.syllabus
    );
  }, [snapshot]);

  // Usable questions pool
  const usableQuestions = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.questions.filter((q) => q.extractionAudit.isUsable);
  }, [snapshot]);

  // Total matching questions before session limit slice
  const matchingPoolQuestions = useMemo(() => {
    if (!snapshot || !readinessReport) return [];
    if (practiceModeType === 'focus') {
      const maxFocus =
        sessionLimit === 'ALL' ? usableQuestions.length : sessionLimit;
      return buildFocusModeQueue(
        usableQuestions,
        snapshot.attempts,
        snapshot.spacedRepetition,
        readinessReport.topicMetrics,
        maxFocus
      );
    }

    const qLower = searchQuery.trim().toLowerCase();
    const answeredIds = new Set(snapshot.attempts.map((a) => a.questionId));

    return usableQuestions.filter((q) => {
      if (
        !snapshot.settings.repeatAnsweredQuestions &&
        answeredIds.has(q.id)
      ) {
        return false;
      }
      if (domainFilter !== 'All' && q.domainId !== domainFilter) return false;
      if (topicFilter !== 'All' && q.topicId !== topicFilter) return false;
      if (difficultyFilter !== 'All' && q.difficulty !== difficultyFilter)
        return false;
      if (sourceFilter !== 'All' && q.source !== sourceFilter) return false;
      if (
        verificationFilter !== 'All' &&
        q.verificationAudit.status !== verificationFilter
      )
        return false;
      if (qLower) {
        const hay = `${q.stem} ${q.subtopic} ${q.extractionAudit.originalQuestionNumber} ${
          q.kqlLearning?.completeQuery || ''
        }`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [
    snapshot,
    readinessReport,
    usableQuestions,
    practiceModeType,
    sessionLimit,
    searchQuery,
    domainFilter,
    topicFilter,
    difficultyFilter,
    sourceFilter,
    verificationFilter,
  ]);

  // Filtered Practice Question Queue (with optional shuffle and sessionLimit)
  const filteredPracticeQuestions = useMemo(() => {
    const ordered = isRandomized
      ? seededShuffle(matchingPoolQuestions, shuffleSeed)
      : matchingPoolQuestions;
    if (sessionLimit === 'ALL') {
      return ordered;
    }
    return ordered.slice(0, sessionLimit);
  }, [matchingPoolQuestions, isRandomized, shuffleSeed, sessionLimit]);

  // Keep currentQuestionIndex in bounds when filters change
  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [
    practiceModeType,
    sessionLimit,
    isRandomized,
    shuffleSeed,
    searchQuery,
    domainFilter,
    topicFilter,
    difficultyFilter,
    sourceFilter,
    verificationFilter,
  ]);

  if (!snapshot || !readinessReport) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="border border-slate-200 bg-white rounded-xl p-6 text-center space-y-2 max-w-sm w-full">
          <div className="text-sm font-bold text-slate-900 font-display">
            Loading SC-200 Exam Gym...
          </div>
          <div className="text-xs text-slate-500">
            Initializing local IndexedDB question bank & readiness engine
          </div>
        </div>
      </div>
    );
  }

  const allTopics = snapshot.syllabus.flatMap((d) => d.topics);

  // Handlers
  const handleRecordAttempt = (
    question: Question,
    selectedAnswer: string | string[] | Record<string, string>,
    isCorrect: boolean,
    partialScore: number,
    confidence: ConfidenceLevel,
    timeSpentSeconds: number
  ) => {
    updateSnapshot((prev) => {
      const hasPriorAttempt = prev.attempts.some(
        (a) => a.questionId === question.id
      );
      const newAttempt: UserAttempt = {
        id: `att-${Date.now()}`,
        questionId: question.id,
        timestamp: new Date().toISOString(),
        mode: practiceModeType === 'focus' ? 'focus' : 'practice',
        selectedAnswer,
        isCorrect,
        partialScore,
        confidence,
        timeSpentSeconds,
        isFirstAttempt: !hasPriorAttempt,
        domainId: question.domainId,
        topicId: question.topicId,
      };

      const existingSr = prev.spacedRepetition.find(
        (s) => s.questionId === question.id
      );
      const updatedSr = updateSpacedRepetitionItem(
        existingSr,
        question,
        isCorrect,
        confidence
      );
      const nextSrList = [
        ...prev.spacedRepetition.filter((s) => s.questionId !== question.id),
        updatedSr,
      ];

      return {
        ...prev,
        attempts: [...prev.attempts, newAttempt],
        spacedRepetition: nextSrList,
      };
    });
  };

  const handleUpdateConfidence = (
    question: Question,
    confidence: ConfidenceLevel
  ) => {
    updateSnapshot((prev) => {
      const nextAttempts = [...prev.attempts];
      for (let i = nextAttempts.length - 1; i >= 0; i--) {
        if (nextAttempts[i].questionId === question.id) {
          nextAttempts[i] = { ...nextAttempts[i], confidence };
          break;
        }
      }

      const lastAtt = nextAttempts
        .filter((a) => a.questionId === question.id)
        .slice(-1)[0];
      const existingSr = prev.spacedRepetition.find(
        (s) => s.questionId === question.id
      );
      const updatedSr = updateSpacedRepetitionItem(
        existingSr,
        question,
        lastAtt ? lastAtt.isCorrect : true,
        confidence
      );

      return {
        ...prev,
        attempts: nextAttempts,
        spacedRepetition: [
          ...prev.spacedRepetition.filter((s) => s.questionId !== question.id),
          updatedSr,
        ],
      };
    });
  };

  const handleToggleBookmark = (questionId: string) => {
    updateSnapshot((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks.includes(questionId)
        ? prev.bookmarks.filter((id) => id !== questionId)
        : [...prev.bookmarks, questionId],
    }));
  };

  const handleToggleRevisionTopic = (topicId: string) => {
    updateSnapshot((prev) => ({
      ...prev,
      revisionTopics: prev.revisionTopics.includes(topicId)
        ? prev.revisionTopics.filter((id) => id !== topicId)
        : [...prev.revisionTopics, topicId],
    }));
  };

  const handleUpdateQuestionVerification = (
    questionId: string,
    audit: VerificationAudit
  ) => {
    updateSnapshot((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              verifiedAnswerKey: audit.verifiedAnswerKey || q.verifiedAnswerKey,
              verificationAudit: audit,
            }
          : q
      ),
    }));
  };

  const handleAddAndJumpToQuestion = (newQuestion: Question) => {
    updateSnapshot((prev) => ({
      ...prev,
      questions: [newQuestion, ...prev.questions],
    }));
    setPracticeModeType('standard');
    setSearchQuery('');
    setDomainFilter('All');
    setTopicFilter('All');
    setDifficultyFilter('All');
    setSourceFilter('All');
    setVerificationFilter('All');
    setCurrentQuestionIndex(0);
    setActiveTab('practice');
  };

  const handleStartFocusSession = () => {
    setPracticeModeType('focus');
    setCurrentQuestionIndex(0);
    setActiveTab('practice');
  };

  const handlePracticeTopic = (topicId: string) => {
    setPracticeModeType('standard');
    setSearchQuery('');
    setDomainFilter('All');
    setTopicFilter(topicId);
    setDifficultyFilter('All');
    setSourceFilter('All');
    setVerificationFilter('All');
    setCurrentQuestionIndex(0);
    setActiveTab('practice');
  };

  const handleJumpToQuestionById = (questionId: string) => {
    setPracticeModeType('standard');
    setSearchQuery('');
    setDomainFilter('All');
    setTopicFilter('All');
    setDifficultyFilter('All');
    setSourceFilter('All');
    setVerificationFilter('All');
    const idx = usableQuestions.findIndex((q) => q.id === questionId);
    setCurrentQuestionIndex(idx >= 0 ? idx : 0);
    setActiveTab('practice');
  };

  const handleSaveBatchResults = (
    newQuestions: Question[],
    newReviewItems: ImportReviewItem[],
    nextJobState: ImportJobState
  ) => {
    updateSnapshot((prev) => ({
      ...prev,
      questions: [...prev.questions, ...newQuestions],
      reviewQueue: [...prev.reviewQueue, ...newReviewItems],
      importJob: nextJobState,
    }));
  };

  const handleApproveReviewItem = (
    reviewItemId: string,
    approvedQuestion: Question
  ) => {
    updateSnapshot((prev) => ({
      ...prev,
      questions: [approvedQuestion, ...prev.questions],
      reviewQueue: prev.reviewQueue.map((r) =>
        r.id === reviewItemId ? { ...r, status: 'resolved' } : r
      ),
    }));
  };

  const handleDiscardReviewItem = (reviewItemId: string) => {
    updateSnapshot((prev) => ({
      ...prev,
      reviewQueue: prev.reviewQueue.map((r) =>
        r.id === reviewItemId ? { ...r, status: 'discarded' } : r
      ),
    }));
  };

  const handleSaveSimulationResult = (
    result: ExamSimulationResult,
    attemptsToRecord: UserAttempt[]
  ) => {
    updateSnapshot((prev) => {
      const priorIds = new Set(prev.attempts.map((a) => a.questionId));
      const enrichedAttempts = attemptsToRecord.map((a) => ({
        ...a,
        isFirstAttempt: !priorIds.has(a.questionId),
      }));
      return {
        ...prev,
        attempts: [...prev.attempts, ...enrichedAttempts],
        examSimulations: [result, ...prev.examSimulations],
      };
    });
  };

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'practice',
      label: 'Practice Questions',
      icon: <BookOpenCheck className="w-4 h-4" />,
      count: usableQuestions.length,
    },
    {
      id: 'exam',
      label: 'Exam Simulation',
      icon: <Timer className="w-4 h-4" />,
    },
    {
      id: 'syllabus',
      label: 'Full Syllabus',
      icon: <ListTree className="w-4 h-4" />,
    },
    {
      id: 'weak_areas',
      label: 'Weak Areas',
      icon: <TrendingDown className="w-4 h-4" />,
      count: readinessReport.dueForSpacedRepetitionCount || undefined,
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: <Bookmark className="w-4 h-4" />,
      count: snapshot.bookmarks.length || undefined,
    },
    {
      id: 'wrong_answers',
      label: 'Wrong Answers',
      icon: <XOctagon className="w-4 h-4" />,
      count:
        new Set(
          snapshot.attempts.filter((a) => !a.isCorrect).map((a) => a.questionId)
        ).size || undefined,
    },
    {
      id: 'visual_learning',
      label: 'Visual Learning',
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: 'import_questions',
      label: 'Import Questions',
      icon: <FileUp className="w-4 h-4" />,
      count:
        snapshot.reviewQueue.filter((r) => r.status === 'pending_review')
          .length || undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const activePracticeQuestion =
    filteredPracticeQuestions[currentQuestionIndex] ||
    filteredPracticeQuestions[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Dark Navy Left Sidebar (#0F172A) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Sidebar Brand Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className="text-left focus:outline-none"
            >
              <div className="text-base font-bold tracking-tight text-white font-display">
                SC-200 Exam Gym
              </div>
              <div className="text-xs text-slate-400">
                Security Operations Trainer
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 10 Primary Navigation Links */}
          <nav className="space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isActive ? 'text-sky-100' : 'text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Readiness Summary Footer */}
        <div className="p-4 m-3 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Practice Readiness</span>
            <span className="font-mono font-bold text-white tabular-nums">
              {readinessReport.hasSufficientEvidence
                ? `${readinessReport.overallReadinessScore}/100`
                : 'Collecting Data'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-all duration-200"
              style={{
                width: `${
                  readinessReport.hasSufficientEvidence
                    ? readinessReport.overallReadinessScore
                    : Math.min(
                        100,
                        Math.round(
                          (readinessReport.uniqueQuestionsAttempted /
                            readinessReport.minimumQuestionsRequired) *
                            100
                        )
                      )
                }%`,
              }}
            />
          </div>
          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
            {readinessReport.uniqueQuestionsAttempted} unique Qs ·{' '}
            {readinessReport.syllabusCoveragePercentage}% syllabus
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Strict 3-Zone Top Navigation Bar Contract */}
        <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-30">
          {/* Zone 1: Single-line Brand / Active Context Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-700"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-900 font-display whitespace-nowrap shrink-0">
              SC-200: Microsoft Security Operations Analyst
            </span>
          </div>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Readiness
            </button>
            <button
              type="button"
              onClick={() => {
                setPracticeModeType('standard');
                setActiveTab('practice');
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Practice Bank
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('visual_learning')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Visual & KQL Lab
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import_questions')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Import PDF
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleStartFocusSession}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Focus Mode</span>
            </button>
          </div>
        </header>

        {/* Main Viewport Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-6">
          {/* 1. DASHBOARD */}
          {activeTab === 'dashboard' && (
            <DashboardView
              report={readinessReport}
              lastSyllabusRefreshDate={snapshot.lastSyllabusRefreshDate}
              onStartRecommendedSession={handleStartFocusSession}
              onPracticeTopic={handlePracticeTopic}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 2. PRACTICE QUESTIONS (Standard & Focus Mode) */}
          {activeTab === 'practice' && (
            <div className="space-y-6">
              {/* Search & Filter Toolbar */}
              <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Segmented Mode Control */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPracticeModeType('standard')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        practiceModeType === 'standard'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Practice Questions ({usableQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPracticeModeType('focus')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        practiceModeType === 'focus'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>Adaptive Focus Mode (Weak Areas & Spaced Repetition)</span>
                    </button>
                  </div>

                  {/* Session Size, Randomize/Shuffle, and Quick Jump Controls */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Session Set Size Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Set Size:</span>
                      <select
                        value={sessionLimit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSessionLimit(
                            val === 'ALL'
                              ? 'ALL'
                              : (Number(val) as 15 | 25 | 50 | 100)
                          );
                        }}
                        aria-label="Session question count"
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-xs text-slate-800"
                      >
                        <option value="ALL">
                          All Matching ({matchingPoolQuestions.length} Questions)
                        </option>
                        <option value={15}>15 Questions per Set</option>
                        <option value={25}>25 Questions per Set</option>
                        <option value={50}>50 Questions per Set</option>
                        <option value={100}>100 Questions per Set</option>
                      </select>
                    </div>

                    {/* Randomize / Shuffle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isRandomized) {
                          setIsRandomized(true);
                          setShuffleSeed((s) => s + 1);
                        } else {
                          setShuffleSeed((s) => s + 1);
                        }
                        setCurrentQuestionIndex(0);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                        isRandomized
                          ? 'border-sky-600 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Shuffle question order randomly"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>{isRandomized ? 'Reshuffle Set' : 'Randomize Order'}</span>
                    </button>

                    {isRandomized && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRandomized(false);
                          setCurrentQuestionIndex(0);
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                        title="Restore sequential order"
                      >
                        Reset Order
                      </button>
                    )}

                    {/* Quick Question Selector Dropdown */}
                    {filteredPracticeQuestions.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Jump:</span>
                        <select
                          value={currentQuestionIndex}
                          onChange={(e) =>
                            setCurrentQuestionIndex(Number(e.target.value))
                          }
                          aria-label="Jump to question"
                          className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono text-xs text-slate-800 max-w-[230px] truncate"
                        >
                          {filteredPracticeQuestions.map((q, idx) => (
                            <option key={q.id} value={idx}>
                              #{idx + 1} [{q.source === 'Imported' ? `PDF Q${q.extractionAudit.originalQuestionNumber}` : q.source}] {q.stem.slice(0, 42)}...
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters Row (when in standard practice mode) */}
                {practiceModeType === 'standard' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                    <div className="lg:col-span-2 relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search KQL, tables, topics, Q#..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-600"
                      />
                    </div>

                    <select
                      value={domainFilter}
                      onChange={(e) =>
                        setDomainFilter(
                          e.target.value === 'All'
                            ? 'All'
                            : (Number(e.target.value) as 1 | 2 | 3)
                        )
                      }
                      aria-label="Filter by domain"
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                    >
                      <option value="All">Domain: All (1–3)</option>
                      <option value={1}>Domain 1: Manage SecOps (40–45%)</option>
                      <option value={2}>Domain 2: Respond Incidents (35–40%)</option>
                      <option value={3}>Domain 3: Threat Hunting (20–25%)</option>
                    </select>

                    <select
                      value={topicFilter}
                      onChange={(e) => setTopicFilter(e.target.value)}
                      aria-label="Filter by topic"
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                    >
                      <option value="All">Topic: All Objectives</option>
                      {allTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} {t.title.slice(0, 32)}...
                        </option>
                      ))}
                    </select>

                    <select
                      value={difficultyFilter}
                      onChange={(e) =>
                        setDifficultyFilter(e.target.value as 'All' | Difficulty)
                      }
                      aria-label="Filter by difficulty"
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                    >
                      <option value="All">Difficulty: All</option>
                      <option value="Easy">Easy</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Difficult">Difficult</option>
                    </select>

                    <select
                      value={sourceFilter}
                      onChange={(e) =>
                        setSourceFilter(e.target.value as 'All' | QuestionSource)
                      }
                      aria-label="Filter by question source"
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                    >
                      <option value="All">Source: All Sources</option>
                      <option value="Imported">Imported (PDF)</option>
                      <option value="Original Practice">Original Practice</option>
                      <option value="Official Resource Reference">
                        Official Resource Reference
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* Active Question Screen */}
              {activePracticeQuestion ? (
                <InteractiveQuestionView
                  question={activePracticeQuestion}
                  currentIndex={currentQuestionIndex}
                  totalQuestions={filteredPracticeQuestions.length}
                  isBookmarked={snapshot.bookmarks.includes(
                    activePracticeQuestion.id
                  )}
                  isTopicInRevisionList={snapshot.revisionTopics.includes(
                    activePracticeQuestion.topicId
                  )}
                  syllabus={snapshot.syllabus}
                  showVisualAutomaticallyOnWrong={
                    snapshot.settings.showVisualWalkthroughAutomaticallyOnWrong
                  }
                  onRecordAttempt={handleRecordAttempt}
                  onUpdateConfidence={handleUpdateConfidence}
                  onToggleBookmark={handleToggleBookmark}
                  onToggleRevisionTopic={handleToggleRevisionTopic}
                  onPrevious={() =>
                    setCurrentQuestionIndex((i) => Math.max(0, i - 1))
                  }
                  onNext={() =>
                    setCurrentQuestionIndex((i) =>
                      Math.min(filteredPracticeQuestions.length - 1, i + 1)
                    )
                  }
                  onRestartAndShuffle={() => {
                    setIsRandomized(true);
                    setShuffleSeed((s) => s + 1);
                    setCurrentQuestionIndex(0);
                  }}
                  onUpdateQuestionVerification={
                    handleUpdateQuestionVerification
                  }
                  onAddEquivalentQuestion={handleAddAndJumpToQuestion}
                />
              ) : (
                <div className="border border-slate-200 bg-white rounded-xl p-8 text-center space-y-3">
                  <div className="text-sm font-semibold text-slate-900">
                    No questions match your current filter selection.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDomainFilter('All');
                      setTopicFilter('All');
                      setDifficultyFilter('All');
                      setSourceFilter('All');
                      setVerificationFilter('All');
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. EXAM SIMULATION */}
          {activeTab === 'exam' && (
            <ExamSimulationView
              usableQuestions={usableQuestions}
              syllabus={snapshot.syllabus}
              defaultQuestionCount={snapshot.settings.examQuestionCount}
              defaultTimeLimitMinutes={snapshot.settings.examTimeLimitMinutes}
              pastSimulations={snapshot.examSimulations}
              onSaveSimulationResult={handleSaveSimulationResult}
            />
          )}

          {/* 4. FULL SYLLABUS & 5. WEAK AREAS */}
          {(activeTab === 'syllabus' || activeTab === 'weak_areas') && (
            <SyllabusAndWeakAreasView
              mode={activeTab}
              syllabus={snapshot.syllabus}
              report={readinessReport}
              lastSyllabusRefreshDate={snapshot.lastSyllabusRefreshDate}
              onPracticeTopic={handlePracticeTopic}
              onStartFocusSession={handleStartFocusSession}
              onUpdateSyllabusVerificationDate={(newDate) =>
                updateSnapshot((prev) => ({
                  ...prev,
                  lastSyllabusRefreshDate: newDate,
                }))
              }
              onAddGeneratedQuestion={handleAddAndJumpToQuestion}
            />
          )}

          {/* 6. BOOKMARKS & 7. WRONG ANSWERS */}
          {(activeTab === 'bookmarks' || activeTab === 'wrong_answers') && (
            <BookmarksAndWrongAnswersView
              mode={activeTab}
              questions={usableQuestions}
              attempts={snapshot.attempts}
              bookmarks={snapshot.bookmarks}
              revisionTopics={snapshot.revisionTopics}
              syllabus={snapshot.syllabus}
              onRetryQuestion={handleJumpToQuestionById}
              onPracticeTopic={handlePracticeTopic}
              onToggleBookmark={handleToggleBookmark}
              onToggleRevisionTopic={handleToggleRevisionTopic}
            />
          )}

          {/* 8. VISUAL LEARNING & PROGRESSIVE KQL LAB */}
          {activeTab === 'visual_learning' && (
            <VisualLearningHubView
              questions={usableQuestions}
              onJumpToQuestion={handleJumpToQuestionById}
            />
          )}

          {/* 9. IMPORT QUESTIONS */}
          {activeTab === 'import_questions' && (
            <ImportQuestionsView
              questions={snapshot.questions}
              importJob={snapshot.importJob}
              reviewQueue={snapshot.reviewQueue}
              geminiConsentGranted={
                snapshot.settings.geminiTransmissionConsentGranted
              }
              onUpdateConsent={(consented) =>
                updateSnapshot((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    geminiTransmissionConsentGranted: consented,
                  },
                }))
              }
              onSaveBatchResults={handleSaveBatchResults}
              onApproveReviewItem={handleApproveReviewItem}
              onDiscardReviewItem={handleDiscardReviewItem}
            />
          )}

          {/* 10. SETTINGS & PRIVACY */}
          {activeTab === 'settings' && (
            <SettingsView
              settings={snapshot.settings}
              fullSnapshot={snapshot}
              onUpdateSettings={(nextSettings: AppSettings) =>
                updateSnapshot((prev) => ({
                  ...prev,
                  settings: nextSettings,
                }))
              }
              onImportSnapshotJson={(imported: FullStudySnapshot) => {
                setSnapshot(imported);
                saveFullSnapshot(imported).catch(() => {});
              }}
              onClearLocalProgress={async () => {
                const cleared = await clearLocalProgressOnly(snapshot);
                setSnapshot(cleared);
              }}
              onDeleteImportedBankAndPrivatePdf={async () => {
                await fetch('/api/privacy/delete-private-pdf', {
                  method: 'POST',
                });
                const updated = await deleteImportedQuestionBank(snapshot);
                setSnapshot(updated);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
