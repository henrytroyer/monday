import { useState, type ReactNode } from 'react';
import type { VolunteerDetail } from '../../types/volunteer';
import { formatDateOfBirth } from '../../utils/formatDateOfBirth';
import {
  buildGoogleMapsUrl,
  formatContactAddress,
} from '../../utils/formatContactAddress';
import { formatPhoneTelHref } from '../../utils/phoneFormat';
import FilePreviewModal from './FilePreviewModal';
import VolunteerFilesSection from './VolunteerFilesSection';
import {
  displayLocationPreferenceOnly,
  displayConfirmedLocation,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import VolunteerAvatar from './VolunteerAvatar';
import VolunteerTermDisplay from './VolunteerTermDisplay';

interface VolunteerContactCardProps {
  detail: VolunteerDetail;
  onEmailClick?: () => void;
  onPhoneClick?: () => void;
  beforeFiles?: ReactNode;
  besideFiles?: ReactNode;
  splitFilesRow?: boolean;
}

export default function VolunteerContactCard({
  detail,
  onEmailClick,
  onPhoneClick,
  beforeFiles,
  besideFiles,
  splitFilesRow = false,
}: VolunteerContactCardProps) {
  const formattedAddress = detail.demographics
    ? formatContactAddress(detail.demographics)
    : null;
  const displayDateOfBirth = formatDateOfBirth(detail.demographics?.dateOfBirth);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);

  const profilePreviewFile =
    detail.profilePhotoUrl != null && detail.profilePhotoUrl !== ''
      ? {
          id: 'profile-photo',
          name: 'Profile photo',
          url: detail.profilePhotoUrl,
          isImage: true,
        }
      : null;

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-gradient-to-br from-crm-taupe-50 to-crm-surface p-6 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <VolunteerAvatar
          name={detail.name}
          profilePhotoUrl={detail.profilePhotoUrl}
          size="lg"
          onClick={
            profilePreviewFile
              ? () => setProfilePreviewOpen(true)
              : undefined
          }
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold text-crm-heading">{detail.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {hasConfirmedLocation(detail) ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                Confirmed: {displayConfirmedLocation(detail)}
              </span>
            ) : (
              <span className="rounded-full bg-crm-white px-3 py-1 text-sm text-crm-text">
                {displayLocationPreferenceOnly(detail)}
              </span>
            )}
            <VolunteerTermDisplay volunteer={detail} variant="pill" />
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
              {detail.status}
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <Field label="Email">
              {detail.email !== '—' ? (
                onEmailClick ? (
                  <button
                    type="button"
                    onClick={onEmailClick}
                    className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                  >
                    {detail.email}
                  </button>
                ) : (
                  <a
                    href={`mailto:${detail.email}`}
                    className="font-medium text-crm-heading underline-offset-2 hover:underline"
                  >
                    {detail.email}
                  </a>
                )
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Phone">
              {detail.phone !== '—' ? (
                onPhoneClick ? (
                  <button
                    type="button"
                    onClick={onPhoneClick}
                    className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                  >
                    {detail.phone}
                  </button>
                ) : (
                  <a
                    href={formatPhoneTelHref(detail.phone) ?? '#'}
                    className="font-medium text-crm-heading underline-offset-2 hover:underline"
                  >
                    {detail.phone}
                  </a>
                )
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Date of birth">
              {displayDateOfBirth ? (
                <span className="font-medium text-crm-heading">
                  {displayDateOfBirth}
                </span>
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Address">
              {formattedAddress ? (
                <a
                  href={buildGoogleMapsUrl(formattedAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-3 whitespace-pre-line font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                >
                  {formattedAddress}
                </a>
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
          </dl>
        </div>
      </div>

      {beforeFiles && <div className="mt-5">{beforeFiles}</div>}

      {splitFilesRow ? (
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
          <VolunteerFilesSection
            volunteerName={detail.name}
            profilePhotoUrl={detail.profilePhotoUrl}
            passportFile={detail.passportFile}
            childSafeguardingFile={detail.childSafeguardingFile}
            files={detail.files}
            showOtherFiles
            embeddedInGrid
          />
          {besideFiles}
        </div>
      ) : (
        <div className="mt-5 md:w-1/2">
          <VolunteerFilesSection
            volunteerName={detail.name}
            profilePhotoUrl={detail.profilePhotoUrl}
            passportFile={detail.passportFile}
            childSafeguardingFile={detail.childSafeguardingFile}
            files={detail.files}
            showOtherFiles
          />
        </div>
      )}

      {profilePreviewOpen && profilePreviewFile && (
        <FilePreviewModal
          file={profilePreviewFile}
          volunteerName={detail.name}
          onClose={() => setProfilePreviewOpen(false)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-24 flex-col rounded-xl bg-crm-surface/80 px-4 py-3 ring-1 ring-crm-taupe/20/80">
      <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
        {label}
      </dt>
      <dd className="mt-1 flex-1 overflow-hidden text-sm">{children}</dd>
    </div>
  );
}
