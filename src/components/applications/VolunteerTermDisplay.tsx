import type { Volunteer } from '../../types/volunteer';
import {
  displayConfirmedTerm,
  displayPreferredDates,
  displayTermOfService,
  hasConfirmedTerm,
  hasDistinctPreferredDates,
} from '../../utils/volunteerTerm';

interface VolunteerTermDisplayProps {
  volunteer: Volunteer;
  /** Pipeline group from list row (e.g. Added To Chat Group) */
  pipelineStage?: string;
  /** inline = pipeline row; pill = contact card badge */
  variant?: 'inline' | 'pill';
}

export default function VolunteerTermDisplay({
  volunteer,
  pipelineStage,
  variant = 'inline',
}: VolunteerTermDisplayProps) {
  const confirmed = hasConfirmedTerm(volunteer, pipelineStage);

  if (variant === 'pill') {
    if (confirmed) {
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          Confirmed: {displayConfirmedTerm(volunteer)}
        </span>
      );
    }

    return (
      <>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
          Preferred Dates: {displayPreferredDates(volunteer)}
        </span>
        {hasDistinctPreferredDates(volunteer) && (
          <span className="rounded-full bg-crm-white px-3 py-1 text-sm text-crm-text ring-1 ring-crm-taupe/20">
            {displayTermOfService(volunteer)}
          </span>
        )}
      </>
    );
  }

  if (confirmed) {
    return (
      <span className="font-medium text-green-800">
        Confirmed: {displayConfirmedTerm(volunteer)}
      </span>
    );
  }

  return (
    <>
      <span>Preferred Dates: {displayPreferredDates(volunteer)}</span>
      {hasDistinctPreferredDates(volunteer) && (
        <>
          <span className="text-crm-taupe/50">·</span>
          <span>{displayTermOfService(volunteer)}</span>
        </>
      )}
    </>
  );
}
