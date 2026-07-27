import { useRef, useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import type { VolunteerFile } from '../../types/volunteer';
import {
  fileRequiresPassword,
  resolveVolunteerFileSlots,
} from '../../utils/volunteerFileSlots';
import {
  inferVolunteerFileSlotKey,
  suggestedDownloadFilename,
  type VolunteerFileSlotKey,
} from '../../utils/volunteerDownloadFilename';
import BackgroundCheckPasswordModal from './BackgroundCheckPasswordModal';
import DownloadFileModal from './DownloadFileModal';
import FilePreviewModal from './FilePreviewModal';

interface VolunteerFilesSectionProps {
  volunteerName?: string;
  profilePhotoUrl?: string;
  passportFile?: VolunteerFile;
  childSafeguardingFile?: VolunteerFile;
  files?: VolunteerFile[];
  showOtherFiles?: boolean;
  variant?: 'panel' | 'inline';
  embeddedInGrid?: boolean;
}

type FileAction = 'preview' | 'download';

type DownloadPrompt = {
  file: VolunteerFile;
  defaultFilename: string;
};

const FILE_LABEL_STYLES: Record<string, string> = {
  'Profile photo': 'bg-sky-50 text-sky-700 ring-sky-200/80',
  Passport: 'bg-violet-50 text-violet-700 ring-violet-200/80',
  'Background check': 'bg-amber-50 text-amber-800 ring-amber-200/80',
  'Child safeguarding certificate':
    'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  Itinerary: 'bg-teal-50 text-teal-700 ring-teal-200/80',
};

const FILE_LABEL_GREY_STYLE = 'bg-stone-100 text-stone-500 ring-stone-200/80';

const FILE_COMPACT_PILL_LABELS: Record<string, string> = {
  'Profile photo': 'Photo',
  'Background check': 'Background',
  'Child safeguarding certificate': 'Safeguarding',
};

export default function VolunteerFilesSection({
  volunteerName,
  profilePhotoUrl,
  passportFile,
  childSafeguardingFile,
  files = [],
  showOtherFiles = false,
  variant = 'inline',
  embeddedInGrid = false,
}: VolunteerFilesSectionProps) {
  const [previewFile, setPreviewFile] = useState<VolunteerFile | null>(null);
  const [passwordFile, setPasswordFile] = useState<VolunteerFile | null>(null);
  const [passwordAction, setPasswordAction] = useState<FileAction>('preview');
  const [downloadPrompt, setDownloadPrompt] = useState<DownloadPrompt | null>(
    null,
  );
  const pendingDownloadSlotRef = useRef<VolunteerFileSlotKey>('other');

  const { requestClose: requestClosePreview } = useNavLayer(
    previewFile !== null,
    () => setPreviewFile(null),
    `file-preview-${previewFile?.id ?? 'none'}`,
  );

  const { requestClose: requestClosePassword } = useNavLayer(
    passwordFile !== null,
    () => setPasswordFile(null),
    `background-password-${passwordFile?.id ?? 'none'}`,
  );

  const { requestClose: requestCloseDownload } = useNavLayer(
    downloadPrompt !== null,
    () => setDownloadPrompt(null),
    `file-download-${downloadPrompt?.file.id ?? 'none'}`,
  );

  const slots = resolveVolunteerFileSlots(
    profilePhotoUrl,
    files,
    passportFile,
    childSafeguardingFile,
  );

  const defaultFilenameFor = (file: VolunteerFile, slotKey: VolunteerFileSlotKey) =>
    volunteerName
      ? suggestedDownloadFilename(volunteerName, slotKey, file.name)
      : file.name;

  const openDownloadPrompt = (
    file: VolunteerFile,
    slotKey: VolunteerFileSlotKey,
  ) => {
    setDownloadPrompt({
      file,
      defaultFilename: defaultFilenameFor(file, slotKey),
    });
  };

  const runFileAction = (
    file: VolunteerFile,
    action: FileAction,
    slotKey: VolunteerFileSlotKey,
  ) => {
    if (fileRequiresPassword(file)) {
      pendingDownloadSlotRef.current = slotKey;
      setPasswordFile(file);
      setPasswordAction(action);
      return;
    }

    if (action === 'download') {
      openDownloadPrompt(file, slotKey);
      return;
    }

    setPreviewFile(file);
  };

  const content = (
    <>
      <ul className={embeddedInGrid ? 'space-y-1.5' : 'space-y-3'}>
        <FileRow
          label="Profile photo"
          file={slots.profilePhoto}
          compact={embeddedInGrid}
          onOpen={(file) => runFileAction(file, 'preview', 'profile')}
          onDownload={(file) => runFileAction(file, 'download', 'profile')}
        />
        <FileRow
          label="Passport"
          file={slots.passport}
          compact={embeddedInGrid}
          onOpen={(file) => runFileAction(file, 'preview', 'passport')}
          onDownload={(file) => runFileAction(file, 'download', 'passport')}
        />
        <FileRow
          label="Background check"
          file={slots.backgroundCheck}
          compact={embeddedInGrid}
          onOpen={(file) => runFileAction(file, 'preview', 'backgroundcheck')}
          onDownload={(file) =>
            runFileAction(file, 'download', 'backgroundcheck')
          }
          locked={Boolean(slots.backgroundCheck?.url)}
        />
        <FileRow
          label="Child safeguarding certificate"
          file={slots.childSafeguarding}
          compact={embeddedInGrid}
          onOpen={(file) =>
            runFileAction(file, 'preview', 'childsafeguarding')
          }
          onDownload={(file) =>
            runFileAction(file, 'download', 'childsafeguarding')
          }
        />
        {slots.itineraryFiles.length === 0 ? (
          <FileRow
            label="Itinerary"
            file={undefined}
            compact={embeddedInGrid}
            onOpen={() => undefined}
            onDownload={() => undefined}
          />
        ) : (
          slots.itineraryFiles.map((file, index) => (
            <FileRow
              key={file.id}
              label={index === 0 ? 'Itinerary' : `Itinerary (${index + 1})`}
              file={file}
              compact={embeddedInGrid}
              onOpen={(f) => runFileAction(f, 'preview', 'itinerary')}
              onDownload={(f) => runFileAction(f, 'download', 'itinerary')}
            />
          ))
        )}
      </ul>

      {showOtherFiles && slots.otherFiles.length > 0 && (
        <div
          className={
            embeddedInGrid
              ? 'mt-3 border-t border-crm-taupe/20 pt-3'
              : 'mt-5 border-t border-crm-taupe/20 pt-4'
          }
        >
          {!embeddedInGrid && (
            <h4 className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
              Other documents
            </h4>
          )}
          <ul
            className={
              embeddedInGrid
                ? 'mt-0 space-y-1.5'
                : 'mt-3 flex flex-col gap-2'
            }
          >
            {slots.otherFiles.map((file) =>
              embeddedInGrid ? (
                <OtherFileRow
                  key={file.id}
                  file={file}
                  onOpen={() =>
                    runFileAction(
                      file,
                      'preview',
                      inferVolunteerFileSlotKey(file),
                    )
                  }
                  onDownload={() =>
                    runFileAction(
                      file,
                      'download',
                      inferVolunteerFileSlotKey(file),
                    )
                  }
                />
              ) : (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {file.url ? (
                      <button
                        type="button"
                        onClick={() =>
                          runFileAction(
                            file,
                            'preview',
                            inferVolunteerFileSlotKey(file),
                          )
                        }
                        className="text-left text-sm font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                      >
                        {file.name}
                      </button>
                    ) : (
                      <span className="text-sm text-crm-slate">{file.name}</span>
                    )}
                  </div>
                  {file.url && (
                    <DownloadButton
                      onClick={() =>
                        runFileAction(
                          file,
                          'download',
                          inferVolunteerFileSlotKey(file),
                        )
                      }
                    />
                  )}
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <>
      {variant === 'panel' ? (
        <div className="flex h-full flex-col rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
          <h3 className="text-lg font-semibold text-crm-heading">Files</h3>
          <div className="mt-4">{content}</div>
        </div>
      ) : embeddedInGrid ? (
        <div className="flex h-full flex-col rounded-xl border border-crm-taupe/20 bg-crm-white px-4 py-3">
          <h3 className="text-sm font-semibold text-crm-heading">Files</h3>
          <div className="mt-2 flex-1">{content}</div>
        </div>
      ) : (
        <div className="mt-6 border-t border-crm-taupe/20 pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
            Files
          </h3>
          <div className="mt-3">{content}</div>
        </div>
      )}

      {passwordFile && (
        <BackgroundCheckPasswordModal
          file={passwordFile}
          onClose={requestClosePassword}
          onSuccess={() => {
            const slotKey = pendingDownloadSlotRef.current;
            if (passwordAction === 'download') {
              openDownloadPrompt(passwordFile, slotKey);
            } else {
              setPreviewFile(passwordFile);
            }
            setPasswordFile(null);
          }}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          volunteerName={volunteerName}
          onClose={requestClosePreview}
        />
      )}

      {downloadPrompt && (
        <DownloadFileModal
          file={downloadPrompt.file}
          defaultFilename={downloadPrompt.defaultFilename}
          backLabel="files"
          onClose={requestCloseDownload}
        />
      )}
    </>
  );
}

function FileRow({
  label,
  file,
  onOpen,
  onDownload,
  locked = false,
  compact = false,
}: {
  label: string;
  file?: VolunteerFile;
  onOpen: (file: VolunteerFile) => void;
  onDownload: (file: VolunteerFile) => void;
  locked?: boolean;
  compact?: boolean;
}) {
  const isEmpty = !file?.url;

  if (compact) {
    const rowTone = isEmpty
      ? 'bg-stone-50/90 ring-stone-200/70'
      : 'bg-crm-surface ring-crm-taupe/20';

    return (
      <li
        onClick={file?.url ? () => onOpen(file) : undefined}
        className={`flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2 ring-1 ${rowTone}${
          file?.url
            ? ' cursor-pointer transition hover:ring-crm-taupe/45'
            : ''
        }`}
      >
        <FileLabelPill label={label} empty={isEmpty} compact />

        {isEmpty ? (
          <span className="min-w-0 flex-1 text-xs text-stone-400">—</span>
        ) : (
          <>
            {locked && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                Password
              </span>
            )}
            <div className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium text-crm-heading">
                {file.name}
              </span>
            </div>
            <div
              className="flex shrink-0 flex-wrap items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <MiniDownloadButton onClick={() => onDownload(file)} />
            </div>
          </>
        )}
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-crm-surface/80 px-4 py-3 ring-1 ring-crm-taupe/20/80">
      <div className="text-xs font-medium uppercase tracking-wide text-crm-slate">
        {label}
      </div>
      {file?.url ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(file)}
              className="text-left text-sm font-medium text-crm-heading underline-offset-2 hover:underline"
            >
              {file.name}
            </button>
            {locked && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Password required
              </span>
            )}
          </div>
          <DownloadButton onClick={() => onDownload(file)} />
        </div>
      ) : (
        <p className="mt-1 text-sm text-crm-slate">Not provided</p>
      )}
    </li>
  );
}

function OtherFileRow({
  file,
  onOpen,
  onDownload,
}: {
  file: VolunteerFile;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const isEmpty = !file.url;
  const rowTone = isEmpty
    ? 'bg-stone-50/90 ring-stone-200/70'
    : 'bg-crm-surface ring-crm-taupe/20';

  return (
    <li
      onClick={file.url ? onOpen : undefined}
      className={`flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2 ring-1 ${rowTone}${
        file.url ? ' cursor-pointer transition hover:ring-crm-taupe/45' : ''
      }`}
    >
      <FileLabelPill label="Other" empty={isEmpty} />
      {isEmpty ? (
        <span className="min-w-0 flex-1 text-xs text-stone-400">—</span>
      ) : (
        <>
          <div className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-crm-heading">
              {file.name}
            </span>
          </div>
          <div
            className="flex shrink-0 flex-wrap items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <MiniDownloadButton onClick={onDownload} />
          </div>
        </>
      )}
    </li>
  );
}

function FileLabelPill({
  label,
  empty = false,
  compact = false,
}: {
  label: string;
  empty?: boolean;
  compact?: boolean;
}) {
  const styleKey = label.startsWith('Itinerary') ? 'Itinerary' : label;
  const style = empty
    ? FILE_LABEL_GREY_STYLE
    : (FILE_LABEL_STYLES[styleKey] ??
      'bg-crm-taupe-50 text-crm-heading ring-crm-taupe/30');
  const displayLabel =
    compact && FILE_COMPACT_PILL_LABELS[label]
      ? FILE_COMPACT_PILL_LABELS[label]
      : label.startsWith('Itinerary')
        ? 'Itinerary'
        : label;

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${style}`}
    >
      {displayLabel}
    </span>
  );
}

function MiniDownloadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Download this file"
      onClick={onClick}
      className="rounded-md border border-crm-taupe/25 bg-crm-white px-2 py-0.5 text-[11px] font-medium text-crm-heading transition hover:bg-crm-taupe-50"
    >
      Download
    </button>
  );
}

function DownloadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-lg border border-crm-taupe/20 bg-crm-surface px-3 py-1.5 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50"
    >
      Download
    </button>
  );
}
