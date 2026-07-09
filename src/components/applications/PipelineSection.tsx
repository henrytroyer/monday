import { getTimelineLabel } from '../../data/timelines';
import type {
  PipelineSection as PipelineSectionType,
  Volunteer,
} from '../../types/volunteer';
import {
  displayLocationPreferenceOnly,
  displayConfirmedLocation,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import VolunteerAvatar from './VolunteerAvatar';
import VolunteerStatusSelect from './VolunteerStatusSelect';

interface PipelineSectionProps {
  section: PipelineSectionType;
  onSelectVolunteer: (volunteer: Volunteer) => void;
  statusOptions: readonly string[];
  onStatusChange: (volunteerId: string, newStatus: string) => void | Promise<void>;
  statusSelectDisabled?: boolean;
}

export default function PipelineSection({
  section,
  onSelectVolunteer,
  statusOptions,
  onStatusChange,
  statusSelectDisabled = false,
}: PipelineSectionProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-crm-taupe/20 bg-crm-indigo-50 px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-crm-heading">{section.stage}</h2>
          <p className="mt-1 text-sm text-crm-slate">
            {section.volunteers.length} volunteer(s)
          </p>
        </div>
        <div className="rounded-full border border-crm-taupe/20 bg-crm-surface px-3 py-1 text-sm font-semibold text-crm-heading">
          {section.volunteers.length}
        </div>
      </div>

      <div className="divide-y divide-crm-taupe/20">
        {section.volunteers.map((volunteer) => (
          <button
            key={volunteer.id}
            type="button"
            onClick={() => onSelectVolunteer(volunteer)}
            className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-crm-taupe-50"
          >
            <div className="flex items-center gap-4">
              <VolunteerAvatar
                name={volunteer.name}
                profilePhotoUrl={volunteer.profilePhotoUrl}
                size="sm"
              />
              <div>
                <div className="font-semibold text-crm-heading">
                  {volunteer.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-crm-slate">
                  {hasConfirmedLocation(volunteer) ? (
                    <span className="font-medium text-green-800">
                      Confirmed: {displayConfirmedLocation(volunteer)}
                    </span>
                  ) : (
                    <span>{displayLocationPreferenceOnly(volunteer)}</span>
                  )}
                  <span className="text-crm-taupe/50">·</span>
                  <span className="text-crm-slate">
                    {getTimelineLabel(volunteer.timelineId)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <VolunteerStatusSelect
                volunteerId={volunteer.id}
                value={volunteer.status}
                options={statusOptions}
                onChange={onStatusChange}
                disabled={statusSelectDisabled}
              />
              <span className="text-crm-slate">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
