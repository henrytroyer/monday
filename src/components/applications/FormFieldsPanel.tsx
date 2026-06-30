import { useEffect } from "react";
import type { ApplicationFormField, VolunteerFile } from "../../types/volunteer";
import OverlayBackButton from "../layout/OverlayBackButton";

interface FormFieldsPanelProps {
  title: string;
  backLabel: string;
  fields: ApplicationFormField[];
  emptyMessage: string;
  pdfFile?: VolunteerFile;
  onClose: () => void;
}

export default function FormFieldsPanel({
  title,
  backLabel,
  fields,
  emptyMessage,
  pdfFile,
  onClose,
}: FormFieldsPanelProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
        className="absolute inset-0 bg-crm-indigo/40"
        aria-label={`Back to ${backLabel}`}
        onClick={onClose}
      />

      <div className="relative m-4 flex min-h-0 max-h-[85%] flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="flex shrink-0 flex-col gap-3 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={backLabel} onBack={onClose} />
          <h2
            id="form-fields-panel-title"
            className="min-w-0 text-lg font-semibold text-crm-heading"
          >
            {title}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {fields.length === 0 ? (
            <p className="text-sm text-crm-slate">{emptyMessage}</p>
          ) : (
            <dl className="space-y-5">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-crm-taupe/20 bg-crm-taupe-50/50 px-4 py-3"
                >
                  <dt className="text-sm font-medium text-crm-slate">
                    {field.question}
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap text-base text-crm-text">
                    {field.answer}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {pdfFile?.url && (
          <div className="shrink-0 border-t border-crm-taupe/20 px-5 py-3">
            <a
              href={pdfFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-crm-heading underline hover:text-crm-heading"
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
