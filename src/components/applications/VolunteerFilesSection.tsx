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

export default function VolunteerFilesSection({
  volunteerName,
  profilePhotoUrl,
  passportFile,
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
      <ul className="space-y-3">
        <FileRow
          label="Profile photo"
          file={slots.profilePhoto}
          onOpen={(file) => runFileAction(file, 'preview', 'profile')}
          onDownload={(file) => runFileAction(file, 'download', 'profile')}
        />
        <FileRow
          label="Passport"
          file={slots.passport}
          onOpen={(file) => runFileAction(file, 'preview', 'passport')}
          onDownload={(file) => runFileAction(file, 'download', 'passport')}
        />
        <FileRow
          label="Background check"
          file={slots.backgroundCheck}
          onOpen={(file) => runFileAction(file, 'preview', 'backgroundcheck')}
          onDownload={(file) =>
            runFileAction(file, 'download', 'backgroundcheck')
          }
          locked={Boolean(slots.backgroundCheck?.url)}
        />
        <FileRow
          label="Child safeguarding certificate"
          file={slots.childSafeguarding}
          onOpen={(file) =>
            runFileAction(file, 'preview', 'childsafeguarding')
          }
          onDownload={(file) =>
            runFileAction(file, 'download', 'childsafeguarding')
          }
        />
      </ul>

      {showOtherFiles && slots.otherFiles.length > 0 && (
        <div className="mt-5 border-t border-crm-taupe/20 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
            Other documents
          </h4>
          <ul className="mt-3 flex flex-col gap-2">
            {slots.otherFiles.map((file) => (
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
                  {/itinerary/i.test(file.name) && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                      Itinerary
                    </span>
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
            ))}
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
      ) : (
        <div
          className={
            embeddedInGrid
              ? 'border-t border-crm-taupe/20 pt-5 md:border-t-0 md:pt-0'
              : 'mt-6 border-t border-crm-taupe/20 pt-5'
          }
        >
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
}: {
  label: string;
  file?: VolunteerFile;
  onOpen: (file: VolunteerFile) => void;
  onDownload: (file: VolunteerFile) => void;
  locked?: boolean;
}) {
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
