import React, { useState } from 'react';
import { AppSettings } from '../types';
import { FullStudySnapshot } from '../services/db';
import {
  Download,
  Upload,
  Trash2,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  fullSnapshot: FullStudySnapshot;
  onUpdateSettings: (nextSettings: AppSettings) => void;
  onImportSnapshotJson: (importedSnapshot: FullStudySnapshot) => void;
  onClearLocalProgress: () => void;
  onDeleteImportedBankAndPrivatePdf: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  fullSnapshot,
  onUpdateSettings,
  onImportSnapshotJson,
  onClearLocalProgress,
  onDeleteImportedBankAndPrivatePdf,
}) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmClearProgress, setConfirmClearProgress] = useState(false);
  const [confirmDeleteBank, setConfirmDeleteBank] = useState(false);

  const handleExportProgressJson = () => {
    const jsonString = JSON.stringify(fullSnapshot, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sc200-exam-gym-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Study progress and question bank exported as JSON.');
  };

  const handleImportProgressJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.questions)) {
          throw new Error(
            'Invalid backup JSON format: missing questions array.'
          );
        }
        onImportSnapshotJson(parsed as FullStudySnapshot);
        setStatusMessage('Backup JSON restored into local IndexedDB storage.');
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to parse backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Study Preferences */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-5">
        <div className="space-y-1 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sliders className="w-4 h-4 text-sky-600" />
            <span>Personal Study Preferences · Persisted Locally in IndexedDB</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Study Preferences & Session Configuration
          </h2>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Default Practice Session Question Count
            </label>
            <select
              value={settings.practiceQuestionCount}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  practiceQuestionCount: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
            >
              <option value={10}>10 Questions</option>
              <option value={20}>20 Questions</option>
              <option value={40}>40 Questions</option>
              <option value={100}>100 Questions (All Available)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Default Study Mode
            </label>
            <select
              value={settings.defaultStudyMode}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultStudyMode: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="practice">Practice Mode (Immediate Feedback)</option>
              <option value="focus">Focus Mode (Spaced Repetition & Weak Areas)</option>
              <option value="exam">Exam Simulation (Timed 100-Min Default)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Default Exam Simulation Timer (Minutes)
            </label>
            <select
              value={settings.examTimeLimitMinutes}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  examTimeLimitMinutes: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
            >
              <option value={60}>60 Minutes</option>
              <option value={100}>100 Minutes (Official SC-200 Default)</option>
              <option value={120}>120 Minutes</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Default Difficulty Filter
            </label>
            <select
              value={settings.defaultDifficulty}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultDifficulty: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Difficult">Difficult</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.randomizeQuestionOrder}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  randomizeQuestionOrder: e.target.checked,
                })
              }
              className="rounded border-slate-300 text-sky-600"
            />
            <span>Randomize question order in Practice sessions</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.repeatAnsweredQuestions}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  repeatAnsweredQuestions: e.target.checked,
                })
              }
              className="rounded border-slate-300 text-sky-600"
            />
            <span>Include previously answered questions in general Practice sessions</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showVisualWalkthroughAutomaticallyOnWrong}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  showVisualWalkthroughAutomaticallyOnWrong: e.target.checked,
                })
              }
              className="rounded border-slate-300 text-sky-600"
            />
            <span>Automatically expand Visual Portal Walkthrough when I answer a question wrong</span>
          </label>
        </div>
      </div>

      {/* JSON Backup Export & Restore */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 font-display">
          Local Study Progress Backup & Restore (JSON)
        </h3>
        <p className="text-xs text-slate-600 max-w-2xl">
          Export your complete local IndexedDB state (imported question bank, verified answers, attempt history, spaced repetition intervals, bookmarks, and simulation results) as a portable JSON file.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportProgressJson}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Full Progress as JSON</span>
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-sky-600" />
            <span>Import Progress from JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportProgressJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Privacy & Destructive Actions (Clear Progress / Delete Imported Bank) */}
      <div className="border border-rose-200 bg-white rounded-xl p-6 space-y-5">
        <div className="space-y-1 border-b border-rose-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
            <ShieldAlert className="w-4 h-4" />
            <span>Privacy Controls & Local Data Deletion</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display">
            Reset Local Progress or Delete Imported Question Bank
          </h3>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            <strong>Important Privacy Disclosure:</strong> Deleting your local progress or deleting your imported question bank removes the data from your browser’s IndexedDB and deletes the private PDF file from this application server (<code>.private_data/</code>). It does <strong>not</strong> delete any API logs or copies previously processed by external services (such as the Gemini API) during earlier extraction or verification requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {!confirmClearProgress ? (
            <button
              type="button"
              onClick={() => setConfirmClearProgress(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Local Study Progress</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-300">
              <span className="text-xs font-semibold text-amber-950 px-2">
                Reset all attempts, bookmarks, and simulation scores?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearLocalProgress();
                  setConfirmClearProgress(false);
                  setStatusMessage(
                    'All local attempts, bookmarks, and simulation scores have been cleared.'
                  );
                }}
                className="px-3 py-1 text-xs font-semibold rounded bg-amber-800 text-white hover:bg-amber-900"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearProgress(false)}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}

          {!confirmDeleteBank ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteBank(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Imported Bank & Private Server PDF</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-300">
              <span className="text-xs font-semibold text-rose-950 px-2">
                Permanently remove all imported PDF questions and delete private PDF file?
              </span>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteImportedBankAndPrivatePdf();
                  setConfirmDeleteBank(false);
                  setStatusMessage(
                    'Imported question bank and private server PDF have been deleted locally.'
                  );
                }}
                className="px-3 py-1 text-xs font-semibold rounded bg-rose-700 text-white hover:bg-rose-800"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteBank(false)}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
