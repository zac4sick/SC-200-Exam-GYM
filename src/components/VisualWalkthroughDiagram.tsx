import React, { useState } from 'react';
import { VisualWalkthrough } from '../types';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Compass,
  Search,
  ShieldCheck,
  Terminal,
  MousePointerClick,
} from 'lucide-react';

interface VisualWalkthroughDiagramProps {
  walkthrough: VisualWalkthrough;
  compact?: boolean;
}

export const VisualWalkthroughDiagram: React.FC<VisualWalkthroughDiagramProps> = ({
  walkthrough,
  compact = false,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const activeStep = walkthrough.steps[activeStepIndex] || walkthrough.steps[0];

  const getActionIcon = (actionType?: string) => {
    switch (actionType) {
      case 'navigate':
        return <Compass className="w-4 h-4 text-sky-600 shrink-0" />;
      case 'select':
        return <MousePointerClick className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'inspect':
        return <Search className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'remediate':
        return <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'query':
        return <Terminal className="w-4 h-4 text-indigo-600 shrink-0" />;
      default:
        return <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-5 space-y-4">
      {/* Header & Verification Distinction */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-900">{walkthrough.product}</span>
            <span aria-hidden="true">·</span>
            <span>Domain {walkthrough.domainId}</span>
            <span aria-hidden="true">·</span>
            {walkthrough.isVerifiedPortalPath ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Current Portal Navigation (Checked {walkthrough.verificationDate})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                <AlertCircle className="w-3.5 h-3.5" />
                Conceptual Investigation Workflow (Verify exact portal labels in live docs)
              </span>
            )}
          </div>
          <h4 className="text-base font-semibold text-slate-900 font-display">
            {walkthrough.title}
          </h4>
          <p className="text-xs text-slate-500">
            Target Environment: <span className="font-medium text-slate-700">{walkthrough.portalName}</span>
          </p>
        </div>

        <a
          href={walkthrough.officialDocUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <span>Microsoft Learn Reference</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {!walkthrough.isVerifiedPortalPath && walkthrough.conceptualNote && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
          <span className="font-semibold">Conceptual Workflow Notice: </span>
          {walkthrough.conceptualNote}
        </div>
      )}

      {/* Interactive SVG + Step Flow Diagram */}
      <div className="space-y-3">
        <div className="text-xs text-slate-500">
          Select any step below to inspect the portal context and analyst action:
        </div>

        {/* Connected Step Cards with SVG Connectors */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-stretch">
          {walkthrough.steps.map((step, idx) => {
            const isSelected = idx === activeStepIndex;
            return (
              <React.Fragment key={step.stepNumber}>
                <button
                  type="button"
                  onClick={() => setActiveStepIndex(idx)}
                  className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-600/15'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold ${
                        isSelected ? 'text-sky-700' : 'text-slate-500'
                      }`}
                    >
                      Step 0{step.stepNumber}
                    </span>
                    {getActionIcon(step.actionType)}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 leading-snug">
                    {step.label}
                  </div>
                  {step.portalArea && (
                    <div className="text-[11px] text-slate-500 font-mono truncate w-full">
                      {step.portalArea}
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Crisp SVG Flow Schematic Bar */}
        {!compact && (
          <div className="w-full overflow-x-auto py-1">
            <svg
              viewBox="0 0 800 54"
              className="w-full min-w-[560px] h-12 select-none"
              role="img"
              aria-label={`Visual navigation path for ${walkthrough.title}`}
            >
              {/* Connecting baseline */}
              <line
                x1="70"
                y1="27"
                x2="730"
                y2="27"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {/* Active progress line */}
              <line
                x1="70"
                y1="27"
                x2={70 + activeStepIndex * (660 / Math.max(1, walkthrough.steps.length - 1))}
                y2="27"
                stroke="#0284c7"
                strokeWidth="3"
              />
              {walkthrough.steps.map((step, idx) => {
                const cx =
                  70 + idx * (660 / Math.max(1, walkthrough.steps.length - 1));
                const isSelected = idx === activeStepIndex;
                const isPast = idx < activeStepIndex;
                return (
                  <g
                    key={step.stepNumber}
                    onClick={() => setActiveStepIndex(idx)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={cx}
                      cy="27"
                      r={isSelected ? 16 : 13}
                      fill={isSelected ? '#0284c7' : isPast ? '#e0f2fe' : '#ffffff'}
                      stroke={isSelected || isPast ? '#0284c7' : '#94a3b8'}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    <text
                      x={cx}
                      y="31"
                      textAnchor="middle"
                      fontSize="11"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      fill={isSelected ? '#ffffff' : isPast ? '#0369a1' : '#475569'}
                    >
                      {step.stepNumber}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Active Step Detail Card */}
        {activeStep && (
          <div className="p-4 rounded-lg bg-slate-900 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-sky-400 font-mono">
                <span>STEP 0{activeStep.stepNumber} OF 0{walkthrough.steps.length}</span>
                {activeStep.portalArea && (
                  <>
                    <span>·</span>
                    <span>{activeStep.portalArea}</span>
                  </>
                )}
              </div>
              <div className="text-sm font-semibold text-white">
                {activeStep.label}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeStep.sublabel}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={activeStepIndex === 0}
                onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Previous Step
              </button>
              <button
                type="button"
                disabled={activeStepIndex === walkthrough.steps.length - 1}
                onClick={() =>
                  setActiveStepIndex((i) =>
                    Math.min(walkthrough.steps.length - 1, i + 1)
                  )
                }
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Next Step
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
