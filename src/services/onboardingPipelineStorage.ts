import type { OnboardingPipeline } from '../types/volunteer';
import { logLocalActivity } from './localActivityLog';

const STORAGE_KEY = 'crm-onboarding-pipeline';

function readAll(): Record<string, OnboardingPipeline> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, OnboardingPipeline>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, OnboardingPipeline>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPipeline(volunteerId: string): OnboardingPipeline | undefined {
  return readAll()[volunteerId];
}

export function savePipeline(
  pipeline: OnboardingPipeline,
  options?: {
    actorName?: string;
    volunteerName?: string;
    longterm?: boolean;
    /** Skip Portal Things sync (internal use when loading from Monday). */
    skipPortalSync?: boolean;
  },
): OnboardingPipeline {
  const all = readAll();
  const previous = all[pipeline.volunteerId];
  all[pipeline.volunteerId] = pipeline;
  writeAll(all);

  if (JSON.stringify(previous) !== JSON.stringify(pipeline)) {
    const actorName = options?.actorName?.trim() || 'Coordinator';
    const volunteerName = options?.volunteerName?.trim();
    const subject = volunteerName ? `"${volunteerName}"` : 'application';

    logLocalActivity({
      occurredAt: new Date().toISOString(),
      actorName,
      category: 'updated',
      entityType: 'application',
      entityId: pipeline.volunteerId,
      entityName: volunteerName,
      summary: `Updated onboarding progress for ${subject}`,
      navigateTo: {
        page: 'applications',
        focusId: pipeline.volunteerId,
      },
    });

    if (!options?.skipPortalSync) {
      void import('./portalOnboardingSync')
        .then(({ savePipelineToPortal }) =>
          savePipelineToPortal(pipeline, {
            actorName: options?.actorName,
            volunteerName: options?.volunteerName,
            longterm: options?.longterm,
          }),
        )
        .catch(() => undefined);
    }
  }

  return pipeline;
}

export function loadAllPipelines(): Record<string, OnboardingPipeline> {
  return readAll();
}
