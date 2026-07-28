/** Long-term onboarding — 9-stage Long Term Volunteer Process with dates, reminders, checklists. */
import {
  getOnboardingStepsForApplication,
  type OnboardingPipelineStepDefinition,
} from '../../constants/onboardingPipelineSteps';
import type { OnboardingPipeline, OnboardingPipelineStep } from '../../types/volunteer';
import {
  getStatusLabel,
  isChecklistItemCompleted,
  isEmailDue,
  isReminderDue,
  isStepDone,
  resolveChecklistItems,
  suggestProjectedDates,
  updateStepChecklistItem,
  updateStepNote,
  updateStepStatus,
} from '../../utils/onboardingPipeline';

interface LongtermOnboardingProgressProps {
  pipeline: OnboardingPipeline;
  timelineId: string;
  termStart?: string;
  onPipelineChange: (pipeline: OnboardingPipeline) => void;
  onSendProgressEmail: (stepId?: string) => void;
}

function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function checklistProgress(
  def: OnboardingPipelineStepDefinition,
  step: OnboardingPipelineStep,
): { done: number; total: number } {
  const total = def.checklist?.length ?? 0;
  if (total === 0) return { done: 0, total: 0 };
  const done = (def.checklist ?? []).filter((item) =>
    isChecklistItemCompleted(step, item.id),
  ).length;
  return { done, total };
}

function checklistItemReminderDue(
  step: OnboardingPipelineStep,
  checklistItemId: string,
): boolean {
  if (isChecklistItemCompleted(step, checklistItemId)) return false;
  const item = resolveChecklistItems(step)[checklistItemId];
  if (!item?.reminderDate) return false;
  return item.reminderDate <= todayIso();
}

export default function LongtermOnboardingProgress({
  pipeline,
  timelineId,
  termStart,
  onPipelineChange,
  onSendProgressEmail,
}: LongtermOnboardingProgressProps) {
  const stepDefs = getOnboardingStepsForApplication(true);

  const handleSuggestDates = () => {
    if (
      !window.confirm(
        'Suggest projected dates for all incomplete stages? You can still edit them manually.',
      )
    ) {
      return;
    }
    onPipelineChange(
      suggestProjectedDates(pipeline, timelineId, termStart, stepDefs),
    );
  };

  return (
    <>
      <p className="text-sm text-crm-slate">
        Long Term Volunteer Process — tick milestones and set projected / reminder
        dates on each item. Stages do not need to finish in order.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSuggestDates}
          className="rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
        >
          Suggest dates
        </button>
        <button
          type="button"
          onClick={() => onSendProgressEmail()}
          className="rounded-xl border border-crm-indigo/30 bg-crm-indigo-50 px-4 py-2 text-sm font-medium text-crm-indigo transition hover:bg-crm-indigo-100"
        >
          Send progress update
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {stepDefs.map((def, index) => {
          const step = pipeline.steps.find((s) => s.stepId === def.id);
          if (!step) return null;

          const done = isStepDone(step, def.kind);
          const statusLabel = getStatusLabel(step, def.kind, true);
          const projectedDue = isEmailDue(step, def.kind);
          const reminderDue = isReminderDue(step);
          const progress = checklistProgress(def, step);
          const highlight = reminderDue || projectedDue;
          const items = resolveChecklistItems(step);

          const statusBadgeClass = done
            ? 'bg-emerald-100 text-emerald-700'
            : step.status === 'waiting'
              ? 'bg-amber-100 text-amber-700'
              : step.status === 'not_started'
                ? 'bg-crm-taupe-100 text-crm-slate'
                : 'bg-sky-100 text-sky-700';

          return (
            <div
              key={def.id}
              className={`rounded-2xl bg-crm-surface p-4 ring-1 ${
                highlight ? 'ring-amber-400/60' : 'ring-crm-taupe/20'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
                      {index + 1}.
                    </span>
                    <h4 className="font-medium text-crm-heading">{def.title}</h4>
                    {def.owner && (
                      <span className="text-xs text-crm-slate">· {def.owner}</span>
                    )}
                  </div>

                  {progress.total > 0 && (
                    <p className="mt-1 text-xs text-crm-slate">
                      Checklist {progress.done}/{progress.total}
                      {reminderDue && (
                        <span className="ml-2 font-medium text-amber-700">
                          Reminder due
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${statusBadgeClass}`}
                  >
                    {statusLabel}
                  </span>
                  {done && step.completedDate && (
                    <span className="text-xs text-crm-slate">
                      Completed {formatShortDate(step.completedDate)}
                    </span>
                  )}
                </div>
              </div>

              {def.checklist && def.checklist.length > 0 && (
                <ul className="mt-3 space-y-3 border-t border-crm-taupe/10 pt-3">
                  {def.checklist.map((item) => {
                    const state = items[item.id] ?? {};
                    const checked = Boolean(state.completed);
                    const itemReminderDue = checklistItemReminderDue(
                      step,
                      item.id,
                    );

                    return (
                      <li
                        key={item.id}
                        className={`rounded-xl px-2 py-2 ${
                          itemReminderDue ? 'bg-amber-50 ring-1 ring-amber-300/50' : ''
                        }`}
                      >
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                          <label className="flex min-w-[12rem] flex-1 cursor-pointer items-start gap-2 text-sm text-crm-text">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                onPipelineChange(
                                  updateStepChecklistItem(
                                    pipeline,
                                    def.id,
                                    item.id,
                                    { completed: e.target.checked },
                                  ),
                                )
                              }
                              className="mt-0.5 rounded border-crm-taupe/40"
                            />
                            <span
                              className={
                                checked
                                  ? 'text-crm-slate line-through'
                                  : undefined
                              }
                            >
                              {item.label}
                            </span>
                          </label>

                          <div className="flex flex-wrap items-end gap-2">
                            <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wide text-crm-slate">
                              Projected
                              <input
                                type="date"
                                value={state.projectedDate ?? ''}
                                onChange={(e) =>
                                  onPipelineChange(
                                    updateStepChecklistItem(
                                      pipeline,
                                      def.id,
                                      item.id,
                                      { projectedDate: e.target.value },
                                    ),
                                  )
                                }
                                className="rounded-lg border border-crm-taupe/20 bg-crm-white px-2 py-1 text-sm text-crm-text"
                              />
                            </label>
                            <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wide text-crm-slate">
                              Reminder
                              <input
                                type="date"
                                value={state.reminderDate ?? ''}
                                onChange={(e) =>
                                  onPipelineChange(
                                    updateStepChecklistItem(
                                      pipeline,
                                      def.id,
                                      item.id,
                                      { reminderDate: e.target.value },
                                    ),
                                  )
                                }
                                className={`rounded-lg border bg-crm-white px-2 py-1 text-sm text-crm-text ${
                                  itemReminderDue
                                    ? 'border-amber-400'
                                    : 'border-crm-taupe/20'
                                }`}
                              />
                            </label>
                            {checked && state.completedDate && (
                              <span className="pb-1 text-xs text-crm-slate">
                                Done {formatShortDate(state.completedDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <label className="mt-3 flex flex-col gap-1 text-xs text-crm-slate">
                Notes
                <input
                  type="text"
                  value={step.note ?? ''}
                  onChange={(e) =>
                    onPipelineChange(
                      updateStepNote(pipeline, def.id, e.target.value),
                    )
                  }
                  placeholder="Follow-ups, owners, context…"
                  className="w-full rounded-lg border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm text-crm-text placeholder:text-crm-slate/60"
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-crm-taupe/10 pt-3">
                {done ? (
                  <button
                    type="button"
                    onClick={() =>
                      onPipelineChange(
                        updateStepStatus(pipeline, def.id, 'mark_incomplete'),
                      )
                    }
                    className="rounded-lg border border-crm-taupe/20 bg-crm-white px-3 py-1.5 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50"
                  >
                    Mark incomplete
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onPipelineChange(
                          updateStepStatus(pipeline, def.id, 'mark_complete'),
                        )
                      }
                      className="rounded-lg border border-crm-taupe/20 bg-crm-white px-3 py-1.5 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50"
                    >
                      Mark stage complete
                    </button>
                    {reminderDue && (
                      <button
                        type="button"
                        onClick={() => onSendProgressEmail(def.id)}
                        className="rounded-lg bg-crm-indigo px-3 py-1.5 text-xs font-medium text-white transition hover:bg-crm-indigo/90"
                      >
                        Send update
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
