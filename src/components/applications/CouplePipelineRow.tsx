import type { ReactNode } from 'react';
import type { Volunteer } from '../../types/volunteer';
import {
  displayConfirmedLocation,
  displayLocationPreferenceOnly,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import CoupleAvatarStack from './CoupleAvatarStack';
import VolunteerTermDisplay from './VolunteerTermDisplay';

interface CouplePipelineRowProps {
  volunteer: Volunteer;
  pipelineStage: string;
  showTermProgress: boolean;
  termProgressBar?: ReactNode;
}

export default function CouplePipelineRow({
  volunteer,
  pipelineStage,
  showTermProgress,
  termProgressBar,
}: CouplePipelineRowProps) {
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
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-crm-heading">{displayName}</div>
        <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1 text-sm text-crm-slate">
          <span className="text-crm-slate">Married</span>
          <span className="text-crm-taupe/50">·</span>
          {hasConfirmedLocation(volunteer) ? (
            <span className="font-medium text-green-800">
              Confirmed: {displayConfirmedLocation(volunteer)}
            </span>
          ) : (
            <span>{displayLocationPreferenceOnly(volunteer)}</span>
          )}
          <span className="text-crm-taupe/50">·</span>
          <div className="flex min-w-[12rem] max-w-sm flex-col items-center gap-1">
            {showTermProgress && termProgressBar}
            <VolunteerTermDisplay
              volunteer={volunteer}
              pipelineStage={pipelineStage}
            />
          </div>
        </div>
      </div>
    </>
  );
}
