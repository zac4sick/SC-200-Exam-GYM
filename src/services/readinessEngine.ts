import {
  Question,
  UserAttempt,
  SpacedRepetitionItem,
  SyllabusDomain,
  ReadinessReport,
  ReadinessBand,
  DomainReadinessMetric,
  TopicReadinessMetric,
  ConfidenceLevel,
} from '../types';

const MINIMUM_QUESTIONS_FOR_READINESS = 12;
const MINIMUM_DOMAINS_ATTEMPTED = 2;

export function getReadinessBand(
  score: number,
  hasSufficientEvidence: boolean
): ReadinessBand {
  if (!hasSufficientEvidence) {
    return {
      label: 'Not enough practice data yet',
      minScore: 0,
      maxScore: 100,
      description:
        'Attempt at least 12 unique questions across at least 2 exam domains to unlock a meaningful readiness estimate.',
      statusTone: 'neutral',
    };
  }
  if (score < 60) {
    return {
      label: 'Major revision required',
      minScore: 0,
      maxScore: 59,
      description:
        'Core domain concepts or KQL patterns show significant gaps. Focus on syllabus fundamentals and walkthroughs before attempting full simulations.',
      statusTone: 'error',
    };
  }
  if (score < 75) {
    return {
      label: 'Developing',
      minScore: 60,
      maxScore: 74,
      description:
        'Foundational knowledge is forming, but weak subtopics or low-confidence guesses still pose a risk under timed scenario conditions.',
      statusTone: 'warning',
    };
  }
  if (score < 85) {
    return {
      label: 'Getting close',
      minScore: 75,
      maxScore: 84,
      description:
        'Solid accuracy across most domains. Target your top weak topics and clear your spaced-repetition queue to strengthen consistency.',
      statusTone: 'info',
    };
  }
  return {
    label: 'Strong practice performance',
    minScore: 85,
    maxScore: 100,
    description:
      'Strong first-attempt performance and broad syllabus coverage. Remember this is an internal study indicator, not a guarantee of an official passing score.',
    statusTone: 'success',
  };
}

export function updateSpacedRepetitionItem(
  existing: SpacedRepetitionItem | undefined,
  question: Question,
  isCorrect: boolean,
  confidence: ConfidenceLevel
): SpacedRepetitionItem {
  const now = new Date();
  let easeFactor = existing?.easeFactor ?? 2.3;
  let intervalDays = existing?.intervalDays ?? 1;
  let consecutiveConfidentCorrect = existing?.consecutiveConfidentCorrect ?? 0;
  let needsEquivalentConceptTest = false;

  if (!isCorrect) {
    easeFactor = Math.max(1.3, easeFactor - 0.3);
    intervalDays = 0; // Due immediately today
    consecutiveConfidentCorrect = 0;
    needsEquivalentConceptTest = true;
  } else if (confidence === 'guessed') {
    easeFactor = Math.max(1.4, easeFactor - 0.15);
    intervalDays = 0; // Guessed right -> still due today for real verification
    consecutiveConfidentCorrect = 0;
    needsEquivalentConceptTest = true;
  } else if (confidence === 'unsure') {
    intervalDays = 1;
    consecutiveConfidentCorrect = 0;
    needsEquivalentConceptTest = true;
  } else {
    // Correct + confident (or unrated)
    consecutiveConfidentCorrect += 1;
    if (consecutiveConfidentCorrect === 1) {
      intervalDays = 2;
    } else if (consecutiveConfidentCorrect === 2) {
      intervalDays = 5;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    easeFactor = Math.min(2.8, easeFactor + 0.1);
  }

  const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    questionId: question.id,
    topicId: question.topicId,
    domainId: question.domainId,
    easeFactor,
    intervalDays,
    nextReviewDate: nextDate.toISOString(),
    lastConfidence: confidence,
    lastCorrect: isCorrect,
    consecutiveConfidentCorrect,
    needsEquivalentConceptTest,
  };
}

export function computeReadinessReport(
  questions: Question[],
  attempts: UserAttempt[],
  spacedRepetition: SpacedRepetitionItem[],
  syllabus: SyllabusDomain[]
): ReadinessReport {
  // Only count usable questions (exclude incomplete/malformed questions)
  const usableQuestions = questions.filter((q) => q.extractionAudit.isUsable);
  const usableQuestionIds = new Set(usableQuestions.map((q) => q.id));

  const validAttempts = attempts.filter((a) => usableQuestionIds.has(a.questionId));

  // Separate first attempts per question from repeated attempts
  const firstAttemptByQuestion = new Map<string, UserAttempt>();
  const allAttemptsByQuestion = new Map<string, UserAttempt[]>();

  // Sort chronologically ascending
  const sortedAttempts = [...validAttempts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const att of sortedAttempts) {
    if (!firstAttemptByQuestion.has(att.questionId)) {
      firstAttemptByQuestion.set(att.questionId, att);
    }
    const list = allAttemptsByQuestion.get(att.questionId) || [];
    list.push(att);
    allAttemptsByQuestion.set(att.questionId, list);
  }

  const uniqueQuestionsAttempted = firstAttemptByQuestion.size;
  const totalQuestionsAttempted = validAttempts.length;
  const totalUsableQuestionsInBank = usableQuestions.length;

  // Overall first-attempt accuracy vs all-attempt accuracy
  let firstAttemptScoreSum = 0;
  firstAttemptByQuestion.forEach((att) => {
    // Discount guessed first-attempt lucky hits slightly in mastery modeling
    const confFactor = att.confidence === 'guessed' ? 0.65 : att.confidence === 'unsure' ? 0.85 : 1.0;
    firstAttemptScoreSum += att.partialScore * confFactor;
  });

  const firstAttemptRawSum = Array.from(firstAttemptByQuestion.values()).reduce(
    (acc, a) => acc + a.partialScore,
    0
  );

  const firstAttemptAccuracy =
    uniqueQuestionsAttempted > 0
      ? Math.round((firstAttemptRawSum / uniqueQuestionsAttempted) * 100)
      : 0;

  const overallAccuracy =
    totalQuestionsAttempted > 0
      ? Math.round(
          (validAttempts.reduce((acc, a) => acc + a.partialScore, 0) /
            totalQuestionsAttempted) *
            100
        )
      : 0;

  // Topic-level metrics
  const topicMetrics: TopicReadinessMetric[] = [];
  for (const domain of syllabus) {
    for (const topic of domain.topics) {
      const topicQuestions = usableQuestions.filter((q) => q.topicId === topic.id);
      const topicAttempts = validAttempts.filter((a) => a.topicId === topic.id);
      const topicFirstAttempts = Array.from(firstAttemptByQuestion.values()).filter(
        (a) => a.topicId === topic.id
      );

      const uniqueAttemptedCount = topicFirstAttempts.length;
      const totalAvailableQuestions = topicQuestions.length;

      const tFirstAcc =
        uniqueAttemptedCount > 0
          ? Math.round(
              (topicFirstAttempts.reduce((s, a) => s + a.partialScore, 0) /
                uniqueAttemptedCount) *
                100
            )
          : 0;

      const tOverallAcc =
        topicAttempts.length > 0
          ? Math.round(
              (topicAttempts.reduce((s, a) => s + a.partialScore, 0) /
                topicAttempts.length) *
                100
            )
          : 0;

      const coveragePercentage =
        totalAvailableQuestions > 0
          ? Math.min(100, Math.round((uniqueAttemptedCount / totalAvailableQuestions) * 100))
          : 0;

      const lowConfidenceCount = topicAttempts.filter(
        (a) => a.confidence === 'guessed' || a.confidence === 'unsure'
      ).length;

      let repeatedMistakesCount = 0;
      for (const q of topicQuestions) {
        const qAtts = allAttemptsByQuestion.get(q.id) || [];
        const wrongCount = qAtts.filter((a) => !a.isCorrect).length;
        if (wrongCount >= 2) repeatedMistakesCount += 1;
      }

      // Topic mastery blends first-attempt accuracy (70%), latest accuracy (30%), penalized by repeated mistakes
      const masteryScore =
        uniqueAttemptedCount === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (tFirstAcc * 0.7 + tOverallAcc * 0.3) *
                    (0.5 + 0.5 * (coveragePercentage / 100)) -
                    repeatedMistakesCount * 8
                )
              )
            );

      topicMetrics.push({
        topicId: topic.id,
        topicCode: topic.code,
        topicTitle: topic.title,
        domainId: domain.id,
        totalAvailableQuestions,
        uniqueAttemptedCount,
        firstAttemptAccuracy: tFirstAcc,
        overallAccuracy: tOverallAcc,
        coveragePercentage,
        lowConfidenceCount,
        repeatedMistakesCount,
        masteryScore,
        officialUrl: topic.officialUrl,
      });
    }
  }

  // Domain-level metrics
  const domainMetrics: DomainReadinessMetric[] = syllabus.map((domain) => {
    const dQuestions = usableQuestions.filter((q) => q.domainId === domain.id);
    const dFirstAttempts = Array.from(firstAttemptByQuestion.values()).filter(
      (a) => a.domainId === domain.id
    );
    const dAllAttempts = validAttempts.filter((a) => a.domainId === domain.id);

    const uniqueAttempted = dFirstAttempts.length;
    const totalAvailable = dQuestions.length;

    const dFirstAcc =
      uniqueAttempted > 0
        ? Math.round(
            (dFirstAttempts.reduce((s, a) => s + a.partialScore, 0) /
              uniqueAttempted) *
              100
          )
        : 0;

    const dOverallAcc =
      dAllAttempts.length > 0
        ? Math.round(
            (dAllAttempts.reduce((s, a) => s + a.partialScore, 0) /
              dAllAttempts.length) *
              100
          )
        : 0;

    const coveragePercentage =
      totalAvailable > 0
        ? Math.min(100, Math.round((uniqueAttempted / totalAvailable) * 100))
        : 0;

    // Domain score prioritizes first-attempt accuracy (75%) + overall (25%)
    const effectiveDomainAcc =
      uniqueAttempted > 0 ? dFirstAcc * 0.75 + dOverallAcc * 0.25 : 0;

    return {
      domainId: domain.id,
      title: domain.title,
      publishedWeightRange: `${domain.weightMin}–${domain.weightMax}%`,
      normalizedWeight: domain.normalizedWeight,
      uniqueAttempted,
      totalAvailable,
      firstAttemptAccuracy: dFirstAcc,
      overallAccuracy: dOverallAcc,
      coveragePercentage,
      weightedDomainScore: Math.round(effectiveDomainAcc * domain.normalizedWeight),
    };
  });

  const domainsAttemptedCount = domainMetrics.filter(
    (d) => d.uniqueAttempted > 0
  ).length;

  const topicsAttemptedCount = topicMetrics.filter(
    (t) => t.uniqueAttemptedCount > 0
  ).length;
  const syllabusCoveragePercentage =
    topicMetrics.length > 0
      ? Math.round((topicsAttemptedCount / topicMetrics.length) * 100)
      : 0;

  const rawWeightedAccuracy = Math.round(
    domainMetrics.reduce((sum, d) => sum + d.weightedDomainScore, 0)
  );

  // Volume and coverage confidence factor so 3 lucky answers cannot show 95% readiness
  const volumeFactor = Math.min(1, uniqueQuestionsAttempted / 25);
  const breadthFactor = Math.min(1, syllabusCoveragePercentage / 75);
  const confidenceMultiplier = Number(
    (0.45 * volumeFactor + 0.55 * breadthFactor).toFixed(2)
  );

  const hasSufficientEvidence =
    uniqueQuestionsAttempted >= MINIMUM_QUESTIONS_FOR_READINESS &&
    domainsAttemptedCount >= MINIMUM_DOMAINS_ATTEMPTED;

  const overallReadinessScore = hasSufficientEvidence
    ? Math.round(rawWeightedAccuracy * Math.max(0.55, confidenceMultiplier))
    : Math.round(rawWeightedAccuracy * confidenceMultiplier);

  const uncertaintyReasons: string[] = [];
  if (uniqueQuestionsAttempted < MINIMUM_QUESTIONS_FOR_READINESS) {
    uncertaintyReasons.push(
      `Only ${uniqueQuestionsAttempted} unique questions attempted so far (at least ${MINIMUM_QUESTIONS_FOR_READINESS} required for initial readiness baseline).`
    );
  }
  if (syllabusCoveragePercentage < 70) {
    uncertaintyReasons.push(
      `Syllabus topic coverage is ${syllabusCoveragePercentage}% (${topicsAttemptedCount} of ${topicMetrics.length} official topics practiced). Unpracticed topics could appear heavily on your exam.`
    );
  }
  for (const d of domainMetrics) {
    if (d.uniqueAttempted < 3) {
      uncertaintyReasons.push(
        `Domain ${d.domainId} (${d.title}, weight ${d.publishedWeightRange}) has only ${d.uniqueAttempted} unique question(s) attempted.`
      );
    } else if (d.firstAttemptAccuracy < 70) {
      uncertaintyReasons.push(
        `First-attempt accuracy in Domain ${d.domainId} (${d.title}) is ${d.firstAttemptAccuracy}%, below the 70% target.`
      );
    }
  }
  const lowConfTotal = validAttempts.filter(
    (a) => a.confidence === 'guessed' || a.confidence === 'unsure'
  ).length;
  if (lowConfTotal > 0) {
    uncertaintyReasons.push(
      `${lowConfTotal} attempt(s) were marked as "Guessed" or "Unsure", indicating concepts that should be verified with equivalent new questions.`
    );
  }

  // Top 5 weaknesses (prioritize attempted topics with lowest mastery, then unattempted topics in high-weight domains)
  const topWeaknesses = [...topicMetrics]
    .sort((a, b) => {
      if (a.uniqueAttemptedCount > 0 && b.uniqueAttemptedCount === 0) return -1;
      if (a.uniqueAttemptedCount === 0 && b.uniqueAttemptedCount > 0) return 1;
      if (a.uniqueAttemptedCount > 0 && b.uniqueAttemptedCount > 0) {
        return a.masteryScore - b.masteryScore;
      }
      return a.domainId - b.domainId;
    })
    .slice(0, 5);

  const nowIso = new Date().toISOString();
  const dueForSpacedRepetitionCount = spacedRepetition.filter(
    (sr) => sr.nextReviewDate <= nowIso || !sr.lastCorrect || sr.lastConfidence === 'guessed'
  ).length;

  // Build Focus Mode recommended session
  const focusQuestions = buildFocusModeQueue(
    usableQuestions,
    validAttempts,
    spacedRepetition,
    topicMetrics,
    10
  );

  const weakestTopic = topWeaknesses[0];
  const recommendedNextSession = {
    mode: 'focus' as const,
    title:
      dueForSpacedRepetitionCount > 0
        ? `Spaced Repetition & Weak-Area Focus (${focusQuestions.length} Questions)`
        : weakestTopic
        ? `Target Weak Area: ${weakestTopic.topicCode} ${weakestTopic.topicTitle}`
        : 'Balanced Diagnostic Practice Session',
    reason:
      dueForSpacedRepetitionCount > 0
        ? `You have ${dueForSpacedRepetitionCount} item(s) due for spaced repetition (incorrect or low-confidence answers) plus uncovered syllabus objectives.`
        : weakestTopic && weakestTopic.uniqueAttemptedCount > 0
        ? `Your lowest topic mastery is in ${weakestTopic.topicCode} (${weakestTopic.firstAttemptAccuracy}% first-attempt accuracy).`
        : 'Expand your first-attempt baseline across all three official SC-200 exam domains.',
    targetTopicId: weakestTopic?.topicId,
    targetDomainId: weakestTopic?.domainId,
    questionIds: focusQuestions.map((q) => q.id),
  };

  // Recent trend grouped by day (or session chunks)
  const byDay = new Map<string, { sum: number; count: number }>();
  for (const att of sortedAttempts) {
    const day = att.timestamp.slice(0, 10);
    const cur = byDay.get(day) || { sum: 0, count: 0 };
    cur.sum += att.partialScore;
    cur.count += 1;
    byDay.set(day, cur);
  }
  const recentTrend = Array.from(byDay.entries())
    .slice(-7)
    .map(([dateLabel, val]) => ({
      dateLabel,
      accuracy: Math.round((val.sum / val.count) * 100),
      questionsCount: val.count,
    }));

  return {
    hasSufficientEvidence,
    minimumQuestionsRequired: MINIMUM_QUESTIONS_FOR_READINESS,
    minimumDomainsRequired: MINIMUM_DOMAINS_ATTEMPTED,
    overallReadinessScore,
    rawWeightedAccuracy,
    confidenceMultiplier,
    readinessBand: getReadinessBand(overallReadinessScore, hasSufficientEvidence),
    uncertaintyReasons,
    totalQuestionsAttempted,
    uniqueQuestionsAttempted,
    totalUsableQuestionsInBank,
    firstAttemptAccuracy,
    overallAccuracy,
    syllabusCoveragePercentage,
    domainMetrics,
    topicMetrics,
    topWeaknesses,
    dueForSpacedRepetitionCount,
    recommendedNextSession,
    recentTrend,
  };
}

export function buildFocusModeQueue(
  usableQuestions: Question[],
  attempts: UserAttempt[],
  spacedRepetition: SpacedRepetitionItem[],
  topicMetrics: TopicReadinessMetric[],
  limit = 15
): Question[] {
  const nowIso = new Date().toISOString();
  const srMap = new Map(spacedRepetition.map((s) => [s.questionId, s]));
  const topicAccuracyMap = new Map(
    topicMetrics.map((t) => [t.topicId, t.firstAttemptAccuracy])
  );
  const topicAttemptCountMap = new Map(
    topicMetrics.map((t) => [t.topicId, t.uniqueAttemptedCount])
  );

  const attemptCountByQ = new Map<string, number>();
  const lastCorrectByQ = new Map<string, boolean>();
  for (const a of attempts) {
    attemptCountByQ.set(a.questionId, (attemptCountByQ.get(a.questionId) || 0) + 1);
    lastCorrectByQ.set(a.questionId, a.isCorrect);
  }

  // Score each question for Focus Mode priority
  const scored = usableQuestions.map((q) => {
    let priority = 0;
    const sr = srMap.get(q.id);
    const attCount = attemptCountByQ.get(q.id) || 0;
    const lastCorrect = lastCorrectByQ.get(q.id);
    const topicAcc = topicAccuracyMap.get(q.topicId) ?? 0;
    const topicAttempts = topicAttemptCountMap.get(q.topicId) ?? 0;

    // 1. Answered incorrectly on most recent attempt
    if (attCount > 0 && lastCorrect === false) {
      priority += 100;
    }
    // 2. Due in spaced repetition or marked Guessed / Unsure
    if (sr) {
      if (sr.lastConfidence === 'guessed') priority += 85;
      else if (sr.lastConfidence === 'unsure') priority += 70;
      if (sr.nextReviewDate <= nowIso) priority += 60;
    }
    // 3. Unattempted question in a topic with poor coverage or low accuracy
    if (attCount === 0) {
      priority += 55;
      if (topicAttempts === 0) priority += 25;
    }
    // 4. Topic has low accuracy (< 70%)
    if (topicAttempts > 0 && topicAcc < 70) {
      priority += 40;
    }
    // 5. Avoid repeatedly showing the same already-mastered question
    if (sr && sr.consecutiveConfidentCorrect >= 2 && sr.nextReviewDate > nowIso) {
      priority -= 90;
    }

    return { question: q, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit).map((item) => item.question);
}
