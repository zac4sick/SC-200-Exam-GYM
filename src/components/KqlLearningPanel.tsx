import React, { useState } from 'react';
import { KqlLearningData } from '../types';
import {
  Terminal,
  Database,
  AlertTriangle,
  Copy,
  Check,
  Code2,
  Table as TableIcon,
} from 'lucide-react';

interface KqlLearningPanelProps {
  kqlData: KqlLearningData;
}

export const KqlLearningPanel: React.FC<KqlLearningPanelProps> = ({ kqlData }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(kqlData.completeQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Terminal className="w-4 h-4 text-sky-600" />
            <span>Technical KQL Breakdown</span>
            <span aria-hidden="true">·</span>
            <span>Schema, Operators & Simulated Output</span>
          </div>
          <h4 className="text-base font-semibold text-slate-900 font-display">
            Kusto Query Language (KQL) Deep Dive
          </h4>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copied Query</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Complete KQL</span>
            </>
          )}
        </button>
      </div>

      {/* 1. Complete KQL Query Block */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Code2 className="w-4 h-4 text-sky-600" />
          <span>Complete Verified KQL Query</span>
        </div>
        <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto">
          <code>{kqlData.completeQuery}</code>
        </pre>
      </div>

      {/* 2. Line-by-Line Operator Breakdown */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold text-slate-700">
          Line-by-Line Operator & Function Explanation
        </div>
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {kqlData.operatorBreakdown.map((op, index) => (
            <div
              key={index}
              className="p-3 bg-white hover:bg-slate-50/80 transition-colors grid grid-cols-1 md:grid-cols-12 gap-2 items-start"
            >
              <div className="md:col-span-5 flex items-start gap-2">
                <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                  L{op.lineNumber}
                </span>
                <code className="text-xs font-mono text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded break-all">
                  {op.codeFragment}
                </code>
              </div>
              <div className="md:col-span-2">
                <span className="text-xs font-mono font-semibold text-slate-800">
                  {op.operator}
                </span>
              </div>
              <div className="md:col-span-5 text-xs text-slate-600 leading-relaxed">
                {op.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Target Table Schemas */}
      {kqlData.tableSchemas && kqlData.tableSchemas.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-sky-600" />
            <span>Referenced Schema Tables & Key Columns</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {kqlData.tableSchemas.map((schema) => (
              <div
                key={schema.tableName}
                className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-900">
                    {schema.tableName}
                  </span>
                  <span className="text-xs text-slate-500">{schema.platform}</span>
                </div>
                <p className="text-xs text-slate-600">{schema.description}</p>
                <div className="border-t border-slate-200 pt-2 space-y-1.5">
                  {schema.columns.map((col) => (
                    <div
                      key={col.name}
                      className="grid grid-cols-12 gap-2 text-xs items-baseline"
                    >
                      <span className="col-span-4 font-mono font-medium text-slate-900 truncate">
                        {col.name}
                      </span>
                      <span className="col-span-2 font-mono text-[11px] text-sky-700">
                        {col.type}
                      </span>
                      <span className="col-span-6 text-slate-600">
                        {col.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Simulated Output Table (Explicitly Labeled) */}
      {kqlData.simulatedOutput && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <TableIcon className="w-4 h-4 text-sky-600" />
              <span>Expected Result Structure</span>
            </div>
            <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
              {kqlData.simulatedOutput.executionNote}
            </span>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono">
                  {kqlData.simulatedOutput.columns.map((col) => (
                    <th key={col} className="py-2 px-3 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {kqlData.simulatedOutput.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="bg-white hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-slate-800 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Common Mistakes */}
      {kqlData.commonMistakes && kqlData.commonMistakes.length > 0 && (
        <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200 space-y-1.5">
          <div className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Common KQL Mistakes & Exam Traps to Avoid</span>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-900 space-y-1">
            {kqlData.commonMistakes.map((mistake, idx) => (
              <li key={idx} className="leading-relaxed">
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
