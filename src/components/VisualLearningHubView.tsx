import React, { useState } from 'react';
import { VISUAL_WALKTHROUGHS } from '../data/visualDiagramsData';
import { VisualWalkthroughDiagram } from './VisualWalkthroughDiagram';
import { KqlLearningPanel } from './KqlLearningPanel';
import { Question } from '../types';
import { Compass, Terminal, Play } from 'lucide-react';

interface VisualLearningHubViewProps {
  questions: Question[];
  onJumpToQuestion: (questionId: string) => void;
}

export const VisualLearningHubView: React.FC<VisualLearningHubViewProps> = ({
  questions,
  onJumpToQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'portal_diagrams' | 'kql_lab'>(
    'portal_diagrams'
  );
  const [productFilter, setProductFilter] = useState<string>('All');
  const [domainFilter, setDomainFilter] = useState<'All' | 1 | 2 | 3>('All');

  const products = Array.from(
    new Set(VISUAL_WALKTHROUGHS.map((v) => v.product))
  );

  const filteredWalkthroughs = VISUAL_WALKTHROUGHS.filter((vw) => {
    if (productFilter !== 'All' && vw.product !== productFilter) return false;
    if (domainFilter !== 'All' && vw.domainId !== domainFilter) return false;
    return true;
  });

  const kqlQuestions = questions.filter((q) => Boolean(q.kqlLearning));

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">
              Portal Navigation Breadcrumbs · Attack-Chain Workflows · Progressive KQL Schemas
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Visual Learning & Interactive KQL Architecture Lab
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('portal_diagrams')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'portal_diagrams'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              <span>Portal & Investigation Diagrams ({VISUAL_WALKTHROUGHS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kql_lab')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'kql_lab'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-sky-600" />
              <span>Progressive KQL Lab ({kqlQuestions.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'portal_diagrams' && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              aria-label="Filter diagrams by Microsoft product"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="All">Product: All Microsoft Security Workloads</option>
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={domainFilter}
              onChange={(e) =>
                setDomainFilter(
                  e.target.value === 'All' ? 'All' : (Number(e.target.value) as 1 | 2 | 3)
                )
              }
              aria-label="Filter diagrams by exam domain"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="All">Domain: All Exam Domains</option>
              <option value={1}>Domain 1: Manage SecOps Environment</option>
              <option value={2}>Domain 2: Respond to Incidents</option>
              <option value={3}>Domain 3: Perform Threat Hunting</option>
            </select>
          </div>
        )}
      </div>

      {activeTab === 'portal_diagrams' ? (
        <div className="space-y-6">
          {filteredWalkthroughs.map((vw) => (
            <div key={vw.id} className="space-y-2">
              <VisualWalkthroughDiagram walkthrough={vw} />
              {vw.relatedQuestionIds && vw.relatedQuestionIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-2 text-xs text-slate-600">
                  <span className="font-medium">Related Practice Questions:</span>
                  {vw.relatedQuestionIds.map((qId) => {
                    const qObj = questions.find((q) => q.id === qId);
                    if (!qObj) return null;
                    return (
                      <button
                        key={qId}
                        type="button"
                        onClick={() => onJumpToQuestion(qId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-sky-700 font-medium"
                      >
                        <Play className="w-3 h-3" />
                        <span>
                          Practice Q#{qObj.extractionAudit.originalQuestionNumber} ({qObj.subtopic.slice(0, 32)}...)
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {kqlQuestions.map((q, index) => (
            <div key={q.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="text-sm font-bold text-slate-900 font-display">
                  Progressive KQL Module 0{index + 1}: {q.subtopic} ({q.difficulty})
                </div>
                <button
                  type="button"
                  onClick={() => onJumpToQuestion(q.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Practice Interactive KQL Exercise</span>
                </button>
              </div>
              {q.kqlLearning && <KqlLearningPanel kqlData={q.kqlLearning} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
