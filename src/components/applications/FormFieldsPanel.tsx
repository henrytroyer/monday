import { useEffect } from 'react';
import type { ApplicationFormField, VolunteerFile } from '../../types/volunteer';

interface FormFieldsPanelProps {
  title: string;
  fields: ApplicationFormField[];
  emptyMessage: string;
  pdfFile?: VolunteerFile;
  onClose: () => void;
}

export default function FormFieldsPanel({
  title,
  fields,
  emptyMessage,
  pdfFile,
  onClose,
}: FormFieldsPanelProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-fields-panel-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative m-4 flex min-h-0 max-h-[85%] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2
            id="form-fields-panel-title"
            className="min-w-0 text-lg font-semibold text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {fields.length === 0 ? (
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          ) : (
            <dl className="space-y-5">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                >
                  <dt className="text-sm font-medium text-slate-600">
                    {field.question}
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap text-base text-slate-900">
                    {field.answer}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {pdfFile?.url && (
          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <a
              href={pdfFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-700 underline hover:text-slate-900"
            >
              Open {pdfFile.name}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function findFormPdf(
  files: VolunteerFile[],
  pattern: RegExp,
): VolunteerFile | undefined {
  return files.find((f) => pattern.test(f.name) && f.url);
}
