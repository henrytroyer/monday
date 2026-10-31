import { GUIDE_FACTS } from './volunteerGuide';

const SERVICE_TRAINING = GUIDE_FACTS.find((fact) => fact.title === 'Service Training');

export type TeamTrainingDetails = {
  place: string;
  length: string;
  lodging: string;
  dates: string;
  summary: string;
};

/** Sample preview schedule. The summary is the public service-training fact. */
export function teamTrainingDetails(): TeamTrainingDetails {
  return {
    place: 'Lancaster, PA',
    length: '2 days',
    lodging: 'Lodging and meals provided',
    dates: 'Wednesday, 3 June and Thursday, 4 June 2026',
    summary: SERVICE_TRAINING?.detail ?? '2-day training in Lancaster, PA. Lodging and meals provided.',
  };
}
