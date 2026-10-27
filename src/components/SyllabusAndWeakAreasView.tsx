import React, { useState } from 'react';
import {
  SyllabusDomain,
  ReadinessReport,
  Question,
  Difficulty,
} from '../types';
import {
  OFFICIAL_STUDY_GUIDE_URL,
  OFFICIAL_CERTIFICATION_PAGE_URL,
} from '../data/syllabusData';
import {
  RefreshCw,
  ExternalLink,
  Play,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

interface SyllabusAndWeakAreasViewProps {
  mode: 'syllabus' | 'weak_areas';
  syllabus: SyllabusDomain[];
  report: ReadinessReport;
  lastSyllabusRefreshDate: string;
  onPracticeTopic: (topicId: string) => void;
  onStartFocusSession: () => void;
  onUpdateSyllabusVerificationDate: (newDate: string) => void;
  onAddGeneratedQuestion: (newQuestion: Question) => void;
}

export const SyllabusAndWeakAreasView: React.FC<
  SyllabusAndWeakAreasViewProps
> = ({
  mode,
  syllabus,
  report,
  lastSyllabusRefreshDate,
  onPracticeTopic,
  onStartFocusSession,
  onUpdateSyllabusVerificationDate,
  onAddGeneratedQuestion,
}) => {
  const [refreshingSyllabus, setRefreshingSyllabus] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{
    changeSummary: string[];
    deprecatedOrRenamedFeaturesToFlag: string[];
  } | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [selectedGenDifficulty, setSelectedGenDifficulty] =
    useState<Difficulty>('Intermediate');
  const [genError, setGenError] = useState<string | null>(null);

  const handleRefreshOfficialContent = async () => {
    setRefreshingSyllabus(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/syllabus/refresh', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            'Could not retrieve live Microsoft Learn syllabus documentation.'
        );
      }
      onUpdateSyllabusVerificationDate(data.verifiedDate);
      setRefreshResult({
        changeSummary: data.changeSummary || [],
        deprecatedOrRenamedFeaturesToFlag:
          data.deprecatedOrRenamedFeaturesToFlag || [],
      });
    } catch (err: any) {
      setRefreshError(
        err?.message ||
          'Refresh failed. Preserving last verified syllabus information.'
      );
    } finally {
      setRefreshingSyllabus(false);
    }
  };

  const handleGenerateTopicQuestion = async (
    domainId: 1 | 2 | 3,
    topicId: string,
    topicTitle: string
  ) => {
    setGeneratingTopicId(topicId);
    setGenError(null);
    try {
      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          topicId,
          topicTitle,
          difficulty: selectedGenDifficulty,
          questionType: 'single_choice',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.generated) {
        throw new Error(data.error || 'Failed to generate question.');
      }

      const gen = data.generated;
      const newQ: Question = {
        id: `q-orig-${Date.now()}`,
        fingerprint: `orig-${Date.now()}`,
        source: 'Original Practice',
        type: 'single_choice',
        domainId,
        topicId,
        subtopic: gen.subtopic || topicTitle,
        difficulty: selectedGenDifficulty,
        stem: gen.stem,
        options: gen.options,
        originalAnswerKey: gen.correctOptionId,
        verifiedAnswerKey: gen.correctOptionId,
        extractionAudit: {
          confidence: 'high',
          sourceFileName: 'Official Syllabus Question Generator',
          sourcePage: 0,
          originalQuestionNumber: `GEN-${Date.now().toString().slice(-4)}`,
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
      };

      onAddGeneratedQuestion(newQ);
      onPracticeTopic(topicId);
    } catch (err: any) {
      setGenError(err?.message || 'Could not generate new practice question.');
    } finally {
      setGeneratingTopicId(null);
    }
  };

  if (mode === 'weak_areas') {
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-500">
                First-Attempt Diagnostic · Spaced Repetition · Adaptive Focus Mode
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                Weak Areas & Revision Priorities
              </h2>
              <p className="text-sm text-slate-600 max-w-3xl">
                Topics are ranked by first-attempt accuracy, low-confidence answers (<code>Guessed</code> or <code>Unsure</code>), repeated mistakes, and uncovered syllabus weight.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartFocusSession}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors shrink-0"
            >
              <Play className="w-4 h-4" />
              <span>Start Adaptive Focus Session</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.topicMetrics.map((t) => (
              <div
                key={t.topicId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Domain {t.domainId} · Topic {t.topicCode}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      Mastery: {t.masteryScore}/100
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    {t.topicTitle}
                  </h3>
                  <div className="text-xs text-slate-600 font-mono tabular-nums">
                    1st-Attempt: {t.firstAttemptAccuracy}% · Overall:{' '}
                    {t.overallAccuracy}% · Attempted: {t.uniqueAttemptedCount}/
                    {t.totalAvailableQuestions} · Low Conf: {t.lowConfidenceCount} · Repeated Mistakes: {t.repeatedMistakesCount}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <a
                    href={t.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
                  >
                    <span>Official Study Module</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={generatingTopicId === t.topicId}
                      onClick={() =>
                        handleGenerateTopicQuestion(
                          t.domainId,
                          t.topicId,
                          t.topicTitle
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {generatingTopicId === t.topicId
                          ? 'Generating...'
                          : 'Generate New Q'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPracticeTopic(t.topicId)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Practice Topic
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // FULL SYLLABUS VIEW
  return (
    <div className="space-y-6">
      {/* Syllabus Header & Refresh Official Content */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">
              Source of Truth: Microsoft Learn SC-200 Study Guide · Last Verified:{' '}
              <span className="font-mono font-semibold text-slate-800">
                {lastSyllabusRefreshDate}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Official SC-200 Exam Syllabus & Skills Measured
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <a
                href={OFFICIAL_STUDY_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
              >
                <span>Official SC-200 Study Guide</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={OFFICIAL_CERTIFICATION_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
              >
                <span>Certification Overview Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={selectedGenDifficulty}
              onChange={(e) =>
                setSelectedGenDifficulty(e.target.value as Difficulty)
              }
              aria-label="Difficulty for AI generated practice questions"
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="Easy">Gen Difficulty: Easy</option>
              <option value="Intermediate">Gen Difficulty: Intermediate</option>
              <option value="Difficult">Gen Difficulty: Difficult</option>
            </select>

            <button
              type="button"
              disabled={refreshingSyllabus}
              onClick={handleRefreshOfficialContent}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshingSyllabus ? 'animate-spin' : ''
                }`}
              />
              <span>
                {refreshingSyllabus
                  ? 'Checking Microsoft Learn...'
                  : 'Refresh Official Content'}
              </span>
            </button>
          </div>
        </div>

        {refreshError && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{refreshError}</span>
          </div>
        )}

        {genError && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {genError}
          </div>
        )}

        {refreshResult && (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs text-emerald-950">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Official Microsoft Learn Syllabus Verified ({lastSyllabusRefreshDate})
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {refreshResult.changeSummary.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {refreshResult.deprecatedOrRenamedFeaturesToFlag.length > 0 && (
              <div className="pt-1 text-emerald-900">
                <strong>Product Renames / Retirements Tracked During Answer Verification: </strong>
                {refreshResult.deprecatedOrRenamedFeaturesToFlag.join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3 Top-Level Domains & Complete Subtopic Tree */}
      <div className="space-y-6">
        {syllabus.map((domain) => {
          const domMetric = report.domainMetrics.find(
            (d) => d.domainId === domain.id
          );
          return (
            <div
              key={domain.id}
              className="border border-slate-200 bg-white rounded-xl p-6 space-y-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-sky-700">
                    Domain {domain.id} · Official Exam Weight: {domain.weightMin}–
                    {domain.weightMax}%
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {domain.title}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-3xl">
                    {domain.description}
                  </p>
                </div>
                {domMetric && (
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div className="font-bold text-slate-900">
                      1st-Attempt Accuracy: {domMetric.firstAttemptAccuracy}%
                    </div>
                    <div className="text-slate-500">
                      Coverage: {domMetric.uniqueAttempted}/{domMetric.totalAvailable} Questions
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {domain.topics.map((topic) => {
                  const tMetric = report.topicMetrics.find(
                    (tm) => tm.topicId === topic.id
                  );
                  return (
                    <div
                      key={topic.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-mono font-semibold text-slate-500">
                            Objective {topic.code} · Verified {topic.lastVerifiedDate}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 font-display">
                            {topic.title}
                          </h4>
                          <p className="text-xs text-slate-600">
                            {topic.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <a
                            href={topic.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                            <span>Microsoft Learn</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            type="button"
                            disabled={generatingTopicId === topic.id}
                            onClick={() =>
                              handleGenerateTopicQuestion(
                                domain.id,
                                topic.id,
                                topic.title
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                            <span>
                              {generatingTopicId === topic.id
                                ? 'Generating...'
                                : 'Generate Original Q'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onPracticeTopic(topic.id)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                          >
                            <Play className="w-3 h-3" />
                            <span>
                              Practice ({tMetric?.totalAvailableQuestions || 0} Qs)
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Subtopics list */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                        {topic.subtopics.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1"
                          >
                            <span>• {sub.title}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {sub.keywords.join(' · ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
