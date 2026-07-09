import { useEffect, useState, type ReactNode } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import { CONTACT_TAG_LABELS, CONTACT_TAGS, type ContactDetail } from '../../types/contact';
import type { ContactCoreFields } from '../../services/contactStorage';
import {
  buildGoogleMapsUrl,
  formatContactAddress,
} from '../../utils/formatContactAddress';
import {
  contactTagFilterSelectedClass,
  contactTagPillClass,
} from '../../utils/contactTagStyles';
import { toggleContactTag } from '../../utils/filterContacts';
import VolunteerAvatar from '../applications/VolunteerAvatar';
import FilePreviewModal from '../applications/FilePreviewModal';
import ContactCallModal from './ContactCallModal';
import ContactMigrationActions from './ContactMigrationActions';
import ContactSendEmailModal from './ContactSendEmailModal';

interface ContactProfileCardProps {
  detail: ContactDetail;
  saving?: boolean;
  canEdit?: boolean;
  onSave?: (fields: ContactCoreFields) => Promise<ContactDetail | null>;
  onGoToRecruitment?: (prospectId: string) => void;
}

const inputClass =
  'w-full rounded-lg border border-crm-taupe/20 bg-crm-surface px-2 py-1 text-sm outline-none focus:border-crm-slate';

const editButtonClass =
  'rounded-xl border border-crm-taupe/25 bg-crm-taupe-100/90 px-4 py-2 text-sm font-medium text-crm-slate transition hover:border-crm-taupe/40 hover:bg-crm-taupe-100 hover:text-crm-heading disabled:cursor-not-allowed disabled:opacity-45';

export default function ContactProfileCard({
  detail,
  saving = false,
  canEdit = false,
  onSave,
  onGoToRecruitment,
}: ContactProfileCardProps) {
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(detail.name);
  const [email, setEmail] = useState(
    detail.email === '—' ? '' : detail.email,
  );
  const [phone, setPhone] = useState(detail.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(
    detail.demographics?.dateOfBirth ?? '',
  );
  const [addressStreet, setAddressStreet] = useState(
    detail.demographics?.address ?? '',
  );
  const [addressCity, setAddressCity] = useState(detail.demographics?.city ?? '');
  const [addressState, setAddressState] = useState(
    detail.demographics?.state ?? '',
  );
  const [addressZip, setAddressZip] = useState(detail.demographics?.zip ?? '');
  const [addressCountry, setAddressCountry] = useState(
    detail.demographics?.country ?? '',
  );
  const [tags, setTags] = useState(detail.tags);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const editable = canEdit && Boolean(onSave);

  const { requestClose: requestCloseEmail } = useNavLayer(
    sendEmailOpen,
    () => setSendEmailOpen(false),
    `contact-email-${detail.id}`,
  );
  const { requestClose: requestCloseCall } = useNavLayer(
    callOpen,
    () => setCallOpen(false),
    `contact-call-${detail.id}`,
  );
  const { requestClose: requestCloseProfilePreview } = useNavLayer(
    profilePreviewOpen,
    () => setProfilePreviewOpen(false),
    `contact-profile-photo-${detail.id}`,
  );

  const profilePreviewFile =
    detail.profilePhotoUrl != null && detail.profilePhotoUrl !== ''
      ? {
          id: 'profile-photo',
          name: 'Profile photo',
          url: detail.profilePhotoUrl,
          isImage: true,
        }
      : null;

  const resetForm = () => {
    setName(detail.name);
    setEmail(detail.email === '—' ? '' : detail.email);
    setPhone(detail.phone ?? '');
    setDateOfBirth(detail.demographics?.dateOfBirth ?? '');
    setAddressStreet(detail.demographics?.address ?? '');
    setAddressCity(detail.demographics?.city ?? '');
    setAddressState(detail.demographics?.state ?? '');
    setAddressZip(detail.demographics?.zip ?? '');
    setAddressCountry(detail.demographics?.country ?? '');
    setTags(detail.tags);
  };

  useEffect(() => {
    resetForm();
    setEditing(false);
    setSaveMessage(null);
  }, [detail.id]);

  useEffect(() => {
    if (!editing) {
      resetForm();
    }
  }, [detail, editing]);

  const formattedAddress = detail.demographics
    ? formatContactAddress(detail.demographics)
    : null;

  const displayEmail = detail.email;
  const displayPhone = detail.phone;
  const displayDateOfBirth = detail.demographics?.dateOfBirth?.trim() || null;

  const handleSave = async () => {
    if (!onSave) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      await onSave({
        name: trimmedName,
        email: email.trim() || '—',
        phone: phone.trim() || undefined,
        tags: [...tags],
        demographics: {
          dateOfBirth: dateOfBirth.trim() || undefined,
          address: addressStreet.trim() || undefined,
          city: addressCity.trim() || undefined,
          state: addressState.trim() || undefined,
          zip: addressZip.trim() || undefined,
          country: addressCountry.trim() || undefined,
        },
      });
      setEditing(false);
      setSaveMessage('Saved');
      window.setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      // Stay in edit mode; ContactDetailPanel shows the error banner.
    }
  };

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-gradient-to-br from-crm-taupe-50 to-crm-surface p-6 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-4">
          <VolunteerAvatar
            name={detail.name}
            profilePhotoUrl={detail.profilePhotoUrl}
            size="md"
            onClick={
              profilePreviewFile
                ? () => setProfilePreviewOpen(true)
                : undefined
            }
          />
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-2xl font-semibold text-crm-heading outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
            />
          ) : (
            <h2 className="min-w-0 text-2xl font-semibold text-crm-heading">
              {detail.name}
            </h2>
          )}
        </div>

        {editing ? (
          <div className="mt-3">
            <p className="mb-2 text-xs text-crm-slate">Click to change tag type</p>
            <div className="flex flex-wrap gap-2">
              {CONTACT_TAGS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTags((current) => toggleContactTag(current, tag))
                    }
                    className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                      selected
                        ? contactTagFilterSelectedClass(tag)
                        : 'contact-tag-pulse bg-crm-white text-crm-text ring-1 ring-crm-taupe/25 hover:bg-crm-taupe-100'
                    }`}
                  >
                    {CONTACT_TAG_LABELS[tag]}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          detail.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.tags.map((tag) => (
                <span key={tag} className={contactTagPillClass(tag)}>
                  {CONTACT_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3">
            <Field label="Email">
              {editing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              ) : displayEmail && displayEmail !== '—' ? (
                <button
                  type="button"
                  onClick={() => setSendEmailOpen(true)}
                  className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                >
                  {displayEmail}
                </button>
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Phone">
              {editing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              ) : displayPhone ? (
                <button
                  type="button"
                  onClick={() => setCallOpen(true)}
                  className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                >
                  {displayPhone}
                </button>
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Date of birth">
              {editing ? (
                <input
                  type="text"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  placeholder="e.g. March 15, 1998"
                  className={inputClass}
                />
              ) : displayDateOfBirth ? (
                <span className="font-medium text-crm-heading">
                  {displayDateOfBirth}
                </span>
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Address" tall={editing}>
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Street"
                    className={inputClass}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="City"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      placeholder="State"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={addressZip}
                      onChange={(e) => setAddressZip(e.target.value)}
                      placeholder="Zip"
                      className={inputClass}
                    />
                  </div>
                  <input
                    type="text"
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                    placeholder="Country"
                    className={inputClass}
                  />
                </div>
              ) : formattedAddress ? (
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

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !name.trim() || !editable}
                  className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo-dark disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setEditing(false);
                  }}
                  disabled={saving}
                  className={editButtonClass}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={!editable}
                  title={
                    editable
                      ? 'Edit contact details'
                      : 'Editing is disabled in read-only mode'
                  }
                  className={editButtonClass}
                >
                  Edit details
                </button>
                <ContactMigrationActions
                  detail={detail}
                  onGoToRecruitment={onGoToRecruitment}
                />
              </>
            )}
            {saveMessage && (
              <span className="text-sm text-emerald-700">{saveMessage}</span>
            )}
          </div>
      </div>

      {sendEmailOpen && (
        <ContactSendEmailModal contact={detail} onClose={requestCloseEmail} />
      )}

      {callOpen && detail.phone && (
        <ContactCallModal
          contactName={detail.name}
          phone={detail.phone}
          onClose={requestCloseCall}
        />
      )}

      {profilePreviewOpen && profilePreviewFile && (
        <FilePreviewModal
          file={profilePreviewFile}
          volunteerName={detail.name}
          backLabel="contact"
          onClose={requestCloseProfilePreview}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
  tall = false,
}: {
  label: string;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl bg-crm-surface/80 px-4 py-3 ring-1 ring-crm-taupe/20/80 ${
        tall ? 'min-h-[8.5rem]' : 'h-24'
      }`}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
        {label}
      </dt>
      <dd className="mt-1 flex-1 overflow-hidden text-sm">{children}</dd>
    </div>
  );
}
