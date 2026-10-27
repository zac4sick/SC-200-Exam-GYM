import React, { useState, useEffect } from 'react';
import {
  Question,
  SyllabusDomain,
  ExamSimulationResult,
  UserAttempt,
} from '../types';
import {
  Clock,
  Flag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

interface ExamSimulationViewProps {
  usableQuestions: Question[];
  syllabus: SyllabusDomain[];
  defaultQuestionCount: number;
  defaultTimeLimitMinutes: number;
  pastSimulations: ExamSimulationResult[];
  onSaveSimulationResult: (
    result: ExamSimulationResult,
    attemptsToRecord: UserAttempt[]
  ) => void;
}

export const ExamSimulationView: React.FC<ExamSimulationViewProps> = ({
  usableQuestions,
  syllabus,
  defaultQuestionCount,
  defaultTimeLimitMinutes,
  pastSimulations,
  onSaveSimulationResult,
}) => {
  const [configQuestionCount, setConfigQuestionCount] = useState<number>(
    defaultQuestionCount || 50
  );
  const [configTimeMinutes, setConfigTimeMinutes] = useState<number>(
    defaultTimeLimitMinutes || 100
  );

  const [sessionState, setSessionState] = useState<
    'setup' | 'active' | 'confirm_submit' | 'completed'
  >('setup');

  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<
    Record<number, string | string[] | Record<string, string>>
  >({});
  const [flaggedIndices, setFlaggedIndices] = useState<number[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(6000);
  const [completedResult, setCompletedResult] =
    useState<ExamSimulationResult | null>(null);

  // Countdown timer
  useEffect(() => {
    if (sessionState !== 'active' && sessionState !== 'confirm_submit') return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionState]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (
      (sessionState === 'active' || sessionState === 'confirm_submit') &&
      secondsRemaining === 0
    ) {
      finalizeExamSubmission();
    }
  }, [secondsRemaining, sessionState]);

  // Build domain-weighted question set
  const startExamSession = () => {
    if (usableQuestions.length === 0) return;
    const d1Pool = usableQuestions.filter((q) => q.domainId === 1);
    const d2Pool = usableQuestions.filter((q) => q.domainId === 2);
    const d3Pool = usableQuestions.filter((q) => q.domainId === 3);

    const targetCount = Math.max(5, configQuestionCount);
    const d1Target = Math.round(targetCount * 0.425);
    const d2Target = Math.round(targetCount * 0.375);
    const d3Target = Math.max(1, targetCount - d1Target - d2Target);

    const pickFromPool = (pool: Question[], count: number): Question[] => {
      if (pool.length === 0) return [];
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const result: Question[] = [];
      for (let i = 0; i < count; i++) {
        result.push(shuffled[i % shuffled.length]);
      }
      return result;
    };

    const combined = [
      ...pickFromPool(d1Pool.length ? d1Pool : usableQuestions, d1Target),
      ...pickFromPool(d2Pool.length ? d2Pool : usableQuestions, d2Target),
      ...pickFromPool(d3Pool.length ? d3Pool : usableQuestions, d3Target),
    ]
      .slice(0, targetCount)
      .sort(() => Math.random() - 0.5);

    setExamQuestions(combined);
    setCurrentIndex(0);
    setAnswers({});
    setFlaggedIndices([]);
    setSecondsRemaining(configTimeMinutes * 60);
    setCompletedResult(null);
    setSessionState('active');
  };

  const evaluateQuestionAnswer = (
    q: Question,
    userAns: string | string[] | Record<string, string> | undefined
  ): { isCorrect: boolean; partialScore: number } => {
    if (userAns === undefined || userAns === '') {
      return { isCorrect: false, partialScore: 0 };
    }
    if (q.type === 'single_choice' || q.type === 'case_study') {
      const expected = String(q.verifiedAnswerKey || q.originalAnswerKey);
      const ok = String(userAns) === expected;
      return { isCorrect: ok, partialScore: ok ? 1 : 0 };
    }
    if (q.type === 'multi_select') {
      const picked = Array.isArray(userAns) ? userAns : [];
      const expectedArr = Array.isArray(q.verifiedAnswerKey)
        ? q.verifiedAnswerKey
        : String(q.verifiedAnswerKey)
            .split(',')
            .map((s) => s.trim());
      const expectedSet = new Set(expectedArr);
      let hits = 0;
      let wrong = 0;
      for (const p of picked) {
        if (expectedSet.has(p)) hits++;
        else wrong++;
      }
      const score = Math.max(
        0,
        Number(((hits - wrong * 0.5) / Math.max(1, expectedSet.size)).toFixed(2))
      );
      return {
        isCorrect: hits === expectedSet.size && wrong === 0,
        partialScore: score,
      };
    }
    if (q.type === 'yes_no' && q.yesNoStatements) {
      const mapAns =
        typeof userAns === 'object' && !Array.isArray(userAns) ? userAns : {};
      let hits = 0;
      for (const s of q.yesNoStatements) {
        if (mapAns[s.id] === s.correctAnswer) hits++;
      }
      const score = Number(
        (hits / Math.max(1, q.yesNoStatements.length)).toFixed(2)
      );
      return {
        isCorrect: hits === q.yesNoStatements.length,
        partialScore: score,
      };
    }
    if (
      (q.type === 'hotspot' || q.type === 'kql_completion') &&
      q.interactiveSlots
    ) {
      const mapAns =
        typeof userAns === 'object' && !Array.isArray(userAns) ? userAns : {};
      let hits = 0;
      for (const slot of q.interactiveSlots) {
        if (mapAns[slot.id] === slot.correctChoice) hits++;
      }
      const score = Number(
        (hits / Math.max(1, q.interactiveSlots.length)).toFixed(2)
      );
      return {
        isCorrect: hits === q.interactiveSlots.length,
        partialScore: score,
      };
    }
    if (q.type === 'drag_drop' && q.dragDropTargetOrder) {
      const arrAns = Array.isArray(userAns) ? userAns : [];
      let hits = 0;
      for (let i = 0; i < q.dragDropTargetOrder.length; i++) {
        if (arrAns[i] === q.dragDropTargetOrder[i]) hits++;
      }
      const score = Number(
        (hits / Math.max(1, q.dragDropTargetOrder.length)).toFixed(2)
      );
      return {
        isCorrect: hits === q.dragDropTargetOrder.length,
        partialScore: score,
      };
    }
    return { isCorrect: false, partialScore: 0 };
  };

  const finalizeExamSubmission = () => {
    const nowIso = new Date().toISOString();
    const timeUsedSeconds = Math.max(
      1,
      configTimeMinutes * 60 - secondsRemaining
    );

    let correctCount = 0;
    let partialCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalScoreSum = 0;

    const attemptsToRecord: UserAttempt[] = [];
    const questionResults = examQuestions.map((q, idx) => {
      const ans = answers[idx];
      const isAnswered =
        ans !== undefined &&
        ans !== '' &&
        !(Array.isArray(ans) && ans.length === 0) &&
        !(typeof ans === 'object' && Object.keys(ans).length === 0);

      if (!isAnswered) {
        unansweredCount += 1;
        return {
          questionId: q.id,
          selectedAnswer: null,
          isCorrect: false,
          partialScore: 0,
          flagged: flaggedIndices.includes(idx),
        };
      }

      const evalRes = evaluateQuestionAnswer(q, ans);
      totalScoreSum += evalRes.partialScore;
      if (evalRes.isCorrect) correctCount += 1;
      else if (evalRes.partialScore > 0) partialCount += 1;
      else incorrectCount += 1;

      attemptsToRecord.push({
        id: `exam-att-${Date.now()}-${idx}`,
        questionId: q.id,
        timestamp: nowIso,
        mode: 'exam',
        selectedAnswer: ans,
        isCorrect: evalRes.isCorrect,
        partialScore: evalRes.partialScore,
        confidence: 'unrated',
        timeSpentSeconds: Math.round(timeUsedSeconds / examQuestions.length),
        isFirstAttempt: false, // Handled accurately by parent recorder
        domainId: q.domainId,
        topicId: q.topicId,
      });

      return {
        questionId: q.id,
        selectedAnswer: ans,
        isCorrect: evalRes.isCorrect,
        partialScore: evalRes.partialScore,
        flagged: flaggedIndices.includes(idx),
      };
    });

    const overallScorePercentage = Math.round(
      (totalScoreSum / Math.max(1, examQuestions.length)) * 100
    );

    const domainBreakdown = syllabus.map((d) => {
      const dIndices = examQuestions
        .map((q, i) => (q.domainId === d.id ? i : -1))
        .filter((i) => i !== -1);
      const dTotal = dIndices.length;
      let dAttempted = 0;
      let dSum = 0;
      for (const i of dIndices) {
        const r = questionResults[i];
        if (r.selectedAnswer !== null) dAttempted += 1;
        dSum += r.partialScore;
      }
      return {
        domainId: d.id,
        domainTitle: d.title,
        attempted: dAttempted,
        total: dTotal,
        scorePercentage: dTotal > 0 ? Math.round((dSum / dTotal) * 100) : 0,
      };
    });

    const allTopics = syllabus.flatMap((d) => d.topics);
    const topicBreakdown = allTopics
      .map((t) => {
        const tIndices = examQuestions
          .map((q, i) => (q.topicId === t.id ? i : -1))
          .filter((i) => i !== -1);
        if (tIndices.length === 0) return null;
        const tSum = tIndices.reduce(
          (acc, i) => acc + questionResults[i].partialScore,
          0
        );
        return {
          topicId: t.id,
          topicTitle: `${t.code} ${t.title}`,
          total: tIndices.length,
          scorePercentage: Math.round((tSum / tIndices.length) * 100),
        };
      })
      .filter((Boolean as unknown) as (x: any) => x is NonNullable<typeof x>);

    const result: ExamSimulationResult = {
      id: `sim-${Date.now()}`,
      completedAt: nowIso,
      totalQuestions: examQuestions.length,
      timeLimitMinutes: configTimeMinutes,
      timeUsedSeconds,
      overallScorePercentage,
      correctCount,
      partialCount,
      incorrectCount,
      unansweredCount,
      domainBreakdown,
      topicBreakdown,
      questionResults,
    };

    setCompletedResult(result);
    setSessionState('completed');
    onSaveSimulationResult(result, attemptsToRecord);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 1. SETUP VIEW
  if (sessionState === 'setup') {
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-6">
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <div className="text-xs text-slate-500">
              Timed Assessment · Balanced Domain Weightings · Hidden Feedback Until Submission
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              SC-200 Exam Simulation
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl">
              Simulate exam conditions with a countdown timer, question navigator, flag-for-review controls, and domain-weighted selection (40–45% Manage Environment, 35–40% Respond to Incidents, 20–25% Perform Threat Hunting).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Number of Questions (Default: 50)
              </label>
              <select
                value={configQuestionCount}
                onChange={(e) => setConfigQuestionCount(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums"
              >
                <option value={10}>10 Questions (Quick Sprint)</option>
                <option value={25}>25 Questions (Half Simulation)</option>
                <option value={50}>50 Questions (Standard SC-200 Default)</option>
                <option value={65}>65 Questions (Extended Endurance Session)</option>
              </select>
              <p className="text-xs text-slate-500">
                Currently {usableQuestions.length} verified/usable unique questions in your local bank. If your target count exceeds the current bank size, questions will cycle proportionally by domain weight.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Time Limit in Minutes (Default: 100 minutes)
              </label>
              <select
                value={configTimeMinutes}
                onChange={(e) => setConfigTimeMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums"
              >
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes</option>
                <option value={100}>100 Minutes (Standard SC-200 Exam Time)</option>
                <option value={120}>120 Minutes (Extended Time)</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-900">
              Important Scoring Disclaimer
            </div>
            <p>
              Practice simulation percentages are internal study-planning indicators and are <strong>not equivalent to Microsoft’s official scaled exam score</strong> (100–1000 scale, passing score 700). Correctness feedback and explanations remain hidden until you submit the simulation.
            </p>
          </div>

          <button
            type="button"
            onClick={startExamSession}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Start Timed Exam Simulation</span>
          </button>
        </div>

        {/* Past Simulation Results */}
        {pastSimulations.length > 0 && (
          <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 font-display">
              Past Simulation History
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Questions</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Correct</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Unanswered</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Practice %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 tabular-nums">
                  {pastSimulations.slice(0, 10).map((sim) => (
                    <tr key={sim.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-800">
                        {sim.completedAt.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {sim.totalQuestions}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {sim.correctCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        {sim.unansweredCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {sim.overallScorePercentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. COMPLETED REVIEW VIEW
  if (sessionState === 'completed' && completedResult) {
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-500">
                Exam Simulation Completed · Internal Practice Indicator (Not an Official Scaled Microsoft Score)
              </div>
              <h2 className="text-2xl font-bold text-slate-900 font-display tabular-nums">
                Practice Score: {completedResult.overallScorePercentage}%
              </h2>
              <p className="text-xs text-slate-600">
                Correct: {completedResult.correctCount} · Partial: {completedResult.partialCount} · Incorrect: {completedResult.incorrectCount} · Unanswered: {completedResult.unansweredCount} (out of {completedResult.totalQuestions})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSessionState('setup')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Simulation</span>
            </button>
          </div>

          {/* Domain Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              Performance by Official Exam Domain
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {completedResult.domainBreakdown.map((d) => (
                <div
                  key={d.domainId}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                >
                  <div className="text-xs font-medium text-slate-500">
                    Domain {d.domainId} ({d.attempted}/{d.total} answered)
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {d.domainTitle}
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums text-sky-700">
                    {d.scorePercentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Question & Explanation Review */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              Complete Question & Explanation Review
            </h3>
            <div className="space-y-4">
              {examQuestions.map((q, idx) => {
                const qRes = completedResult.questionResults[idx];
                return (
                  <div
                    key={`${q.id}-${idx}`}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        Question {idx + 1} · {q.subtopic}
                      </span>
                      {qRes.selectedAnswer === null ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Unanswered
                        </span>
                      ) : qRes.isCorrect ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                          <XCircle className="w-3.5 h-3.5" />
                          Incorrect ({Math.round(qRes.partialScore * 100)}%)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-900 font-medium">{q.stem}</p>
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        Verified Answer:{' '}
                      </span>
                      <span className="font-mono">
                        {JSON.stringify(q.verifiedAnswerKey)}
                      </span>
                      <span className="mx-2">·</span>
                      <span className="font-semibold text-slate-800">
                        Your Answer:{' '}
                      </span>
                      <span className="font-mono">
                        {qRes.selectedAnswer === null
                          ? 'None'
                          : JSON.stringify(qRes.selectedAnswer)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold">Explanation: </span>
                      {q.explanation.whyCorrect}
                    </p>
                    {q.verificationAudit.officialReferences.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {q.verificationAudit.officialReferences.map((r, rIdx) => (
                          <a
                            key={rIdx}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"
                          >
                            <span>{r.title}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. ACTIVE EXAM SIMULATION VIEW
  const activeQuestion = examQuestions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const isFlagged = flaggedIndices.includes(currentIndex);
  const unansweredTotal = examQuestions.filter((_, i) => {
    const a = answers[i];
    return (
      a === undefined ||
      a === '' ||
      (Array.isArray(a) && a.length === 0) ||
      (typeof a === 'object' && Object.keys(a).length === 0)
    );
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Exam Bar with Countdown Timer */}
      <div className="border border-slate-200 bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold font-display">
            Question {currentIndex + 1} of {examQuestions.length}
          </div>
          <span className="text-slate-500">·</span>
          <div className="text-xs text-slate-300">
            Domain {activeQuestion.domainId} · {activeQuestion.difficulty}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums px-3 py-1 rounded-lg ${
              secondsRemaining < 300
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-slate-800 text-sky-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              setFlaggedIndices((prev) =>
                prev.includes(currentIndex)
                  ? prev.filter((i) => i !== currentIndex)
                  : [...prev, currentIndex]
              )
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isFlagged
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{isFlagged ? 'Flagged for Review' : 'Flag for Review'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSessionState('confirm_submit')}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors"
          >
            Finish & Submit Exam
          </button>
        </div>
      </div>

      {/* Confirmation Dialog Before Submitting */}
      {sessionState === 'confirm_submit' && (
        <div className="border border-amber-300 bg-amber-50 rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-950 font-display">
                Confirm Exam Submission
              </h4>
              <p className="text-xs text-amber-900">
                You have <strong>{unansweredTotal} unanswered question(s)</strong> and{' '}
                <strong>{flaggedIndices.length} flagged question(s)</strong> out of{' '}
                {examQuestions.length}. Once submitted, your score and full explanations will be revealed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={finalizeExamSubmission}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              Confirm & Submit Now
            </button>
            <button
              type="button"
              onClick={() => setSessionState('active')}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-amber-300 bg-white text-slate-800 hover:bg-slate-50"
            >
              Return to Questions
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Question Area (8 cols) */}
        <div className="lg:col-span-8 border border-slate-200 bg-white rounded-xl p-6 space-y-5">
          <div className="text-base font-medium text-slate-900 leading-relaxed">
            {activeQuestion.stem}
          </div>

          {/* Single Choice / Case Study */}
          {(activeQuestion.type === 'single_choice' ||
            activeQuestion.type === 'case_study') &&
            activeQuestion.options && (
              <div className="space-y-2.5">
                {activeQuestion.options.map((opt) => {
                  const chosen = currentAnswer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentIndex]: opt.id,
                        }))
                      }
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                        chosen
                          ? 'border-sky-600 bg-sky-50/60 text-slate-900'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-800 shrink-0">
                        {opt.label}
                      </span>
                      <span className="text-sm">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

          {/* Multi Select */}
          {activeQuestion.type === 'multi_select' && activeQuestion.options && (
            <div className="space-y-2.5">
              {activeQuestion.options.map((opt) => {
                const arr = Array.isArray(currentAnswer) ? currentAnswer : [];
                const chosen = arr.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const next = chosen
                        ? arr.filter((x) => x !== opt.id)
                        : [...arr, opt.id];
                      setAnswers((prev) => ({ ...prev, [currentIndex]: next }));
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                      chosen
                        ? 'border-sky-600 bg-sky-50/60 text-slate-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-800 shrink-0">
                      {chosen ? '✓' : opt.label}
                    </span>
                    <span className="text-sm">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Hotspot / KQL Completion */}
          {(activeQuestion.type === 'hotspot' ||
            activeQuestion.type === 'kql_completion') &&
            activeQuestion.interactiveSlots && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs">
                {activeQuestion.interactiveSlots.map((slot) => {
                  const mapAns =
                    typeof currentAnswer === 'object' &&
                    !Array.isArray(currentAnswer)
                      ? currentAnswer
                      : {};
                  return (
                    <div key={slot.id} className="space-y-1">
                      <div className="text-sky-400 font-sans">{slot.label}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        {slot.codePrefix && <span>{slot.codePrefix}</span>}
                        <select
                          value={mapAns[slot.id] || ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [currentIndex]: {
                                ...mapAns,
                                [slot.id]: e.target.value,
                              },
                            }))
                          }
                          className="px-2.5 py-1.5 rounded bg-slate-800 border border-sky-500 text-white"
                        >
                          <option value="">-- Select --</option>
                          {slot.choices.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {slot.codeSuffix && <span>{slot.codeSuffix}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {/* Yes/No or Drag/Drop in Exam Mode */}
          {activeQuestion.type === 'yes_no' && activeQuestion.yesNoStatements && (
            <div className="space-y-3">
              {activeQuestion.yesNoStatements.map((stmt) => {
                const mapAns =
                  typeof currentAnswer === 'object' &&
                  !Array.isArray(currentAnswer)
                    ? currentAnswer
                    : {};
                return (
                  <div
                    key={stmt.id}
                    className="p-3.5 rounded-lg border border-slate-200 flex items-center justify-between gap-4"
                  >
                    <span className="text-xs text-slate-800">{stmt.statement}</span>
                    <div className="flex gap-2 shrink-0">
                      {(['Yes', 'No'] as const).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [currentIndex]: { ...mapAns, [stmt.id]: ch },
                            }))
                          }
                          className={`px-3 py-1 text-xs font-semibold rounded border ${
                            mapAns[stmt.id] === ch
                              ? 'bg-sky-600 border-sky-600 text-white'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeQuestion.type === 'drag_drop' && activeQuestion.dragDropPool && (
            <div className="space-y-2">
              {(Array.isArray(currentAnswer)
                ? currentAnswer
                : activeQuestion.dragDropPool.map((i) => i.id)
              ).map((itemId, idx, arr) => {
                const item = activeQuestion.dragDropPool?.find(
                  (i) => i.id === itemId
                );
                if (!item) return null;
                return (
                  <div
                    key={itemId}
                    className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <span>
                      <strong>Step {idx + 1}:</strong> {item.text}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const copy = [...arr];
                          const tmp = copy[idx - 1];
                          copy[idx - 1] = copy[idx];
                          copy[idx] = tmp;
                          setAnswers((prev) => ({
                            ...prev,
                            [currentIndex]: copy,
                          }));
                        }}
                        className="px-2 py-1 border rounded bg-slate-50"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => {
                          const copy = [...arr];
                          const tmp = copy[idx + 1];
                          copy[idx + 1] = copy[idx];
                          copy[idx] = tmp;
                          setAnswers((prev) => ({
                            ...prev,
                            [currentIndex]: copy,
                          }));
                        }}
                        className="px-2 py-1 border rounded bg-slate-50"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Prev / Next Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={currentIndex >= examQuestions.length - 1}
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(examQuestions.length - 1, i + 1)
                )
              }
              className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question Navigator Grid (4 cols) */}
        <div className="lg:col-span-4 border border-slate-200 bg-white rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              Question Navigator
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {examQuestions.length - unansweredTotal}/{examQuestions.length} Answered
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-1.5">
            {examQuestions.map((_, idx) => {
              const ans = answers[idx];
              const hasAns =
                ans !== undefined &&
                ans !== '' &&
                !(Array.isArray(ans) && ans.length === 0) &&
                !(typeof ans === 'object' && Object.keys(ans).length === 0);
              const flagged = flaggedIndices.includes(idx);
              const active = idx === currentIndex;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg font-mono text-xs font-semibold tabular-nums border transition-all relative ${
                    active
                      ? 'border-sky-600 ring-2 ring-sky-600/20 bg-sky-50 text-sky-900'
                      : hasAns
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                  {flagged && (
                    <span
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500"
                      title="Flagged for review"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
