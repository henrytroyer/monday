import { useState, type ReactNode } from 'react';
import { getTimelineLabel } from '../../data/timelines';
import type { VolunteerDetail, VolunteerFile } from '../../types/volunteer';
import FilePreviewModal from './FilePreviewModal';
import {
  displayLocationPreference,
  hasDistinctAssignedLocation,
} from '../../utils/volunteerLocation';
import VolunteerAvatar from './VolunteerAvatar';

interface VolunteerContactCardProps {
  detail: VolunteerDetail;
}

export default function VolunteerContactCard({
  detail,
}: VolunteerContactCardProps) {
  const [previewFile, setPreviewFile] = useState<VolunteerFile | null>(null);
  const timelineLabel = getTimelineLabel(detail.timelineId);

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
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {displayLocationPreference(detail)}
            </span>
            {hasDistinctAssignedLocation(detail) && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-800">
                Assigned: {detail.location}
              </span>
            )}
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              {timelineLabel}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
              {detail.status}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <ContactField label="Email">
              {detail.email !== '—' ? (
                <a
                  href={`mailto:${detail.email}`}
                  className="font-medium text-slate-900 underline-offset-2 hover:underline"
                >
                  {detail.email}
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </ContactField>
            <ContactField label="Phone">
              {detail.phone !== '—' ? (
                <a
                  href={`tel:${detail.phone.replace(/\s/g, '')}`}
                  className="font-medium text-slate-900 underline-offset-2 hover:underline"
                >
                  {detail.phone}
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </ContactField>
          </dl>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Files
        </h3>
        {detail.files.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No files attached yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {detail.files.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center gap-2">
                {file.url ? (
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="text-left text-sm font-medium text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
                  >
                    {file.name}
                  </button>
                ) : (
                  <span className="text-sm text-slate-500">{file.name}</span>
                )}
                {isItineraryFileName(file.name) && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                    Itinerary
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

function isItineraryFileName(name: string): boolean {
  return /itinerary/i.test(name);
}

function ContactField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/80">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
