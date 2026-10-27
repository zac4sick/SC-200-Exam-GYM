import React, { useState, useEffect, useRef } from 'react';
import {
  Question,
  ConfidenceLevel,
  SyllabusDomain,
  VerificationAudit,
} from '../types';
import { VisualWalkthroughDiagram } from './VisualWalkthroughDiagram';
import { KqlLearningPanel } from './KqlLearningPanel';
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  FileText,
  Lightbulb,
  BookOpen,
  ShieldAlert,
  Eye,
  PlusCircle,
  Check,
} from 'lucide-react';

interface InteractiveQuestionViewProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  isBookmarked: boolean;
  isTopicInRevisionList: boolean;
  syllabus: SyllabusDomain[];
  showVisualAutomaticallyOnWrong: boolean;
  onRecordAttempt: (
    question: Question,
    selectedAnswer: string | string[] | Record<string, string>,
    isCorrect: boolean,
    partialScore: number,
    confidence: ConfidenceLevel,
    timeSpentSeconds: number
  ) => void;
  onUpdateConfidence: (question: Question, confidence: ConfidenceLevel) => void;
  onToggleBookmark: (questionId: string) => void;
  onToggleRevisionTopic: (topicId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onUpdateQuestionVerification: (
    questionId: string,
    audit: VerificationAudit
  ) => void;
  onAddEquivalentQuestion: (newQuestion: Question) => void;
  onRestartAndShuffle?: () => void;
}

export const InteractiveQuestionView: React.FC<InteractiveQuestionViewProps> = ({
  question,
  currentIndex,
  totalQuestions,
  isBookmarked,
  isTopicInRevisionList,
  syllabus,
  showVisualAutomaticallyOnWrong,
  onRecordAttempt,
  onUpdateConfidence,
  onToggleBookmark,
  onToggleRevisionTopic,
  onPrevious,
  onNext,
  onUpdateQuestionVerification,
  onAddEquivalentQuestion,
  onRestartAndShuffle,
}) => {
  // Interactive selection states
  const [singleSelected, setSingleSelected] = useState<string>('');
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [yesNoSelected, setYesNoSelected] = useState<Record<string, 'Yes' | 'No'>>({});
  const [slotSelected, setSlotSelected] = useState<Record<string, string>>({});
  const [dragOrder, setDragOrder] = useState<string[]>([]);

  const [submitted, setSubmitted] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    isCorrect: boolean;
    partialScore: number;
  } | null>(null);
  const [selectedConfidence, setSelectedConfidence] =
    useState<ConfidenceLevel>('unrated');

  const [activeCaseTab, setActiveCaseTab] = useState<string>('');
  const [showVisualWalkthrough, setShowVisualWalkthrough] =
    useState<boolean>(false);
  const [showSourcePdfPage, setShowSourcePdfPage] = useState<boolean>(false);

  const [verifyingOnline, setVerifyingOnline] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [generatingEquivalent, setGeneratingEquivalent] =
    useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // Reset state when question changes
  useEffect(() => {
    setSingleSelected('');
    setMultiSelected([]);
    setYesNoSelected({});
    setSlotSelected({});
    if (question.dragDropPool) {
      // Present shuffled or reversed initial pool so user orders it
      setDragOrder([...question.dragDropPool.map((i) => i.id)].reverse());
    } else {
      setDragOrder([]);
    }
    setSubmitted(false);
    setEvaluationResult(null);
    setSelectedConfidence('unrated');
    setShowVisualWalkthrough(false);
    setShowSourcePdfPage(false);
    setVerifyError(null);
    setGenerateError(null);
    if (question.caseStudySections && question.caseStudySections.length > 0) {
      setActiveCaseTab(question.caseStudySections[0].id);
    }
    startTimeRef.current = Date.now();
  }, [question.id]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'ArrowRight' && currentIndex < totalQuestions - 1) {
        onNext();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onPrevious();
      } else if (e.key.toLowerCase() === 'b') {
        onToggleBookmark(question.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalQuestions, question.id, onNext, onPrevious, onToggleBookmark]);

  const domainObj = syllabus.find((d) => d.id === question.domainId);
  const topicObj = domainObj?.topics.find((t) => t.id === question.topicId);

  const getElapsedSeconds = () =>
    Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

  // Immediate evaluation for single_choice & case_study
  const handleSelectSingleChoice = (optionId: string) => {
    if (submitted) return;
    setSingleSelected(optionId);
    const targetAnswer = String(question.verifiedAnswerKey || question.originalAnswerKey);
    const isCorrect = optionId === targetAnswer;
    const partialScore = isCorrect ? 1 : 0;

    setSubmitted(true);
    setEvaluationResult({ isCorrect, partialScore });
    if (!isCorrect && showVisualAutomaticallyOnWrong && question.visualWalkthrough) {
      setShowVisualWalkthrough(true);
    }
    onRecordAttempt(
      question,
      optionId,
      isCorrect,
      partialScore,
      'unrated',
      getElapsedSeconds()
    );
  };

  // Submit evaluation for multi_select, yes_no, hotspot, kql_completion, drag_drop
  const handleSubmitComplexQuestion = () => {
    if (submitted) return;
    let isCorrect = false;
    let partialScore = 0;
    let recordedAnswer: string | string[] | Record<string, string> = '';

    if (question.type === 'multi_select') {
      const correctArr = Array.isArray(question.verifiedAnswerKey)
        ? question.verifiedAnswerKey
        : String(question.verifiedAnswerKey)
            .split(',')
            .map((s) => s.trim());
      const correctSet = new Set(correctArr);
      let hits = 0;
      let wrongPicks = 0;
      for (const pick of multiSelected) {
        if (correctSet.has(pick)) hits += 1;
        else wrongPicks += 1;
      }
      const rawScore = Math.max(0, (hits - wrongPicks * 0.5) / Math.max(1, correctSet.size));
      partialScore = Number(rawScore.toFixed(2));
      isCorrect = hits === correctSet.size && wrongPicks === 0;
      recordedAnswer = multiSelected;
    } else if (question.type === 'yes_no' && question.yesNoStatements) {
      const total = question.yesNoStatements.length;
      let hits = 0;
      for (const stmt of question.yesNoStatements) {
        if (yesNoSelected[stmt.id] === stmt.correctAnswer) {
          hits += 1;
        }
      }
      partialScore = Number((hits / Math.max(1, total)).toFixed(2));
      isCorrect = hits === total;
      recordedAnswer = yesNoSelected;
    } else if (
      (question.type === 'hotspot' || question.type === 'kql_completion') &&
      question.interactiveSlots
    ) {
      const total = question.interactiveSlots.length;
      let hits = 0;
      for (const slot of question.interactiveSlots) {
        if (slotSelected[slot.id] === slot.correctChoice) {
          hits += 1;
        }
      }
      partialScore = Number((hits / Math.max(1, total)).toFixed(2));
      isCorrect = hits === total;
      recordedAnswer = slotSelected;
    } else if (question.type === 'drag_drop' && question.dragDropTargetOrder) {
      const target = question.dragDropTargetOrder;
      let hits = 0;
      for (let i = 0; i < target.length; i++) {
        if (dragOrder[i] === target[i]) hits += 1;
      }
      partialScore = Number((hits / Math.max(1, target.length)).toFixed(2));
      isCorrect = hits === target.length;
      recordedAnswer = dragOrder;
    }

    setSubmitted(true);
    setEvaluationResult({ isCorrect, partialScore });
    if (!isCorrect && showVisualAutomaticallyOnWrong && question.visualWalkthrough) {
      setShowVisualWalkthrough(true);
    }
    onRecordAttempt(
      question,
      recordedAnswer,
      isCorrect,
      partialScore,
      'unrated',
      getElapsedSeconds()
    );
  };

  const handleConfidenceClick = (conf: ConfidenceLevel) => {
    setSelectedConfidence(conf);
    onUpdateConfidence(question, conf);
  };

  const handleMoveDragItem = (index: number, direction: 'up' | 'down') => {
    if (submitted) return;
    const nextOrder = [...dragOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextOrder.length) return;
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[targetIdx];
    nextOrder[targetIdx] = temp;
    setDragOrder(nextOrder);
  };

  const handleVerifyWithMicrosoftLearn = async () => {
    setVerifyingOnline(true);
    setVerifyError(null);
    try {
      const res = await fetch('/api/questions/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification request failed');
      }
      onUpdateQuestionVerification(question.id, data);
    } catch (err: any) {
      setVerifyError(err?.message || 'Could not reach verification service.');
    } finally {
      setVerifyingOnline(false);
    }
  };

  const handleGenerateEquivalent = async () => {
    setGeneratingEquivalent(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: question.domainId,
          topicId: question.topicId,
          topicTitle: topicObj?.title || question.subtopic,
          difficulty: question.difficulty,
          questionType: 'single_choice',
          parentQuestion: question,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.generated) {
        throw new Error(data.error || 'Failed to generate equivalent question.');
      }

      const gen = data.generated;
      const newQuestion: Question = {
        id: `q-equiv-${Date.now()}`,
        fingerprint: `equiv-${Date.now()}`,
        source: 'Original Practice',
        type: 'single_choice',
        domainId: question.domainId,
        topicId: question.topicId,
        subtopic: gen.subtopic || question.subtopic,
        difficulty:
          gen.difficulty === 'Easy' ||
          gen.difficulty === 'Intermediate' ||
          gen.difficulty === 'Difficult'
            ? gen.difficulty
            : question.difficulty,
        stem: gen.stem,
        scenarioContext: `Equivalent Concept-Transfer Practice Question generated to test mastery of Question #${question.extractionAudit.originalQuestionNumber}.`,
        options: gen.options,
        originalAnswerKey: gen.correctOptionId,
        verifiedAnswerKey: gen.correctOptionId,
        extractionAudit: {
          confidence: 'high',
          sourceFileName: 'Concept-Transfer Generator',
          sourcePage: 0,
          originalQuestionNumber: `EQ-${question.extractionAudit.originalQuestionNumber}`,
          originalAnswerKey: gen.correctOptionId,
          missingOrAmbiguousFields: [],
          isUsable: true,
          extractedAt: new Date().toISOString(),
        },
        verificationAudit: {
          status:
            gen.officialDocUrl &&
            gen.officialDocUrl.startsWith('https://learn.microsoft.com')
              ? 'verified'
              : 'unverified',
          verifiedAnswerKey: gen.correctOptionId,
          agreesWithOriginal: true,
          documentedBehavior: gen.documentedBehavior,
          verifiedDate: new Date().toISOString().slice(0, 10),
          officialReferences: gen.officialDocUrl
            ? [
                {
                  title: gen.officialDocTitle || 'Microsoft Learn Documentation',
                  url: gen.officialDocUrl,
                },
              ]
            : [],
        },
        explanation: {
          whyCorrect: gen.whyCorrect,
          whyOthersIncorrect: data.whyOthersIncorrect || {},
          examTip: gen.examTip,
        },
        visualWalkthrough: question.visualWalkthrough,
        parentQuestionId: question.id,
      };

      onAddEquivalentQuestion(newQuestion);
    } catch (err: any) {
      setGenerateError(err?.message || 'Failed to generate equivalent question.');
    } finally {
      setGeneratingEquivalent(false);
    }
  };

  const formatTypeLabel = (type: Question['type']) => {
    switch (type) {
      case 'single_choice':
        return 'Single-Answer Multiple Choice';
      case 'multi_select':
        return 'Multiple-Answer Selection';
      case 'yes_no':
        return 'Yes / No Scenario Series';
      case 'hotspot':
        return 'Hotspot Configuration';
      case 'drag_drop':
        return 'Drag & Drop Sequence';
      case 'kql_completion':
        return 'KQL Code Completion';
      case 'case_study':
        return 'Case Study Scenario';
    }
  };

  const renderVerificationStatusInline = () => {
    const status = question.verificationAudit.status;
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Verified against Microsoft Learn
        </span>
      );
    }
    if (status === 'disputed') {
      return (
        <span className="inline-flex items-center gap-1 font-medium text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          Disputed / Updated vs PDF Key
        </span>
      );
    }
    if (status === 'needs_review') {
      return (
        <span className="inline-flex items-center gap-1 font-medium text-rose-700">
          <ShieldAlert className="w-3.5 h-3.5" />
          Needs Verification Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-medium text-slate-600">
        <HelpCircle className="w-3.5 h-3.5" />
        Unverified Answer Key
      </span>
    );
  };

  const formatAnswerReadable = (
    ans: string | string[] | Record<string, string>
  ): string => {
    if (Array.isArray(ans)) return ans.join(' → ');
    if (typeof ans === 'object' && ans !== null) {
      return Object.entries(ans)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
    }
    return String(ans);
  };

  return (
    <div className="space-y-6">
      {/* Top Progress & Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          {/* Unboxed inline metadata per Zero-Pill Discipline */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatTypeLabel(question.type)}</span>
            <span aria-hidden="true">·</span>
            <span>{question.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800">{question.source}</span>
            {question.source === 'Imported' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  PDF Q#{question.extractionAudit.originalQuestionNumber} (p.{question.extractionAudit.sourcePage})
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            {renderVerificationStatusInline()}
          </div>

          <div className="text-xs text-slate-500">
            <span>
              Domain {question.domainId}: {domainObj?.title}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
            <span className="text-slate-700 font-medium">
              {topicObj?.code} {question.subtopic}
            </span>
          </div>
        </div>

        {/* Navigation & Bookmark Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleBookmark(question.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              isBookmarked
                ? 'border-sky-600 bg-sky-50 text-sky-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Bookmarked</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Bookmark</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={onPrevious}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            disabled={currentIndex >= totalQuestions - 1}
            onClick={onNext}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Unverified Answer Key Uncertainty Banner */}
      {(question.verificationAudit.status === 'unverified' ||
        question.verificationAudit.status === 'needs_review') && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Answer Key Uncertainty Notice: </span>
              This question’s answer key has not yet been independently verified against a `learn.microsoft.com` citation. Any grading shown below uses the unverified source key until verified.
            </div>
          </div>
          <button
            type="button"
            disabled={verifyingOnline}
            onClick={handleVerifyWithMicrosoftLearn}
            className="px-3 py-1.5 text-xs font-medium bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors whitespace-nowrap shrink-0"
          >
            {verifyingOnline ? 'Checking Microsoft Learn...' : 'Verify with Microsoft Learn'}
          </button>
        </div>
      )}

      {/* Case Study Exhibit Tabs (if Case Study question) */}
      {question.caseStudySections && question.caseStudySections.length > 0 && (
        <div className="border border-slate-200 bg-white rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800">
              {question.caseStudyTitle || 'Case Study Background & Exhibits'}
            </span>
            <div className="flex items-center gap-1">
              {question.caseStudySections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveCaseTab(sec.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeCaseTab === sec.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sec.title}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {question.caseStudySections.find((s) => s.id === activeCaseTab)?.content}
          </div>
        </div>
      )}

      {/* Main Question Card */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-6">
        {question.scenarioContext && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-3">
            <span>{question.scenarioContext}</span>
            {question.source === 'Imported' &&
              question.extractionAudit.sourcePage > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSourcePdfPage((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {showSourcePdfPage
                      ? 'Hide Source PDF Page'
                      : `Inspect Source PDF Page ${question.extractionAudit.sourcePage}`}
                  </span>
                </button>
              )}
          </div>
        )}

        {/* Optional Embedded Single-Page PDF Exhibit Inspector */}
        {showSourcePdfPage && question.extractionAudit.sourcePage > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
            <div className="px-3 py-2 bg-slate-800 text-slate-200 text-xs flex items-center justify-between">
              <span>
                Private PDF Source Page #{question.extractionAudit.sourcePage} ({question.extractionAudit.sourceFileName})
              </span>
              <span className="text-slate-400">Served privately via /api/pdf/page/{question.extractionAudit.sourcePage}</span>
            </div>
            <iframe
              title={`PDF Page ${question.extractionAudit.sourcePage}`}
              src={`/api/pdf/page/${question.extractionAudit.sourcePage}`}
              className="w-full h-[460px] bg-white"
            />
          </div>
        )}

        {/* Question Stem */}
        <div className="text-base text-slate-900 leading-relaxed font-medium max-w-[75ch]">
          {question.stem}
        </div>

        {/* Interactive Controls by Question Type */}
        {/* 1. SINGLE CHOICE OR CASE STUDY */}
        {(question.type === 'single_choice' || question.type === 'case_study') &&
          question.options && (
            <div className="space-y-2.5">
              {question.options.map((opt) => {
                const isSelected = singleSelected === opt.id;
                const correctId = String(
                  question.verifiedAnswerKey || question.originalAnswerKey
                );
                const isCorrectOption = opt.id === correctId;

                let cardStyle =
                  'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800';
                if (submitted) {
                  if (isCorrectOption) {
                    cardStyle =
                      'border-emerald-600 bg-emerald-50/70 text-emerald-950';
                  } else if (isSelected && !isCorrectOption) {
                    cardStyle = 'border-rose-600 bg-rose-50/70 text-rose-950';
                  } else {
                    cardStyle = 'border-slate-200 bg-slate-50/50 text-slate-500';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitted}
                    onClick={() => handleSelectSingleChoice(opt.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${cardStyle}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-800 shrink-0 mt-0.5">
                        {opt.label}
                      </span>
                      <span className="text-sm leading-relaxed">{opt.text}</span>
                    </div>
                    {submitted && isCorrectOption && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        Correct
                      </span>
                    )}
                    {submitted && isSelected && !isCorrectOption && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 shrink-0">
                        <XCircle className="w-4 h-4" />
                        Your Selection
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

        {/* 2. MULTIPLE-ANSWER SELECTION */}
        {question.type === 'multi_select' && question.options && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">
              Select all options that apply, then click <strong>Submit Answer</strong>. Partial credit is awarded for partially correct selections.
            </div>
            <div className="space-y-2.5">
              {question.options.map((opt) => {
                const isSelected = multiSelected.includes(opt.id);
                const correctArr = Array.isArray(question.verifiedAnswerKey)
                  ? question.verifiedAnswerKey
                  : String(question.verifiedAnswerKey)
                      .split(',')
                      .map((s) => s.trim());
                const isCorrectOption = correctArr.includes(opt.id);

                let cardStyle = isSelected
                  ? 'border-sky-600 bg-sky-50/50 text-slate-900'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800';

                if (submitted) {
                  if (isCorrectOption && isSelected) {
                    cardStyle = 'border-emerald-600 bg-emerald-50/70 text-emerald-950';
                  } else if (isCorrectOption && !isSelected) {
                    cardStyle = 'border-amber-500 bg-amber-50/70 text-amber-950';
                  } else if (!isCorrectOption && isSelected) {
                    cardStyle = 'border-rose-600 bg-rose-50/70 text-rose-950';
                  } else {
                    cardStyle = 'border-slate-200 bg-slate-50/50 text-slate-500';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitted}
                    onClick={() => {
                      setMultiSelected((prev) =>
                        prev.includes(opt.id)
                          ? prev.filter((x) => x !== opt.id)
                          : [...prev, opt.id]
                      );
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${cardStyle}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        {isSelected ? '✓' : opt.label}
                      </span>
                      <span className="text-sm leading-relaxed">{opt.text}</span>
                    </div>
                    {submitted && isCorrectOption && isSelected && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        Matched
                      </span>
                    )}
                    {submitted && isCorrectOption && !isSelected && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                        Missed Correct Option
                      </span>
                    )}
                    {submitted && !isCorrectOption && isSelected && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 shrink-0">
                        <XCircle className="w-4 h-4" />
                        Incorrect Selection
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!submitted && (
              <button
                type="button"
                disabled={multiSelected.length === 0}
                onClick={handleSubmitComplexQuestion}
                className="px-5 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
              >
                Submit Answer
              </button>
            )}
          </div>
        )}

        {/* 3. YES / NO SCENARIO SERIES */}
        {question.type === 'yes_no' && question.yesNoStatements && (
          <div className="space-y-4">
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {question.yesNoStatements.map((stmt) => {
                const chosen = yesNoSelected[stmt.id];
                const isMatch = chosen === stmt.correctAnswer;
                return (
                  <div key={stmt.id} className="p-4 bg-white space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-sm text-slate-800 leading-relaxed">
                        {stmt.statement}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {(['Yes', 'No'] as const).map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            disabled={submitted}
                            onClick={() =>
                              setYesNoSelected((prev) => ({
                                ...prev,
                                [stmt.id]: choice,
                              }))
                            }
                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                              chosen === choice
                                ? 'bg-sky-600 border-sky-600 text-white'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    </div>
                    {submitted && (
                      <div
                        className={`text-xs flex items-start gap-2 pt-1 ${
                          isMatch ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isMatch ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold">
                            Correct: {stmt.correctAnswer}.{' '}
                          </span>
                          {stmt.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {!submitted && (
              <button
                type="button"
                disabled={
                  Object.keys(yesNoSelected).length <
                  question.yesNoStatements.length
                }
                onClick={handleSubmitComplexQuestion}
                className="px-5 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
              >
                Submit Answer
              </button>
            )}
          </div>
        )}

        {/* 4. KQL CODE COMPLETION OR HOTSPOT DROPDOWNS */}
        {(question.type === 'kql_completion' || question.type === 'hotspot') &&
          question.interactiveSlots && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border ${
                  question.type === 'kql_completion'
                    ? 'bg-slate-900 border-slate-800 text-slate-100 font-mono'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                } space-y-4`}
              >
                {question.interactiveSlots.map((slot) => {
                  const chosen = slotSelected[slot.id] || '';
                  const isSlotCorrect = chosen === slot.correctChoice;
                  return (
                    <div key={slot.id} className="space-y-1.5">
                      <label className="block text-xs font-sans font-medium text-sky-400">
                        {slot.label}
                      </label>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {slot.codePrefix && (
                          <span className="whitespace-pre-wrap">{slot.codePrefix}</span>
                        )}
                        <select
                          disabled={submitted}
                          value={chosen}
                          onChange={(e) =>
                            setSlotSelected((prev) => ({
                              ...prev,
                              [slot.id]: e.target.value,
                            }))
                          }
                          aria-label={slot.label}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                            question.type === 'kql_completion'
                              ? 'bg-slate-800 border-sky-500/60 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="">-- Select option --</option>
                          {slot.choices.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {slot.codeSuffix && (
                          <span className="whitespace-pre-wrap">{slot.codeSuffix}</span>
                        )}
                        {submitted && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-sans font-semibold px-2 py-0.5 rounded ${
                              isSlotCorrect
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {isSlotCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Correct
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                Expected: {slot.correctChoice}
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!submitted && (
                <button
                  type="button"
                  disabled={
                    Object.keys(slotSelected).filter((k) => slotSelected[k])
                      .length < question.interactiveSlots.length
                  }
                  onClick={handleSubmitComplexQuestion}
                  className="px-5 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
                >
                  Submit Answer
                </button>
              )}
            </div>
          )}

        {/* 5. DRAG AND DROP / SEQUENCING */}
        {question.type === 'drag_drop' && question.dragDropPool && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500">
              Use the Up / Down controls to arrange the sequence in the exact chronological execution order, then click <strong>Submit Sequence</strong>.
            </div>
            <div className="space-y-2">
              {dragOrder.map((itemId, idx) => {
                const item = question.dragDropPool?.find((i) => i.id === itemId);
                if (!item) return null;
                const expectedId = question.dragDropTargetOrder?.[idx];
                const isPositionCorrect = itemId === expectedId;

                return (
                  <div
                    key={itemId}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
                      submitted
                        ? isPositionCorrect
                          ? 'border-emerald-600 bg-emerald-50/70'
                          : 'border-rose-600 bg-rose-50/70'
                        : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 tabular-nums">
                        Step {idx + 1}
                      </span>
                      <span className="text-sm text-slate-800">{item.text}</span>
                    </div>
                    {!submitted ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveDragItem(idx, 'up')}
                          aria-label="Move step up"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === dragOrder.length - 1}
                          onClick={() => handleMoveDragItem(idx, 'down')}
                          aria-label="Move step down"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-semibold shrink-0 flex items-center gap-1 ${
                          isPositionCorrect ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isPositionCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Correct Position
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Wrong Position
                          </>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {!submitted && (
              <button
                type="button"
                onClick={handleSubmitComplexQuestion}
                className="px-5 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                Submit Sequence
              </button>
            )}
          </div>
        )}
      </div>

      {/* POST-ANSWER FEEDBACK, CONFIDENCE TRACKING & DEEP EXPLANATION */}
      {submitted && evaluationResult && (
        <div className="space-y-5">
          {/* 1. Evaluation Verdict + Spaced Repetition Confidence Selector */}
          <div
            className={`p-5 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              evaluationResult.isCorrect
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : evaluationResult.partialScore > 0
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-rose-50/80 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {evaluationResult.isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="text-base font-bold font-display">
                  {evaluationResult.isCorrect
                    ? 'Correct Answer!'
                    : evaluationResult.partialScore > 0
                    ? `Partially Correct (${Math.round(
                        evaluationResult.partialScore * 100
                      )}% Credit)`
                    : 'Incorrect Answer'}
                </div>
                <div className="text-xs">
                  <span className="font-semibold">Correct / Verified Answer: </span>
                  <span className="font-mono">
                    {formatAnswerReadable(question.verifiedAnswerKey)}
                  </span>
                  {question.source === 'Imported' && (
                    <>
                      <span className="mx-2">·</span>
                      <span className="font-semibold">Original PDF Key: </span>
                      <span className="font-mono">
                        {formatAnswerReadable(question.originalAnswerKey)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Spaced Repetition Confidence Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 bg-white/90 p-2 rounded-lg border border-slate-200">
              <span className="text-xs font-medium text-slate-600 px-1">
                How confident were you?
              </span>
              {(
                [
                  { id: 'guessed', label: 'Guessed (Schedule Today)' },
                  { id: 'unsure', label: 'Unsure (Review Tomorrow)' },
                  { id: 'confident', label: 'Confident (Standard Interval)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleConfidenceClick(item.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedConfidence === item.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Explanation & Distractor Analysis Card */}
          <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-5">
            {/* Disputed / Product Update Banner if applicable */}
            {question.verificationAudit.disagreementExplanation && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    Official Documentation vs. Supplied PDF Answer Key Analysis
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  {question.verificationAudit.disagreementExplanation}
                </p>
              </div>
            )}

            {/* Why this is correct */}
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-slate-900 font-display flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Why this is correct</span>
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {question.explanation.whyCorrect}
              </p>
            </div>

            {/* Why the other options are incorrect */}
            {Object.keys(question.explanation.whyOthersIncorrect || {}).length >
              0 && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-900 font-display">
                  Why the other options are incorrect
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(question.explanation.whyOthersIncorrect).map(
                    ([optKey, reason]) => (
                      <div
                        key={optKey}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2.5"
                      >
                        <span className="font-mono font-semibold text-slate-900 shrink-0">
                          {optKey}:
                        </span>
                        <span className="leading-relaxed">{reason}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Exam Tip */}
            <div className="p-4 rounded-lg bg-sky-50/70 border border-sky-200 flex items-start gap-3">
              <Lightbulb className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-xs text-sky-950 leading-relaxed">
                <span className="font-semibold">SC-200 Exam Tip: </span>
                {question.explanation.examTip}
              </div>
            </div>

            {/* Evidence-Based Official References & Verification Audit */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900 font-display flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span>
                    Official Microsoft Learn References & Verification Evidence
                  </span>
                </h4>
                <button
                  type="button"
                  disabled={verifyingOnline}
                  onClick={handleVerifyWithMicrosoftLearn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      verifyingOnline ? 'animate-spin text-sky-600' : ''
                    }`}
                  />
                  <span>
                    {verifyingOnline
                      ? 'Re-verifying with Microsoft Learn...'
                      : 'Re-Verify Against Live Microsoft Learn'}
                  </span>
                </button>
              </div>

              {verifyError && (
                <div className="text-xs text-rose-600">{verifyError}</div>
              )}

              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-medium text-slate-800">
                  Documented Behavior (Verified {question.verificationAudit.verifiedDate}):{' '}
                </span>
                {question.verificationAudit.documentedBehavior}
              </div>

              {question.verificationAudit.knownAmbiguitiesOrAssumptions && (
                <div className="text-xs text-slate-500 italic">
                  Licensing / Version Assumption:{' '}
                  {question.verificationAudit.knownAmbiguitiesOrAssumptions}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {question.verificationAudit.officialReferences.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/70 rounded-lg transition-colors"
                  >
                    <span>{ref.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Deeper KQL Technical Breakdown (When KQL data is present) */}
          {question.kqlLearning && (
            <KqlLearningPanel kqlData={question.kqlLearning} />
          )}

          {/* 4. Visual Walkthrough Section */}
          {question.visualWalkthrough && (
            <div className="space-y-2">
              {!showVisualWalkthrough ? (
                <button
                  type="button"
                  onClick={() => setShowVisualWalkthrough(true)}
                  className="w-full py-3 px-4 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100/70 text-xs font-semibold text-sky-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>
                    Open Illustrated Portal Navigation & Investigation Workflow ({question.visualWalkthrough.title})
                  </span>
                </button>
              ) : (
                <VisualWalkthroughDiagram walkthrough={question.visualWalkthrough} />
              )}
            </div>
          )}

          {/* 5. Bottom Action Bar: Bookmark, Add Concept to Revision List, Equivalent Question, Next */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleBookmark(question.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  isBookmarked
                    ? 'border-sky-600 bg-sky-50 text-sky-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-sky-600" />
                    <span>Bookmarked Question</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Bookmark Question</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggleRevisionTopic(question.topicId)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  isTopicInRevisionList
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isTopicInRevisionList ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Concept in Revision List</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Concept to Revision List</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={generatingEquivalent}
                onClick={handleGenerateEquivalent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>
                  {generatingEquivalent
                    ? 'Generating Equivalent Scenario...'
                    : 'Test Concept with Equivalent Question'}
                </span>
              </button>
            </div>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              onRestartAndShuffle && (
                <button
                  type="button"
                  onClick={onRestartAndShuffle}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Set Complete — Shuffle & Start Next Set</span>
                </button>
              )
            )}
          </div>

          {generateError && (
            <div className="text-xs text-rose-600">{generateError}</div>
          )}
        </div>
      )}
    </div>
  );
};
