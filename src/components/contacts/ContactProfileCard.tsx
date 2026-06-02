import type { ReactNode } from 'react';
import {
  CONTACT_TAGS,
  CONTACT_TAG_LABELS,
  type ContactDetail,
  type ContactTag,
} from '../../types/contact';
import VolunteerAvatar from '../applications/VolunteerAvatar';

interface ContactProfileCardProps {
  detail: ContactDetail;
  onTagsChange?: (tags: ContactTag[]) => void;
  savingTags?: boolean;
}

export default function ContactProfileCard({
  detail,
  onTagsChange,
  savingTags,
}: ContactProfileCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <VolunteerAvatar
          name={detail.name}
          profilePhotoUrl={detail.profilePhotoUrl}
          size="lg"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-slate-900">{detail.name}</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {onTagsChange
              ? CONTACT_TAGS.map((tag) => {
                  const active = detail.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={savingTags}
                      onClick={() => {
                        const next = active
                          ? detail.tags.filter((t) => t !== tag)
                          : [...detail.tags, tag];
                        onTagsChange(next);
                      }}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition disabled:opacity-50 ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {CONTACT_TAG_LABELS[tag]}
                    </button>
                  );
                })
              : detail.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                  >
                    {CONTACT_TAG_LABELS[tag]}
                  </span>
                ))}
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              {detail.email && detail.email !== '—' ? (
                <a
                  href={`mailto:${detail.email}`}
                  className="font-medium text-slate-900 underline-offset-2 hover:underline"
                >
                  {detail.email}
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </Field>
            <Field label="Phone">
              {detail.phone || (
                <span className="text-slate-400">Not provided</span>
              )}
            </Field>
          </dl>
        </div>
      </div>
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
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
