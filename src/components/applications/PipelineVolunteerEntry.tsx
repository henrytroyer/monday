/**
 * PipelineVolunteerEntry.tsx — Single volunteer/couple cell for list or card layout.
 */

import type { ReactNode } from 'react';
import type { Volunteer } from '../../types/volunteer';
import {
  displayConfirmedLocation,
  displayLocationPreferenceOnly,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import { itineraryHasData } from '../../types/itinerary';
import type { PipelineLayout } from '../../preferences/pipelineLayoutStorage';
import CouplePipelineRow from './CouplePipelineRow';
import DestinationItineraryVisual from './DestinationItineraryVisual';
import TermProgressBar from './TermProgressBar';
import VolunteerAvatar from './VolunteerAvatar';
import VolunteerStatusSelect from './VolunteerStatusSelect';
import VolunteerTermDisplay from './VolunteerTermDisplay';
import CoupleAvatarStack from './CoupleAvatarStack';

interface PipelineVolunteerEntryProps {
  volunteer: Volunteer;
  pipelineStage: string;
  layout: PipelineLayout;
  showTermProgress: boolean;
  statusOptions: readonly string[];
  onStatusChange: (volunteerId: string, newStatus: string) => void | Promise<void>;
  statusSelectDisabled?: boolean;
  onSelect: () => void;
  onOpenItineraryPreview?: () => void;
}

function LocationLabel({ volunteer }: { volunteer: Volunteer }) {
  if (hasConfirmedLocation(volunteer)) {
    return (
      <span className="font-medium text-green-800">
        Confirmed: {displayConfirmedLocation(volunteer)}
      </span>
    );
  }
  return <span>{displayLocationPreferenceOnly(volunteer)}</span>;
}

function ItineraryChip({
  volunteer,
  onOpen,
}: {
  volunteer: Volunteer;
  onOpen?: () => void;
}) {
  if (!volunteer.itinerary || !itineraryHasData(volunteer.itinerary)) {
    return null;
  }
  return (
    <DestinationItineraryVisual
      itinerary={volunteer.itinerary}
      onOpen={volunteer.itineraryPreviewFile?.url ? onOpen : undefined}
    />
  );
}

function SoloMeta({
  volunteer,
  pipelineStage,
  showTermProgress,
  onOpenItineraryPreview,
  stacked,
}: {
  volunteer: Volunteer;
  pipelineStage: string;
  showTermProgress: boolean;
  onOpenItineraryPreview?: () => void;
  stacked?: boolean;
}) {
  const progressBar = showTermProgress ? (
    <TermProgressBar volunteer={volunteer} compact collapsible />
  ) : null;

  if (stacked) {
    return (
      <div className="mt-2 space-y-1.5 text-sm text-crm-slate">
        <div>
          <LocationLabel volunteer={volunteer} />
        </div>
        <div className="flex flex-col items-start gap-1">
          {progressBar}
          <VolunteerTermDisplay
            volunteer={volunteer}
            pipelineStage={pipelineStage}
          />
        </div>
        <ItineraryChip
          volunteer={volunteer}
          onOpen={onOpenItineraryPreview}
        />
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1 text-sm text-crm-slate">
      <LocationLabel volunteer={volunteer} />
      <span className="text-crm-taupe/50">·</span>
      <div className="flex min-w-[12rem] max-w-sm flex-col items-center gap-1">
        {progressBar}
        <VolunteerTermDisplay
          volunteer={volunteer}
          pipelineStage={pipelineStage}
        />
      </div>
      {volunteer.itinerary && itineraryHasData(volunteer.itinerary) ? (
        <>
          <span className="text-crm-taupe/50">·</span>
          <ItineraryChip
            volunteer={volunteer}
            onOpen={onOpenItineraryPreview}
          />
        </>
      ) : null}
    </div>
  );
}

function CoupleCardBody({
  volunteer,
  pipelineStage,
  showTermProgress,
  onOpenItineraryPreview,
}: {
  volunteer: Volunteer;
  pipelineStage: string;
  showTermProgress: boolean;
  onOpenItineraryPreview?: () => void;
}) {
  const preview = volunteer.couplePreview;
  const displayName = preview?.displayName ?? volunteer.name;
  const partnerName = preview?.partnerName ?? 'Spouse';

  return (
    <>
      <CoupleAvatarStack
        primaryName={volunteer.name}
        partnerName={partnerName}
        primaryPhotoUrl={volunteer.profilePhotoUrl}
        partnerPhotoUrl={preview?.partnerPhotoUrl}
        size="md"
      />
      <div className="mt-3 min-w-0">
        <div className="font-semibold text-crm-heading">{displayName}</div>
        <div className="mt-1 text-sm text-crm-slate">Married</div>
        <SoloMeta
          volunteer={volunteer}
          pipelineStage={pipelineStage}
          showTermProgress={showTermProgress}
          onOpenItineraryPreview={onOpenItineraryPreview}
          stacked
        />
      </div>
    </>
  );
}

/** Renders one pipeline volunteer as a list row or a card tile. */
export default function PipelineVolunteerEntry({
  volunteer,
  pipelineStage,
  layout,
  showTermProgress,
  statusOptions,
  onStatusChange,
  statusSelectDisabled = false,
  onSelect,
  onOpenItineraryPreview,
}: PipelineVolunteerEntryProps) {
  const statusSelect = (
    <VolunteerStatusSelect
      volunteerId={volunteer.id}
      value={volunteer.status}
      options={statusOptions}
      onChange={onStatusChange}
      disabled={statusSelectDisabled}
    />
  );

  let body: ReactNode;
  if (layout === 'card') {
    body = volunteer.couplePreview ? (
      <CoupleCardBody
        volunteer={volunteer}
        pipelineStage={pipelineStage}
        showTermProgress={showTermProgress}
        onOpenItineraryPreview={onOpenItineraryPreview}
      />
    ) : (
      <>
        <VolunteerAvatar
          name={volunteer.name}
          profilePhotoUrl={volunteer.profilePhotoUrl}
          size="md"
        />
        <div className="mt-3 min-w-0">
          <div className="font-semibold text-crm-heading">{volunteer.name}</div>
          <SoloMeta
            volunteer={volunteer}
            pipelineStage={pipelineStage}
            showTermProgress={showTermProgress}
            onOpenItineraryPreview={onOpenItineraryPreview}
            stacked
          />
        </div>
      </>
    );

    return (
      <button
        type="button"
        onClick={onSelect}
        className="flex h-full w-full flex-col rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4 text-left shadow-sm transition hover:border-crm-taupe/35 hover:bg-crm-taupe-50"
      >
        <div className="min-w-0 flex-1">{body}</div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-crm-taupe/15 pt-3">
          {statusSelect}
          <span className="text-crm-slate">→</span>
        </div>
      </button>
    );
  }

  body = volunteer.couplePreview ? (
    <CouplePipelineRow
      volunteer={volunteer}
      pipelineStage={pipelineStage}
      showTermProgress={showTermProgress}
      termProgressBar={
        showTermProgress ? (
          <TermProgressBar volunteer={volunteer} compact collapsible />
        ) : undefined
      }
      destinationItinerary={
        volunteer.itinerary && itineraryHasData(volunteer.itinerary) ? (
          <DestinationItineraryVisual
            itinerary={volunteer.itinerary}
            onOpen={
              volunteer.itineraryPreviewFile?.url
                ? onOpenItineraryPreview
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
        <div className="font-semibold text-crm-heading">{volunteer.name}</div>
        <SoloMeta
          volunteer={volunteer}
          pipelineStage={pipelineStage}
          showTermProgress={showTermProgress}
          onOpenItineraryPreview={onOpenItineraryPreview}
        />
      </div>
    </>
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-crm-taupe-50"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">{body}</div>
      <div className="flex shrink-0 items-center gap-4">
        {statusSelect}
        <span className="text-crm-slate">→</span>
      </div>
    </button>
  );
}
