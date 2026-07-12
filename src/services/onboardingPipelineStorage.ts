import type { OnboardingPipeline } from '../types/volunteer';

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

export function savePipeline(pipeline: OnboardingPipeline): OnboardingPipeline {
  const all = readAll();
  all[pipeline.volunteerId] = pipeline;
  writeAll(all);
  return pipeline;
}

export function loadAllPipelines(): Record<string, OnboardingPipeline> {
  return readAll();
}
