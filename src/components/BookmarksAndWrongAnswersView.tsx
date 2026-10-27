import React, { useState } from 'react';
import {
  Question,
  UserAttempt,
  SyllabusDomain,
  Difficulty,
  QuestionSource,
} from '../types';
import { VisualWalkthroughDiagram } from './VisualWalkthroughDiagram';
import {
  Bookmark,
  XCircle,
  RotateCcw,
  Trash2,
  ExternalLink,
  FileText,
  BookOpen,
} from 'lucide-react';

interface BookmarksAndWrongAnswersViewProps {
  mode: 'bookmarks' | 'wrong_answers';
  questions: Question[];
  attempts: UserAttempt[];
  bookmarks: string[];
  revisionTopics: string[];
  syllabus: SyllabusDomain[];
  onRetryQuestion: (questionId: string) => void;
  onPracticeTopic: (topicId: string) => void;
  onToggleBookmark: (questionId: string) => void;
  onToggleRevisionTopic: (topicId: string) => void;
}

export const BookmarksAndWrongAnswersView: React.FC<
  BookmarksAndWrongAnswersViewProps
> = ({
  mode,
  questions,
  attempts,
  bookmarks,
  revisionTopics,
  syllabus,
  onRetryQuestion,
  onPracticeTopic,
  onToggleBookmark,
  onToggleRevisionTopic,
}) => {
  // Wrong Answers filters
  const [filterTopic, setFilterTopic] = useState<string>('All');
  const [filterDifficulty, setFilterDifficulty] = useState<'All' | Difficulty>(
    'All'
  );
  const [filterSource, setFilterSource] = useState<'All' | QuestionSource>(
    'All'
  );
  const [filterDateRange, setFilterDateRange] = useState<
    'all' | 'today' | '7d'
  >('all');
  const [expandedWalkthroughId, setExpandedWalkthroughId] = useState<
    string | null
  >(null);

  const allTopics = syllabus.flatMap((d) => d.topics);

  // 1. BOOKMARKS VIEW
  if (mode === 'bookmarks') {
    const bookmarkedQuestions = questions.filter((q) =>
      bookmarks.includes(q.id)
    );
    const savedTopics = allTopics.filter((t) => revisionTopics.includes(t.id));

    return (
      <div className="space-y-6">
        {/* Saved Revision Concepts / Topics */}
        <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-4">
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>Saved Revision Concepts ({savedTopics.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Syllabus topics you marked for targeted concept revision during practice
            </p>
          </div>

          {savedTopics.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 bg-slate-50 rounded-lg">
              No syllabus concepts saved yet. Click "Add Concept to Revision List" after answering any question.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-slate-500">
                      Domain {topic.domainId} · Objective {topic.code}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {topic.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPracticeTopic(topic.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Practice
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleRevisionTopic(topic.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                      title="Remove from revision list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookmarked Questions */}
        <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-4">
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-sky-600" />
              <span>Bookmarked Questions ({bookmarkedQuestions.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Review your saved questions or jump directly into an interactive retry
            </p>
          </div>

          {bookmarkedQuestions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              You have not bookmarked any questions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarkedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Domain {q.domainId} · {q.subtopic} · {q.difficulty} ·{' '}
                      {q.source}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRetryQuestion(q.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Practice Question</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(q.id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        Remove Bookmark
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{q.stem}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. WRONG ANSWERS VIEW
  const wrongAttempts = attempts
    .filter((a) => !a.isCorrect)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  // Deduplicate by questionId (keeping most recent wrong attempt + total mistake count)
  const mistakeRecords: {
    question: Question;
    latestWrongAttempt: UserAttempt;
    mistakeCount: number;
  }[] = [];
  const seenQ = new Set<string>();

  for (const att of wrongAttempts) {
    if (seenQ.has(att.questionId)) continue;
    const q = questions.find((item) => item.id === att.questionId);
    if (!q) continue;
    seenQ.add(att.questionId);
    const mistakeCount = wrongAttempts.filter(
      (x) => x.questionId === att.questionId
    ).length;
    mistakeRecords.push({
      question: q,
      latestWrongAttempt: att,
      mistakeCount,
    });
  }

  const nowMs = Date.now();
  const filteredMistakes = mistakeRecords.filter((rec) => {
    if (filterTopic !== 'All' && rec.question.topicId !== filterTopic)
      return false;
    if (
      filterDifficulty !== 'All' &&
      rec.question.difficulty !== filterDifficulty
    )
      return false;
    if (filterSource !== 'All' && rec.question.source !== filterSource)
      return false;
    if (filterDateRange === 'today') {
      const attDate = rec.latestWrongAttempt.timestamp.slice(0, 10);
      const todayDate = new Date().toISOString().slice(0, 10);
      if (attDate !== todayDate) return false;
    } else if (filterDateRange === '7d') {
      const diffDays =
        (nowMs - new Date(rec.latestWrongAttempt.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      if (diffDays > 7) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">
              Mistake Analysis · Correct Reasoning · Visual Walkthrough · One-Click Retry
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Wrong Answers & Mistake Log ({filteredMistakes.length})
            </h2>
          </div>

          {/* Filters by Date, Topic, Difficulty, and Source */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value as any)}
              aria-label="Filter wrong answers by date"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Date: Today</option>
              <option value="7d">Date: Last 7 Days</option>
            </select>

            <select
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              aria-label="Filter wrong answers by topic"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="All">Topic: All Topics</option>
              {allTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} {t.title.slice(0, 38)}...
                </option>
              ))}
            </select>

            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as any)}
              aria-label="Filter wrong answers by difficulty"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="All">Difficulty: All</option>
              <option value="Easy">Easy</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Difficult">Difficult</option>
            </select>

            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              aria-label="Filter wrong answers by source"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="All">Source: All Sources</option>
              <option value="Imported">Imported</option>
              <option value="Original Practice">Original Practice</option>
              <option value="Official Resource Reference">
                Official Resource Reference
              </option>
            </select>
          </div>
        </div>

        {filteredMistakes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
            No incorrect answers match your current filters. Practice questions in Practice Mode or Exam Simulation to populate your mistake log.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map(
              ({ question, latestWrongAttempt, mistakeCount }) => (
                <div
                  key={question.id}
                  className="p-5 rounded-xl border border-slate-200 bg-white space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                        <XCircle className="w-3.5 h-3.5" />
                        Missed {mistakeCount} time(s)
                      </span>
                      <span>·</span>
                      <span>
                        Last attempt:{' '}
                        {latestWrongAttempt.timestamp
                          .slice(0, 16)
                          .replace('T', ' ')}
                      </span>
                      <span>·</span>
                      <span>{question.difficulty}</span>
                      <span>·</span>
                      <span>{question.source}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRetryQuestion(question.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry Question</span>
                    </button>
                  </div>

                  <p className="text-sm font-medium text-slate-900 leading-relaxed">
                    {question.stem}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-950">
                      <span className="font-semibold">Your Incorrect Answer: </span>
                      <span className="font-mono">
                        {JSON.stringify(latestWrongAttempt.selectedAnswer)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                      <span className="font-semibold">Verified Correct Answer: </span>
                      <span className="font-mono">
                        {JSON.stringify(question.verifiedAnswerKey)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">
                      Correct Reasoning:{' '}
                    </span>
                    {question.explanation.whyCorrect}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-2">
                      {question.verificationAudit.officialReferences.map(
                        (ref, i) => (
                          <a
                            key={i}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"
                          >
                            <span>{ref.title}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )
                      )}
                    </div>

                    {question.visualWalkthrough && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedWalkthroughId(
                            expandedWalkthroughId === question.id
                              ? null
                              : question.id
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>
                          {expandedWalkthroughId === question.id
                            ? 'Hide Visual Walkthrough'
                            : 'Show Visual Walkthrough'}
                        </span>
                      </button>
                    )}
                  </div>

                  {expandedWalkthroughId === question.id &&
                    question.visualWalkthrough && (
                      <VisualWalkthroughDiagram
                        walkthrough={question.visualWalkthrough}
                        compact
                      />
                    )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};
