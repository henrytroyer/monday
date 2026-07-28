/**
 * PipelineSection.tsx
 * One applications pipeline stage group with volunteer rows clustered by
 * confirmed location, destination itinerary chips, and PDF preview on click.
 */
import { useState } from 'react';
import type {
  PipelineSection as PipelineSectionType,
  Volunteer,
  VolunteerFile,
} from '../../types/volunteer';
import {
  displayLocationPreferenceOnly,
  displayConfirmedLocation,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import {
  organizePipelineVolunteers,
  showsLocationGroupHeaders,
  type ApplicationSortOption,
} from '../../utils/organizePipelineVolunteers';
import { isSentToFieldPipelineStage } from '../../constants/applicationStatuses';
import { itineraryHasData } from '../../types/itinerary';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import VolunteerAvatar from './VolunteerAvatar';
import CouplePipelineRow from './CouplePipelineRow';
import DestinationItineraryVisual from './DestinationItineraryVisual';
import FilePreviewModal from './FilePreviewModal';
import VolunteerStatusSelect from './VolunteerStatusSelect';
import VolunteerTermDisplay from './VolunteerTermDisplay';
import TermProgressBar from './TermProgressBar';

interface PipelineSectionProps {
  section: PipelineSectionType;
  onSelectVolunteer: (volunteer: Volunteer) => void;
  statusOptions: readonly string[];
  onStatusChange: (volunteerId: string, newStatus: string) => void | Promise<void>;
  statusSelectDisabled?: boolean;
  sortBy?: ApplicationSortOption;
}

export default function PipelineSection({
  section,
  onSelectVolunteer,
  statusOptions,
  onStatusChange,
  statusSelectDisabled = false,
  sortBy = 'confirmed-dates',
}: PipelineSectionProps) {
  const showTermProgress = isSentToFieldPipelineStage(section.stage);
  const locationGroups = organizePipelineVolunteers(section.volunteers, sortBy);
  const showLocationHeaders = showsLocationGroupHeaders(sortBy);
  const [itineraryPreview, setItineraryPreview] = useState<{
    file: VolunteerFile;
    volunteerName: string;
  } | null>(null);

  useNavLayer(
    itineraryPreview !== null,
    () => setItineraryPreview(null),
    `pipeline-itinerary-${itineraryPreview?.file.id ?? 'none'}`,
  );

  const openItineraryPreview = (volunteer: Volunteer) => {
    const file = volunteer.itineraryPreviewFile;
    if (!file?.url) return;
    setItineraryPreview({ file, volunteerName: volunteer.name });
  };

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

      <div>
        {locationGroups.map((group) => (
          <div key={group.sortKey}>
            {showLocationHeaders && group.label ? (
              <div className="flex items-center justify-between gap-3 border-b border-crm-taupe/15 bg-crm-taupe-50/70 px-6 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
                  {group.label}
                </h3>
                <span className="text-xs font-medium text-crm-slate/80">
                  {group.volunteers.length}
                </span>
              </div>
            ) : null}
            <div className="divide-y divide-crm-taupe/20">
              {group.volunteers.map((volunteer) => (
                <button
                  key={volunteer.id}
                  type="button"
                  onClick={() =>
                    onSelectVolunteer({
                      ...volunteer,
                      pipelineStage: section.stage,
                    })
                  }
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-crm-taupe-50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    {volunteer.couplePreview ? (
                      <CouplePipelineRow
                        volunteer={volunteer}
                        pipelineStage={section.stage}
                        showTermProgress={showTermProgress}
                        termProgressBar={
                          showTermProgress ? (
                            <TermProgressBar
                              volunteer={volunteer}
                              compact
                              collapsible
                            />
                          ) : undefined
                        }
                        destinationItinerary={
                          volunteer.itinerary &&
                          itineraryHasData(volunteer.itinerary) ? (
                            <DestinationItineraryVisual
                              itinerary={volunteer.itinerary}
                              onOpen={
                                volunteer.itineraryPreviewFile?.url
                                  ? () => openItineraryPreview(volunteer)
                                  : undefined
                              }
                            />
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
                              <span>
                                {displayLocationPreferenceOnly(volunteer)}
                              </span>
                            )}
                            <span className="text-crm-taupe/50">·</span>
                            <div className="flex min-w-[12rem] max-w-sm flex-col items-center gap-1">
                              {showTermProgress && (
                                <TermProgressBar
                                  volunteer={volunteer}
                                  compact
                                  collapsible
                                />
                              )}
                              <VolunteerTermDisplay
                                volunteer={volunteer}
                                pipelineStage={section.stage}
                              />
                            </div>
                            {volunteer.itinerary &&
                              itineraryHasData(volunteer.itinerary) && (
                                <>
                                  <span className="text-crm-taupe/50">·</span>
                                  <DestinationItineraryVisual
                                    itinerary={volunteer.itinerary}
                                    onOpen={
                                      volunteer.itineraryPreviewFile?.url
                                        ? () => openItineraryPreview(volunteer)
                                        : undefined
                                    }
                                  />
                                </>
                              )}
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
                    />
                    <span className="text-crm-slate">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {itineraryPreview && (
        <FilePreviewModal
          file={itineraryPreview.file}
          volunteerName={itineraryPreview.volunteerName}
          backLabel="applications"
          onClose={() => setItineraryPreview(null)}
        />
      )}
    </div>
  );
}
