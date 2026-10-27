import React from 'react';
import {
  ReadinessReport,
  NavigationTab,
} from '../types';
import {
  Play,
  Target,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Layers,
  ExternalLink,
  Upload,
  Clock,
} from 'lucide-react';

interface DashboardViewProps {
  report: ReadinessReport;
  lastSyllabusRefreshDate: string;
  onStartRecommendedSession: () => void;
  onPracticeTopic: (topicId: string) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  report,
  lastSyllabusRefreshDate,
  onStartRecommendedSession,
  onPracticeTopic,
  onNavigate,
}) => {
  const getBandColorClasses = (tone: ReadinessReport['readinessBand']['statusTone']) => {
    switch (tone) {
      case 'success':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'info':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'warning':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'error':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 4-Question Readiness Hero Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Card 1: How prepared am I? */}
        <div className="border border-slate-200 bg-white rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500">
              1. How prepared am I?
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                {report.hasSufficientEvidence
                  ? `${report.overallReadinessScore}/100`
                  : '—'}
              </span>
              {report.hasSufficientEvidence && (
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  (1st-Attempt: {report.firstAttemptAccuracy}%)
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${getBandColorClasses(
                report.readinessBand.statusTone
              )}`}
            >
              {report.hasSufficientEvidence ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{report.readinessBand.label}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {report.readinessBand.description}
            </p>
          </div>
        </div>

        {/* Card 2: Which area am I weakest in? */}
        <div className="border border-slate-200 bg-white rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500">
              2. Which area am I weakest in?
            </div>
            {report.topWeaknesses[0] ? (
              <>
                <div className="text-sm font-bold text-slate-900 font-display line-clamp-2">
                  {report.topWeaknesses[0].topicCode} {report.topWeaknesses[0].topicTitle}
                </div>
                <div className="text-xs text-slate-600 font-mono tabular-nums">
                  {report.topWeaknesses[0].uniqueAttemptedCount > 0
                    ? `1st-Attempt Accuracy: ${report.topWeaknesses[0].firstAttemptAccuracy}% · Mastery: ${report.topWeaknesses[0].masteryScore}/100`
                    : '0 questions attempted in this high-weight topic'}
                </div>
              </>
            ) : (
              <div className="text-sm font-semibold text-slate-700">
                No weak areas identified yet
              </div>
            )}
          </div>
          {report.topWeaknesses[0] && (
            <button
              type="button"
              onClick={() => onPracticeTopic(report.topWeaknesses[0].topicId)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors"
            >
              Drill Weakest Topic ({report.topWeaknesses[0].topicCode})
            </button>
          )}
        </div>

        {/* Card 3: What should I study next? */}
        <div className="border border-sky-200 bg-sky-50/50 rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-sky-800">
              3. What should I study next?
            </div>
            <div className="text-sm font-bold text-slate-900 font-display">
              {report.recommendedNextSession.title}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {report.recommendedNextSession.reason}
            </p>
          </div>
          <button
            type="button"
            onClick={onStartRecommendedSession}
            className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Recommended Focus Session</span>
          </button>
        </div>

        {/* Card 4: How much of the syllabus have I covered? */}
        <div className="border border-slate-200 bg-white rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500">
              4. How much of the syllabus have I covered?
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                {report.syllabusCoveragePercentage}%
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                ({report.uniqueQuestionsAttempted}/{report.totalUsableQuestionsInBank} bank Qs)
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 transition-all duration-200"
                style={{ width: `${report.syllabusCoveragePercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Syllabus Verified: {lastSyllabusRefreshDate}</span>
              <button
                type="button"
                onClick={() => onNavigate('syllabus')}
                className="text-sky-700 font-medium hover:underline"
              >
                Full Syllabus →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Readiness Evidence & Uncertainty Disclosure */}
      <div className="border border-slate-200 bg-white rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Target className="w-4 h-4 text-sky-600" />
            <span>
              Honest Readiness Assessment & Evidence Audit (Internal Study Indicator Only)
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Unique Attempted: {report.uniqueQuestionsAttempted} · Total Attempts:{' '}
            {report.totalQuestionsAttempted} · Due for Revision:{' '}
            {report.dueForSpacedRepetitionCount}
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your readiness indicator weighs <strong>first-attempt accuracy (75%)</strong>, published SC-200 domain weightings (42.5% / 37.5% / 20.0%), syllabus breadth, and practice volume so repeated retries of the same questions cannot artificially inflate your score. It never guarantees a passing result on the official Microsoft exam.
        </p>
        {report.uncertaintyReasons.length > 0 && (
          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
            <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Why Your Readiness Score Carries Uncertainty:</span>
            </div>
            <ul className="list-disc list-inside text-xs text-amber-900 space-y-0.5">
              {report.uncertaintyReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Domain Performance Breakdown & Top 5 Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Domain Scores (7 cols) */}
        <div className="lg:col-span-7 border border-slate-200 bg-white rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Performance by Official SC-200 Domain</span>
              </h3>
              <p className="text-xs text-slate-500">
                Weighted according to the official Microsoft Learn SC-200 study guide
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('import_questions')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
            >
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Import More PDF Batches</span>
            </button>
          </div>

          <div className="space-y-4">
            {report.domainMetrics.map((dom) => (
              <div
                key={dom.domainId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">
                      Domain {dom.domainId} · Exam Weight {dom.publishedWeightRange}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {dom.title}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-sm font-bold text-slate-900">
                      1st-Attempt: {dom.firstAttemptAccuracy}%
                    </div>
                    <div className="text-xs text-slate-500">
                      All Attempts: {dom.overallAccuracy}% ({dom.uniqueAttempted}/
                      {dom.totalAvailable} Qs)
                    </div>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      dom.firstAttemptAccuracy >= 75
                        ? 'bg-emerald-600'
                        : dom.firstAttemptAccuracy >= 60
                        ? 'bg-amber-500'
                        : 'bg-sky-600'
                    }`}
                    style={{
                      width: `${
                        dom.uniqueAttempted > 0 ? dom.firstAttemptAccuracy : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recent Score Trend */}
          {report.recentTrend.length > 0 && (
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                <span>Recent Study Session Trend</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {report.recentTrend.map((pt) => (
                  <div
                    key={pt.dateLabel}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono tabular-nums"
                  >
                    <div className="text-slate-500">{pt.dateLabel}</div>
                    <div className="font-bold text-slate-900">
                      {pt.accuracy}% ({pt.questionsCount} Qs)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top 5 Weaknesses & Revision Priorities (5 cols) */}
        <div className="lg:col-span-5 border border-slate-200 bg-white rounded-xl p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>Top 5 Weaknesses & Revision Priorities</span>
            </h3>
            <p className="text-xs text-slate-500">
              Direct links to practice questions and official Microsoft Learn modules
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            {report.topWeaknesses.map((weak, index) => (
              <div key={weak.topicId} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-900 leading-snug">
                    0{index + 1}. [{weak.topicCode}] {weak.topicTitle}
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums shrink-0">
                    {weak.uniqueAttemptedCount > 0
                      ? `${weak.firstAttemptAccuracy}%`
                      : 'Unpracticed'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Attempted {weak.uniqueAttemptedCount}/{weak.totalAvailableQuestions} · Low Conf: {weak.lowConfidenceCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={weak.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                    >
                      <span>MS Learn</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onPracticeTopic(weak.topicId)}
                      className="px-2.5 py-1 rounded bg-slate-900 text-white font-medium hover:bg-slate-800"
                    >
                      Practice
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
