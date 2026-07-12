import { useState, type ReactNode } from 'react';
import type { VolunteerDetail } from '../../types/volunteer';
import {
  buildGoogleMapsUrl,
  formatContactAddress,
} from '../../utils/formatContactAddress';
import { formatPhoneTelHref } from '../../utils/phoneFormat';
import {
  displayConfirmedLocation,
  displayLocationPreferenceOnly,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import { firstNameFromFullName } from '../../services/coupleApplication';
import CoupleAvatarStack from './CoupleAvatarStack';
import VolunteerFilesSection from './VolunteerFilesSection';
import VolunteerTermDisplay from './VolunteerTermDisplay';

type CoupleTab = 'shared' | 'primary' | 'spouse';

interface CoupleApplicationCardProps {
  detail: VolunteerDetail;
  onEmailClick?: (person: 'primary' | 'spouse') => void;
  onPhoneClick?: (person: 'primary' | 'spouse') => void;
  sharedContent?: ReactNode;
  splitFilesRow?: boolean;
  besideFiles?: ReactNode;
}

export default function CoupleApplicationCard({
  detail,
  onEmailClick,
  onPhoneClick,
  sharedContent,
  splitFilesRow = false,
  besideFiles,
}: CoupleApplicationCardProps) {
  const couple = detail.couple!;
  const [activeTab, setActiveTab] = useState<CoupleTab>('shared');

  const primaryTabLabel = couple.primaryFirstName || 'Primary';
  const spouseTabLabel =
    couple.partner.firstName || firstNameFromFullName(couple.partner.name);

  const tabs: Array<{ id: CoupleTab; label: string }> = [
    { id: 'shared', label: 'Shared' },
    { id: 'primary', label: primaryTabLabel },
    { id: 'spouse', label: spouseTabLabel },
  ];

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-gradient-to-br from-crm-taupe-50 to-crm-surface p-6 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <CoupleAvatarStack
          primaryName={detail.name}
          partnerName={couple.partner.name}
          primaryPhotoUrl={detail.profilePhotoUrl}
          partnerPhotoUrl={couple.partner.profilePhotoUrl}
          size="lg"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold text-crm-heading">
            {couple.displayName}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800">
              Married
            </span>
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
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2 border-b border-crm-taupe/20 pb-4"
        role="tablist"
        aria-label="Couple application sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-crm-indigo-600 text-white shadow-sm'
                : 'bg-crm-white text-crm-heading ring-1 ring-crm-taupe/20 hover:bg-crm-taupe-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5" role="tabpanel">
        {activeTab === 'shared' && (
          <SharedTab
            detail={detail}
            sharedContent={sharedContent}
            splitFilesRow={splitFilesRow}
            besideFiles={besideFiles}
          />
        )}
        {activeTab === 'primary' && (
          <PersonTab
            name={couple.displayName}
            email={detail.email}
            phone={detail.phone}
            dateOfBirth={detail.demographics?.dateOfBirth}
            demographics={detail.demographics}
            profilePhotoUrl={detail.profilePhotoUrl}
            passportFile={detail.passportFile}
            childSafeguardingFile={detail.childSafeguardingFile}
            onEmailClick={onEmailClick ? () => onEmailClick('primary') : undefined}
            onPhoneClick={onPhoneClick ? () => onPhoneClick('primary') : undefined}
          />
        )}
        {activeTab === 'spouse' && (
          <PersonTab
            name={couple.partner.name}
            email={couple.partner.email}
            phone={couple.partner.phone}
            dateOfBirth={couple.partner.dateOfBirth}
            demographics={detail.demographics}
            profilePhotoUrl={couple.partner.profilePhotoUrl}
            passportFile={couple.partner.passportFile}
            childSafeguardingFile={couple.partner.childSafeguardingFile}
            onEmailClick={onEmailClick ? () => onEmailClick('spouse') : undefined}
            onPhoneClick={onPhoneClick ? () => onPhoneClick('spouse') : undefined}
          />
        )}
      </div>
    </div>
  );
}

function SharedTab({
  detail,
  sharedContent,
  splitFilesRow,
  besideFiles,
}: {
  detail: VolunteerDetail;
  sharedContent?: ReactNode;
  splitFilesRow?: boolean;
  besideFiles?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      {sharedContent}
      {splitFilesRow ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
          <VolunteerFilesSection
            volunteerName={detail.name}
            files={detail.files}
            showOtherFiles
            embeddedInGrid
          />
          {besideFiles}
        </div>
      ) : (
        <VolunteerFilesSection
          volunteerName={detail.name}
          files={detail.files}
          showOtherFiles
        />
      )}
    </div>
  );
}

function PersonTab({
  name,
  email,
  phone,
  dateOfBirth,
  demographics,
  profilePhotoUrl,
  passportFile,
  childSafeguardingFile,
  onEmailClick,
  onPhoneClick,
}: {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  demographics?: VolunteerDetail['demographics'];
  profilePhotoUrl?: string;
  passportFile?: VolunteerDetail['passportFile'];
  childSafeguardingFile?: VolunteerDetail['childSafeguardingFile'];
  onEmailClick?: () => void;
  onPhoneClick?: () => void;
}) {
  const formattedAddress = demographics
    ? formatContactAddress(demographics)
    : null;
  const displayEmail = email?.trim() && email !== '—' ? email : null;
  const displayPhone = phone?.trim() && phone !== '—' ? phone : null;

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3">
        <Field label="Email">
          {displayEmail ? (
            onEmailClick ? (
              <button
                type="button"
                onClick={onEmailClick}
                className="font-medium text-crm-heading underline-offset-2 hover:underline"
              >
                {displayEmail}
              </button>
            ) : (
              <a
                href={`mailto:${displayEmail}`}
                className="font-medium text-crm-heading underline-offset-2 hover:underline"
              >
                {displayEmail}
              </a>
            )
          ) : (
            <span className="text-crm-slate">Not provided</span>
          )}
        </Field>
        <Field label="Phone">
          {displayPhone ? (
            onPhoneClick ? (
              <button
                type="button"
                onClick={onPhoneClick}
                className="font-medium text-crm-heading underline-offset-2 hover:underline"
              >
                {displayPhone}
              </button>
            ) : (
              <a
                href={formatPhoneTelHref(displayPhone) ?? '#'}
                className="font-medium text-crm-heading underline-offset-2 hover:underline"
              >
                {displayPhone}
              </a>
            )
          ) : (
            <span className="text-crm-slate">Not provided</span>
          )}
        </Field>
        <Field label="Date of birth">
          {dateOfBirth?.trim() ? (
            <span className="font-medium text-crm-heading">{dateOfBirth}</span>
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
              className="line-clamp-3 whitespace-pre-line font-medium text-crm-heading underline-offset-2 hover:underline"
            >
              {formattedAddress}
            </a>
          ) : (
            <span className="text-crm-slate">Not provided</span>
          )}
        </Field>
      </dl>

      <VolunteerFilesSection
        volunteerName={name}
        profilePhotoUrl={profilePhotoUrl}
        passportFile={passportFile}
        childSafeguardingFile={childSafeguardingFile}
        files={[]}
        showOtherFiles={false}
      />
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
