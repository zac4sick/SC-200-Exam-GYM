export type QuestionType =
  | 'single_choice'
  | 'multi_select'
  | 'yes_no'
  | 'hotspot'
  | 'drag_drop'
  | 'kql_completion'
  | 'case_study';

export type QuestionSource =
  | 'Imported'
  | 'Original Practice'
  | 'Official Resource Reference';

export type Difficulty = 'Easy' | 'Intermediate' | 'Difficult';

export type ExtractionConfidence = 'high' | 'medium' | 'low';

export type VerificationStatus =
  | 'verified'
  | 'disputed'
  | 'unverified'
  | 'needs_review';

export type ConfidenceLevel = 'guessed' | 'unsure' | 'confident' | 'unrated';

export type NavigationTab =
  | 'dashboard'
  | 'practice'
  | 'exam'
  | 'syllabus'
  | 'weak_areas'
  | 'bookmarks'
  | 'wrong_answers'
  | 'visual_learning'
  | 'import_questions'
  | 'settings';

export interface QuestionOption {
  id: string;
  label: string; // e.g., "A", "B", "C", "D" or "Yes", "No"
  text: string;
}

export interface InteractiveSlot {
  id: string;
  label: string; // Prompt or code line label before dropdown, or sequence step position
  codePrefix?: string;
  codeSuffix?: string;
  choices: string[];
  correctChoice: string;
  originalPdfChoice?: string;
}

export interface DragDropItem {
  id: string;
  text: string;
  category?: string;
}

export interface CaseStudySection {
  id: string;
  title: string;
  content: string;
}

export interface QuestionExhibit {
  type: 'table' | 'code' | 'pdf_page' | 'architecture_note';
  title: string;
  content?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  pdfPageNumber?: number;
}

export interface OfficialReference {
  title: string;
  url: string;
  documentedFeature?: string;
  lastUpdated?: string;
}

export interface KqlTableColumn {
  name: string;
  type: string;
  description: string;
}

export interface KqlTableSchema {
  tableName: string;
  platform: 'Microsoft Defender XDR' | 'Microsoft Sentinel' | 'Microsoft Entra ID';
  description: string;
  columns: KqlTableColumn[];
}

export interface KqlOperatorExplanation {
  lineNumber: number;
  codeFragment: string;
  operator: string;
  explanation: string;
}

export interface KqlLearningData {
  tableSchemas: KqlTableSchema[];
  completeQuery: string;
  operatorBreakdown: KqlOperatorExplanation[];
  simulatedOutput: {
    isSimulated: true;
    executionNote: string;
    columns: string[];
    rows: string[][];
  };
  commonMistakes: string[];
}

export interface VisualStep {
  stepNumber: number;
  label: string;
  sublabel: string;
  portalArea?: string;
  actionType?: 'navigate' | 'select' | 'inspect' | 'remediate' | 'query';
}

export interface VisualWalkthrough {
  id: string;
  title: string;
  product:
    | 'Microsoft Defender XDR'
    | 'Microsoft Defender for Endpoint'
    | 'Microsoft Sentinel'
    | 'Microsoft Entra ID'
    | 'Microsoft Purview'
    | 'Microsoft Defender for Cloud'
    | 'KQL & Advanced Hunting'
    | 'Microsoft Security Copilot';
  domainId: 1 | 2 | 3;
  topicId: string;
  isVerifiedPortalPath: boolean;
  portalName: string;
  steps: VisualStep[];
  officialDocUrl: string;
  verificationDate: string;
  conceptualNote?: string;
  relatedQuestionIds?: string[];
}

export interface ExtractionAudit {
  confidence: ExtractionConfidence;
  sourceFileName: string;
  sourcePage: number;
  originalQuestionNumber: string;
  originalAnswerKey: string | string[] | Record<string, string>;
  missingOrAmbiguousFields: string[];
  isUsable: boolean;
  adaptationNote?: string;
  extractedAt: string;
}

export interface VerificationAudit {
  status: VerificationStatus;
  verifiedAnswerKey: string | string[] | Record<string, string>;
  agreesWithOriginal: boolean | null;
  documentedBehavior: string;
  disagreementExplanation?: string;
  knownAmbiguitiesOrAssumptions?: string;
  verifiedDate: string;
  officialReferences: OfficialReference[];
}

export interface QuestionExplanation {
  whyCorrect: string;
  whyOthersIncorrect: Record<string, string>;
  examTip: string;
}

export interface Question {
  id: string;
  fingerprint: string;
  source: QuestionSource;
  type: QuestionType;
  domainId: 1 | 2 | 3;
  topicId: string;
  subtopic: string;
  difficulty: Difficulty;
  stem: string;
  scenarioContext?: string;
  caseStudyTitle?: string;
  caseStudySections?: CaseStudySection[];
  exhibit?: QuestionExhibit;
  // Standard single / multi / yes_no options
  options?: QuestionOption[];
  // Yes/No multi-statement questions (e.g., Q26-28 in PDF)
  yesNoStatements?: {
    id: string;
    statement: string;
    correctAnswer: 'Yes' | 'No';
    originalPdfAnswer?: 'Yes' | 'No';
    explanation: string;
  }[];
  // Hotspot or KQL completion dropdown slots
  interactiveSlots?: InteractiveSlot[];
  // Drag and drop / sequencing items
  dragDropPool?: DragDropItem[];
  dragDropTargetOrder?: string[]; // ordered array of DragDropItem.id
  originalDragDropOrder?: string[];
  // Answer keys & Audits
  originalAnswerKey: string | string[] | Record<string, string>;
  verifiedAnswerKey: string | string[] | Record<string, string>;
  extractionAudit: ExtractionAudit;
  verificationAudit: VerificationAudit;
  explanation: QuestionExplanation;
  kqlLearning?: KqlLearningData;
  visualWalkthrough?: VisualWalkthrough;
  parentQuestionId?: string; // If generated as an equivalent concept-transfer question
}

export interface UserAttempt {
  id: string;
  questionId: string;
  timestamp: string;
  mode: 'practice' | 'exam' | 'focus';
  selectedAnswer: string | string[] | Record<string, string>;
  isCorrect: boolean;
  partialScore: number; // 0.0 to 1.0
  confidence: ConfidenceLevel;
  timeSpentSeconds: number;
  isFirstAttempt: boolean;
  domainId: 1 | 2 | 3;
  topicId: string;
}

export interface SpacedRepetitionItem {
  questionId: string;
  topicId: string;
  domainId: 1 | 2 | 3;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: string;
  lastConfidence: ConfidenceLevel;
  lastCorrect: boolean;
  consecutiveConfidentCorrect: number;
  needsEquivalentConceptTest: boolean;
}

export interface SyllabusSubtopic {
  id: string;
  title: string;
  keywords: string[];
  isNewOrUpdated2025?: boolean;
}

export interface SyllabusTopic {
  id: string;
  domainId: 1 | 2 | 3;
  code: string;
  title: string;
  description: string;
  subtopics: SyllabusSubtopic[];
  officialUrl: string;
  lastVerifiedDate: string;
}

export interface SyllabusDomain {
  id: 1 | 2 | 3;
  title: string;
  weightMin: number;
  weightMax: number;
  normalizedWeight: number; // 0.425, 0.375, 0.200
  description: string;
  topics: SyllabusTopic[];
}

export interface ImportReviewItem {
  id: string;
  sourceFileName: string;
  sourcePage: number;
  originalQuestionNumber: string;
  rawStem: string;
  detectedType: QuestionType;
  missingOrAmbiguousFields: string[];
  originalAnswerKeyRaw: string;
  extractionConfidence: ExtractionConfidence;
  suggestedDomainId: 1 | 2 | 3;
  suggestedTopicId: string;
  optionsDraft: QuestionOption[];
  status: 'pending_review' | 'resolved' | 'discarded';
  createdAt: string;
}

export interface ImportJobState {
  id: string;
  fileName: string;
  totalPages: number;
  processedPages: number;
  lastCompletedPage: number;
  batchSize: number;
  currentBatch: number;
  totalBatches: number;
  discoveredCount: number;
  importedUsableCount: number;
  duplicateCount: number;
  skippedCount: number;
  needsReviewCount: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  lastError?: string;
  updatedAt: string;
  userConsentedToGeminiProcessing: boolean;
}

export interface ExamSimulationResult {
  id: string;
  completedAt: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  timeUsedSeconds: number;
  overallScorePercentage: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  unansweredCount: number;
  domainBreakdown: {
    domainId: 1 | 2 | 3;
    domainTitle: string;
    attempted: number;
    total: number;
    scorePercentage: number;
  }[];
  topicBreakdown: {
    topicId: string;
    topicTitle: string;
    scorePercentage: number;
    total: number;
  }[];
  questionResults: {
    questionId: string;
    selectedAnswer: string | string[] | Record<string, string> | null;
    isCorrect: boolean;
    partialScore: number;
    flagged: boolean;
  }[];
}

export interface AppSettings {
  practiceQuestionCount: number;
  defaultStudyMode: 'practice' | 'focus' | 'exam';
  defaultDifficulty: 'All' | Difficulty;
  defaultDomainId: 'All' | 1 | 2 | 3;
  examTimeLimitMinutes: number;
  examQuestionCount: number;
  randomizeQuestionOrder: boolean;
  repeatAnsweredQuestions: boolean;
  showVisualWalkthroughAutomaticallyOnWrong: boolean;
  geminiTransmissionConsentGranted: boolean;
}

export interface ReadinessBand {
  label:
    | 'Not enough practice data yet'
    | 'Major revision required'
    | 'Developing'
    | 'Getting close'
    | 'Strong practice performance';
  minScore: number;
  maxScore: number;
  description: string;
  statusTone: 'neutral' | 'error' | 'warning' | 'info' | 'success';
}

export interface TopicReadinessMetric {
  topicId: string;
  topicCode: string;
  topicTitle: string;
  domainId: 1 | 2 | 3;
  totalAvailableQuestions: number;
  uniqueAttemptedCount: number;
  firstAttemptAccuracy: number; // 0-100
  overallAccuracy: number; // 0-100
  coveragePercentage: number; // 0-100
  lowConfidenceCount: number;
  repeatedMistakesCount: number;
  masteryScore: number; // 0-100
  officialUrl: string;
}

export interface DomainReadinessMetric {
  domainId: 1 | 2 | 3;
  title: string;
  publishedWeightRange: string;
  normalizedWeight: number;
  uniqueAttempted: number;
  totalAvailable: number;
  firstAttemptAccuracy: number;
  overallAccuracy: number;
  coveragePercentage: number;
  weightedDomainScore: number;
}

export interface ReadinessReport {
  hasSufficientEvidence: boolean;
  minimumQuestionsRequired: number;
  minimumDomainsRequired: number;
  overallReadinessScore: number; // 0-100
  rawWeightedAccuracy: number; // 0-100 before volume/coverage confidence penalty
  confidenceMultiplier: number; // 0.0-1.0
  readinessBand: ReadinessBand;
  uncertaintyReasons: string[];
  totalQuestionsAttempted: number;
  uniqueQuestionsAttempted: number;
  totalUsableQuestionsInBank: number;
  firstAttemptAccuracy: number;
  overallAccuracy: number;
  syllabusCoveragePercentage: number;
  domainMetrics: DomainReadinessMetric[];
  topicMetrics: TopicReadinessMetric[];
  topWeaknesses: TopicReadinessMetric[];
  dueForSpacedRepetitionCount: number;
  recommendedNextSession: {
    mode: 'focus' | 'practice';
    title: string;
    reason: string;
    targetTopicId?: string;
    targetDomainId?: 1 | 2 | 3;
    questionIds: string[];
  };
  recentTrend: {
    dateLabel: string;
    accuracy: number;
    questionsCount: number;
  }[];
}
