import type {
  PipelineSection as PipelineSectionType,
  Volunteer,
} from '../../types/volunteer';
import { loadPipeline } from '../../services/onboardingPipelineStorage';
import { getOnboardingStepLabel } from '../../utils/onboardingPipeline';
import {
  displayLocationPreferenceOnly,
  displayConfirmedLocation,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import { isSentToFieldPipelineStage } from '../../constants/applicationStatuses';
import VolunteerAvatar from './VolunteerAvatar';
import CouplePipelineRow from './CouplePipelineRow';
import VolunteerStatusSelect from './VolunteerStatusSelect';
import VolunteerTermDisplay from './VolunteerTermDisplay';
import TermProgressBar from './TermProgressBar';

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
  const showTermProgress = isSentToFieldPipelineStage(section.stage);

  return (
    <div className="overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-crm-taupe/20 bg-crm-taupe-50 px-6 py-4">
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
        {section.volunteers.map((volunteer) => {
          const storedPipeline = loadPipeline(volunteer.id);
          const onboardingLabel = storedPipeline
            ? getOnboardingStepLabel(storedPipeline)
            : null;

          return (
          <button
            key={volunteer.id}
            type="button"
            onClick={() =>
              onSelectVolunteer({
                ...volunteer,
                pipelineStage: section.stage,
              })
            }
            className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-crm-taupe-50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {volunteer.couplePreview ? (
                <CouplePipelineRow
                  volunteer={volunteer}
                  pipelineStage={section.stage}
                  showTermProgress={showTermProgress}
                  termProgressBar={
                    showTermProgress ? (
                      <TermProgressBar volunteer={volunteer} compact collapsible />
                    ) : undefined
                  }
                />
              ) : (
                <>
                  <VolunteerAvatar
                    name={volunteer.name}
                    profilePhotoUrl={volunteer.profilePhotoUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-crm-heading">
                      {volunteer.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1 text-sm text-crm-slate">
                      {hasConfirmedLocation(volunteer) ? (
                        <span className="font-medium text-green-800">
                          Confirmed: {displayConfirmedLocation(volunteer)}
                        </span>
                      ) : (
                        <span>{displayLocationPreferenceOnly(volunteer)}</span>
                      )}
                      <span className="text-crm-taupe/50">·</span>
                      <div className="flex min-w-[12rem] max-w-sm flex-col items-center gap-1">
                        {showTermProgress && (
                          <TermProgressBar volunteer={volunteer} compact collapsible />
                        )}
                        <VolunteerTermDisplay
                          volunteer={volunteer}
                          pipelineStage={section.stage}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <VolunteerStatusSelect
                volunteerId={volunteer.id}
                value={volunteer.status}
                options={statusOptions}
                onChange={onStatusChange}
                disabled={statusSelectDisabled}
                onboardingLabel={onboardingLabel}
              />
              <span className="text-crm-slate">→</span>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}
