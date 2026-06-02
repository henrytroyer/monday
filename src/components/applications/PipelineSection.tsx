import { getTimelineLabel } from '../../data/timelines';
import type { PipelineSection as PipelineSectionType, Volunteer } from '../../types/volunteer';
import {
  displayLocationPreference,
  hasDistinctAssignedLocation,
} from '../../utils/volunteerLocation';
import VolunteerAvatar from './VolunteerAvatar';

interface PipelineSectionProps {
  section: PipelineSectionType;
  onSelectVolunteer: (volunteer: Volunteer) => void;
}

export default function PipelineSection({
  section,
  onSelectVolunteer,
}: PipelineSectionProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <h2 className="text-xl font-bold">{section.stage}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {section.volunteers.length} volunteer(s)
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
          {section.volunteers.length}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {section.volunteers.map((volunteer) => (
          <button
            key={volunteer.id}
            type="button"
            onClick={() => onSelectVolunteer(volunteer)}
            className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-4">
              <VolunteerAvatar
                name={volunteer.name}
                profilePhotoUrl={volunteer.profilePhotoUrl}
                size="sm"
              />
              <div>
                <div className="font-semibold text-slate-900">
                  {volunteer.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{displayLocationPreference(volunteer)}</span>
                  {hasDistinctAssignedLocation(volunteer) && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">
                        Assigned: {volunteer.location}
                      </span>
                    </>
                  )}
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400">
                    {getTimelineLabel(volunteer.timelineId)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {volunteer.status}
              </span>
              <span className="text-slate-400">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
