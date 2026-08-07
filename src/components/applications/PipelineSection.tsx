/**
 * PipelineSection.tsx
 * One applications pipeline stage group with volunteer rows or cards clustered by
 * confirmed location, destination itinerary chips, and PDF preview on click.
 */
import { useState } from 'react';
import type {
  PipelineSection as PipelineSectionType,
  Volunteer,
  VolunteerFile,
} from '../../types/volunteer';
import {
  organizePipelineVolunteers,
  showsLocationGroupHeaders,
  type ApplicationSortOption,
} from '../../utils/organizePipelineVolunteers';
import { isSentToFieldPipelineStage } from '../../constants/applicationStatuses';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import type { PipelineLayout } from '../../preferences/pipelineLayoutStorage';
import FilePreviewModal from './FilePreviewModal';
import PipelineVolunteerEntry from './PipelineVolunteerEntry';

interface PipelineSectionProps {
  section: PipelineSectionType;
  onSelectVolunteer: (volunteer: Volunteer) => void;
  statusOptions: readonly string[];
  onStatusChange: (volunteerId: string, newStatus: string) => void | Promise<void>;
  statusSelectDisabled?: boolean;
  sortBy?: ApplicationSortOption;
  layout?: PipelineLayout;
}

export default function PipelineSection({
  section,
  onSelectVolunteer,
  statusOptions,
  onStatusChange,
  statusSelectDisabled = false,
  sortBy = 'confirmed-dates',
  layout = 'list',
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
            <div
              className={
                layout === 'card'
                  ? 'grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3'
                  : 'divide-y divide-crm-taupe/20'
              }
            >
              {group.volunteers.map((volunteer) => (
                <PipelineVolunteerEntry
                  key={volunteer.id}
                  volunteer={volunteer}
                  pipelineStage={section.stage}
                  layout={layout}
                  showTermProgress={showTermProgress}
                  statusOptions={statusOptions}
                  onStatusChange={onStatusChange}
                  statusSelectDisabled={statusSelectDisabled}
                  onSelect={() =>
                    onSelectVolunteer({
                      ...volunteer,
                      pipelineStage: section.stage,
                    })
                  }
                  onOpenItineraryPreview={
                    volunteer.itineraryPreviewFile?.url
                      ? () => openItineraryPreview(volunteer)
                      : undefined
                  }
                />
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
