/** Long-term onboarding — 9-stage Long Term Volunteer Process with dates, reminders, checklists. */
import { useEffect, useState } from 'react';
import {
  getOnboardingStepsForApplication,
  type OnboardingPipelineStepDefinition,
} from '../../constants/onboardingPipelineSteps';
import type { OnboardingPipeline, OnboardingPipelineStep } from '../../types/volunteer';
import {
  getCurrentStep,
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
  /** Controlled open stage (e.g. from timeline tap). */
  openStageId?: string | null;
  onOpenStageChange?: (stepId: string) => void;
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

function defaultOpenStageId(pipeline: OnboardingPipeline): string {
  const stepDefs = getOnboardingStepsForApplication(true);
  const current = getCurrentStep(pipeline, stepDefs);
  return current?.step.stepId ?? stepDefs[0]?.id ?? 'lt_connection';
}

export default function LongtermOnboardingProgress({
  pipeline,
  timelineId,
  termStart,
  onPipelineChange,
  onSendProgressEmail,
  openStageId: controlledOpenStageId,
  onOpenStageChange,
}: LongtermOnboardingProgressProps) {
  const stepDefs = getOnboardingStepsForApplication(true);
  const [internalOpenStageId, setInternalOpenStageId] = useState(() =>
    defaultOpenStageId(pipeline),
  );

  const openStageId = controlledOpenStageId ?? internalOpenStageId;

  const setOpenStageId = (stepId: string) => {
    setInternalOpenStageId(stepId);
    onOpenStageChange?.(stepId);
  };

  useEffect(() => {
    if (controlledOpenStageId) {
      setInternalOpenStageId(controlledOpenStageId);
    }
  }, [controlledOpenStageId]);

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
      <p className="text-sm text-crm-slate sm:hidden">
        Tap a stage to expand. Set dates on each checklist item.
      </p>
      <p className="hidden text-sm text-crm-slate sm:block">
        Long Term Volunteer Process — tick milestones and set projected / reminder
        dates on each item. Stages do not need to finish in order.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={handleSuggestDates}
          className="w-full rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-2.5 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 sm:w-auto"
        >
          Suggest dates
        </button>
        <button
          type="button"
          onClick={() => onSendProgressEmail()}
          className="w-full rounded-xl border border-crm-indigo/30 bg-crm-indigo-50 px-4 py-2.5 text-sm font-medium text-crm-indigo transition hover:bg-crm-indigo-100 sm:w-auto"
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
          const isOpen = openStageId === def.id;

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
              className={`rounded-2xl bg-crm-surface ring-1 ${
                highlight ? 'ring-amber-400/60' : 'ring-crm-taupe/20'
              }`}
            >
              {/* Stage header — always visible; toggles accordion on mobile */}
              <button
                type="button"
                onClick={() => setOpenStageId(def.id)}
                className="flex w-full items-start justify-between gap-3 p-3 text-left sm:cursor-default sm:p-4"
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
                      {index + 1}.
                    </span>
                    <h4 className="font-medium text-crm-heading">{def.title}</h4>
                    {def.owner && (
                      <span className="hidden text-xs text-crm-slate sm:inline">
                        · {def.owner}
                      </span>
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

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs sm:px-3 sm:text-sm ${statusBadgeClass}`}
                  >
                    {statusLabel}
                  </span>
                  {done && step.completedDate && (
                    <span className="hidden text-xs text-crm-slate sm:inline">
                      Completed {formatShortDate(step.completedDate)}
                    </span>
                  )}
                  <span
                    className="text-crm-taupe sm:hidden"
                    aria-hidden="true"
                  >
                    {isOpen ? '▾' : '▸'}
                  </span>
                </div>
              </button>

              {/* Body: mobile accordion (open only) / desktop always shown */}
              <div
                className={`border-t border-crm-taupe/10 px-3 pb-3 sm:block sm:px-4 sm:pb-4 ${
                  isOpen ? 'block' : 'hidden'
                }`}
              >
                {def.owner && (
                  <p className="mt-2 text-xs text-crm-slate sm:hidden">
                    {def.owner}
                  </p>
                )}

                {def.checklist && def.checklist.length > 0 && (
                  <ul className="mt-3 space-y-3">
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
                            itemReminderDue
                              ? 'bg-amber-50 ring-1 ring-amber-300/50'
                              : ''
                          }`}
                        >
                          <label className="flex cursor-pointer items-start gap-2 text-sm text-crm-text">
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
                              className="mt-0.5 shrink-0 rounded border-crm-taupe/40"
                            />
                            <span
                              className={
                                checked
                                  ? 'min-w-0 text-crm-slate line-through'
                                  : 'min-w-0'
                              }
                            >
                              {item.label}
                            </span>
                          </label>

                          {/* Phone: stacked full-width dates. Desktop: side by side. */}
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] uppercase tracking-wide text-crm-slate">
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
                                className="w-full min-w-0 rounded-lg border border-crm-taupe/20 bg-crm-white px-2 py-1.5 text-sm text-crm-text"
                              />
                            </label>
                            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] uppercase tracking-wide text-crm-slate">
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
                                className={`w-full min-w-0 rounded-lg border bg-crm-white px-2 py-1.5 text-sm text-crm-text ${
                                  itemReminderDue
                                    ? 'border-amber-400'
                                    : 'border-crm-taupe/20'
                                }`}
                              />
                            </label>
                          </div>
                          {checked && state.completedDate && (
                            <p className="mt-1 text-xs text-crm-slate">
                              Done {formatShortDate(state.completedDate)}
                            </p>
                          )}
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
                    className="w-full min-w-0 rounded-lg border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm text-crm-text placeholder:text-crm-slate/60"
                  />
                </label>

                <div className="mt-3 flex flex-col gap-2 border-t border-crm-taupe/10 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
                  {done ? (
                    <button
                      type="button"
                      onClick={() =>
                        onPipelineChange(
                          updateStepStatus(pipeline, def.id, 'mark_incomplete'),
                        )
                      }
                      className="w-full rounded-lg border border-crm-taupe/20 bg-crm-white px-3 py-2 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50 sm:w-auto sm:py-1.5"
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
                        className="w-full rounded-lg border border-crm-taupe/20 bg-crm-white px-3 py-2 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50 sm:w-auto sm:py-1.5"
                      >
                        Mark stage complete
                      </button>
                      {reminderDue && (
                        <button
                          type="button"
                          onClick={() => onSendProgressEmail(def.id)}
                          className="w-full rounded-lg bg-crm-indigo px-3 py-2 text-xs font-medium text-white transition hover:bg-crm-indigo/90 sm:w-auto sm:py-1.5"
                        >
                          Send update
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
