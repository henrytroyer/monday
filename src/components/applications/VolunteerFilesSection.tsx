import { useEffect, useRef, useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import type { VolunteerFile } from '../../types/volunteer';
import { stripArchivedVolunteerFilePrefix } from '../../utils/archivedVolunteerFiles';
import {
  fileRequiresPassword,
  resolveVolunteerFileSlots,
} from '../../utils/volunteerFileSlots';
import {
  inferVolunteerFileSlotKey,
  suggestedDownloadFilename,
  type VolunteerFileSlotKey,
} from '../../utils/volunteerDownloadFilename';
import ConfirmDialog from '../shared/ConfirmDialog';
import BackgroundCheckPasswordModal from './BackgroundCheckPasswordModal';
import DownloadFileModal from './DownloadFileModal';
import FilePreviewModal from './FilePreviewModal';
import {
  uploadFileToApplicationColumn,
  type MondayFileSlot,
} from '../../services/uploadMondayFile';
import { removeVolunteerFileFromMonday } from '../../services/removeMondayFile';
import { downloadVolunteerFile } from '../../utils/filePreview';

interface VolunteerFilesSectionProps {
  volunteerName?: string;
  profilePhotoUrl?: string;
  passportFile?: VolunteerFile;
  childSafeguardingFile?: VolunteerFile;
  files?: VolunteerFile[];
  showOtherFiles?: boolean;
  variant?: 'panel' | 'inline';
  embeddedInGrid?: boolean;
  /** When set with boardId, allow uploading into Monday file columns. */
  itemId?: string;
  boardId?: string | null;
  canUpload?: boolean;
  onUploaded?: () => void;
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
  Files: 'bg-stone-100 text-stone-700 ring-stone-200/80',
};

const FILE_LABEL_GREY_STYLE = 'bg-stone-100 text-stone-500 ring-stone-200/80';

const FILE_COMPACT_PILL_LABELS: Record<string, string> = {
  'Profile photo': 'Photo',
  'Background check': 'Background',
  'Child safeguarding certificate': 'Safeguarding',
  Files: 'Files',
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
  itemId,
  boardId,
  canUpload = false,
  onUploaded,
}: VolunteerFilesSectionProps) {
  const [previewFile, setPreviewFile] = useState<VolunteerFile | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [removingFileId, setRemovingFileId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [passwordFile, setPasswordFile] = useState<VolunteerFile | null>(null);
  const [passwordAction, setPasswordAction] = useState<FileAction>('preview');
  const [downloadPrompt, setDownloadPrompt] = useState<DownloadPrompt | null>(
    null,
  );
  const [pendingRemoveFiles, setPendingRemoveFiles] = useState<VolunteerFile[]>(
    [],
  );
  const [bulkBusy, setBulkBusy] = useState(false);
  const pendingDownloadSlotRef = useRef<VolunteerFileSlotKey>('other');

  const canRemoveFiles = Boolean(canUpload && boardId && itemId);

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

  const { requestClose: requestCloseRemoveConfirm } = useNavLayer(
    pendingRemoveFiles.length > 0 && removingFileId === null && !bulkBusy,
    () => setPendingRemoveFiles([]),
    `file-remove-${pendingRemoveFiles.map((f) => f.id).join('-') || 'none'}`,
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

  const handleUpload = async (slot: MondayFileSlot, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !itemId || !boardId || !canUpload) return;
    setUploadError(null);
    setUploadingSlot(slot);
    try {
      await uploadFileToApplicationColumn(boardId, itemId, slot, file);
      onUploaded?.();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload file',
      );
    } finally {
      setUploadingSlot(null);
    }
  };

  const requestRemove = (file: VolunteerFile) => {
    if (!itemId || !boardId || !canRemoveFiles) return;
    setPendingRemoveFiles([file]);
  };

  const requestRemoveMany = (filesToRemove: VolunteerFile[]) => {
    if (!itemId || !boardId || !canRemoveFiles || filesToRemove.length === 0) {
      return;
    }
    setPendingRemoveFiles(filesToRemove);
  };

  const confirmRemove = async () => {
    const filesToRemove = pendingRemoveFiles;
    if (filesToRemove.length === 0 || !itemId || !boardId || !canRemoveFiles) {
      return;
    }
    setUploadError(null);
    setBulkBusy(true);
    try {
      for (const file of filesToRemove) {
        setRemovingFileId(file.id);
        await removeVolunteerFileFromMonday(boardId, itemId, file);
      }
      setPendingRemoveFiles([]);
      onUploaded?.();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not remove file',
      );
    } finally {
      setRemovingFileId(null);
      setBulkBusy(false);
    }
  };

  const downloadMany = async (filesToDownload: VolunteerFile[]) => {
    if (filesToDownload.length === 0) return;
    setUploadError(null);
    setBulkBusy(true);
    try {
      for (const file of filesToDownload) {
        if (fileRequiresPassword(file)) {
          pendingDownloadSlotRef.current = inferVolunteerFileSlotKey(file);
          setPasswordFile(file);
          setPasswordAction('download');
          break;
        }
        const slotKey = inferVolunteerFileSlotKey({
          ...file,
          name: stripArchivedVolunteerFilePrefix(file.name),
        });
        const filename = defaultFilenameFor(file, slotKey);
        await downloadVolunteerFile(file, filename);
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not download files',
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const content = (
    <>
      {canUpload && boardId && itemId && (
        <div className="mb-3 space-y-2 rounded-xl border border-dashed border-crm-taupe/40 bg-crm-taupe-50/60 p-3">
          <p className="text-xs font-medium text-crm-heading">
            Upload
          </p>
          <p className="text-[11px] text-crm-slate">
            A new upload replaces the current file for that slot. Previous files
            are kept under Files.
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['passport', 'Passport'],
                ['releaseForms', 'Release forms'],
                ['itineraryFiles', 'Itinerary'],
                ['profilePhoto', 'Profile photo'],
              ] as const
            ).map(([slot, label]) => (
              <label
                key={slot}
                className="cursor-pointer rounded-lg border border-crm-taupe/30 bg-crm-white px-2.5 py-1 text-xs text-crm-heading hover:bg-crm-taupe-50"
              >
                {uploadingSlot === slot ? 'Uploading…' : label}
                <input
                  type="file"
                  className="hidden"
                  disabled={Boolean(uploadingSlot)}
                  onChange={(e) => {
                    void handleUpload(slot, e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            ))}
          </div>
          {uploadError && (
            <p className="text-xs text-amber-800">{uploadError}</p>
          )}
        </div>
      )}
      <ul className={embeddedInGrid ? 'space-y-1.5' : 'space-y-3'}>
        <FileRow
          label="Profile photo"
          file={slots.profilePhoto}
          compact={embeddedInGrid}
          removing={removingFileId === slots.profilePhoto?.id}
          onOpen={(file) => runFileAction(file, 'preview', 'profile')}
          onDownload={(file) => runFileAction(file, 'download', 'profile')}
          onRemove={
            canRemoveFiles ? (file) => requestRemove(file) : undefined
          }
        />
        <FileRow
          label="Passport"
          file={slots.passport}
          compact={embeddedInGrid}
          removing={removingFileId === slots.passport?.id}
          onOpen={(file) => runFileAction(file, 'preview', 'passport')}
          onDownload={(file) => runFileAction(file, 'download', 'passport')}
          onRemove={
            canRemoveFiles ? (file) => requestRemove(file) : undefined
          }
        />
        <FileRow
          label="Background check"
          file={slots.backgroundCheck}
          compact={embeddedInGrid}
          removing={removingFileId === slots.backgroundCheck?.id}
          onOpen={(file) => runFileAction(file, 'preview', 'backgroundcheck')}
          onDownload={(file) =>
            runFileAction(file, 'download', 'backgroundcheck')
          }
          onRemove={
            canRemoveFiles ? (file) => requestRemove(file) : undefined
          }
          locked={Boolean(slots.backgroundCheck?.url)}
        />
        <FileRow
          label="Child safeguarding certificate"
          file={slots.childSafeguarding}
          compact={embeddedInGrid}
          removing={removingFileId === slots.childSafeguarding?.id}
          onOpen={(file) =>
            runFileAction(file, 'preview', 'childsafeguarding')
          }
          onDownload={(file) =>
            runFileAction(file, 'download', 'childsafeguarding')
          }
          onRemove={
            canRemoveFiles ? (file) => requestRemove(file) : undefined
          }
        />
        <FileRow
          label="Itinerary"
          file={slots.itineraryFiles[0]}
          compact={embeddedInGrid}
          removing={removingFileId === slots.itineraryFiles[0]?.id}
          onOpen={(file) => runFileAction(file, 'preview', 'itinerary')}
          onDownload={(file) => runFileAction(file, 'download', 'itinerary')}
          onRemove={
            canRemoveFiles && slots.itineraryFiles[0]
              ? (file) => requestRemove(file)
              : undefined
          }
        />
        <FilesBubble
          files={slots.oldFiles}
          compact={embeddedInGrid}
          removingFileId={removingFileId}
          busy={bulkBusy}
          canRemove={canRemoveFiles}
          onOpen={(file, slotKey) => runFileAction(file, 'preview', slotKey)}
          onDownload={(file, slotKey) =>
            runFileAction(file, 'download', slotKey)
          }
          onDownloadMany={(filesToDownload) =>
            void downloadMany(filesToDownload)
          }
          onRemove={
            canRemoveFiles ? (file) => requestRemove(file) : undefined
          }
          onRemoveMany={
            canRemoveFiles
              ? (filesToRemove) => requestRemoveMany(filesToRemove)
              : undefined
          }
        />
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
                  removing={removingFileId === file.id}
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
                  onRemove={
                    canRemoveFiles ? () => requestRemove(file) : undefined
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
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <DownloadButton
                        onClick={() =>
                          runFileAction(
                            file,
                            'download',
                            inferVolunteerFileSlotKey(file),
                          )
                        }
                      />
                      {canRemoveFiles && (
                        <RemoveButton
                          busy={removingFileId === file.id}
                          onClick={() => requestRemove(file)}
                        />
                      )}
                    </div>
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

      <ConfirmDialog
        open={pendingRemoveFiles.length > 0}
        title={
          pendingRemoveFiles.length > 1 ? 'Remove files' : 'Remove file'
        }
        message={
          pendingRemoveFiles.length === 0
            ? ''
            : pendingRemoveFiles.length === 1
              ? `Remove “${stripArchivedVolunteerFilePrefix(pendingRemoveFiles[0]!.name) || 'this file'}” from this application? This cannot be undone from the portal.`
              : `Remove ${pendingRemoveFiles.length} selected files from this application? This cannot be undone from the portal.`
        }
        confirmLabel={
          pendingRemoveFiles.length > 1
            ? `Remove ${pendingRemoveFiles.length}`
            : 'Remove'
        }
        cancelLabel="Cancel"
        tone="danger"
        busy={removingFileId !== null || bulkBusy}
        onConfirm={() => void confirmRemove()}
        onCancel={requestCloseRemoveConfirm}
      />
    </>
  );
}

function FilesBubble({
  files,
  compact = false,
  removingFileId,
  busy = false,
  canRemove,
  onOpen,
  onDownload,
  onDownloadMany,
  onRemove,
  onRemoveMany,
}: {
  files: VolunteerFile[];
  compact?: boolean;
  removingFileId: string | null;
  busy?: boolean;
  canRemove: boolean;
  onOpen: (file: VolunteerFile, slotKey: VolunteerFileSlotKey) => void;
  onDownload: (file: VolunteerFile, slotKey: VolunteerFileSlotKey) => void;
  onDownloadMany: (files: VolunteerFile[]) => void;
  onRemove?: (file: VolunteerFile) => void;
  onRemoveMany?: (files: VolunteerFile[]) => void;
}) {
  const multiSelect = files.length > 1;
  const [expanded, setExpanded] = useState(multiSelect);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Keep selection in sync when the file list changes.
  const fileIdsKey = files.map((f) => f.id).join('|');
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const file of files) {
        if (prev.has(file.id)) next.add(file.id);
      }
      return next;
    });
    if (files.length > 1) setExpanded(true);
  }, [fileIdsKey, files]);

  const isEmpty = files.length === 0;
  const summary =
    files.length === 1
      ? stripArchivedVolunteerFilePrefix(files[0]!.name)
      : `${files.length} previous files`;
  const selectedFiles = files.filter((file) => selectedIds.has(file.id));
  const allSelected = multiSelect && selectedFiles.length === files.length;

  const toggleSelected = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      allSelected ? new Set() : new Set(files.map((file) => file.id)),
    );
  };

  const fileRow = (file: VolunteerFile, dense: boolean) => {
    const displayName = stripArchivedVolunteerFilePrefix(file.name);
    const slotKey = inferVolunteerFileSlotKey({
      ...file,
      name: displayName,
    });
    const selected = selectedIds.has(file.id);

    return (
      <li
        key={`files-${file.id}`}
        className={`flex flex-wrap items-center gap-2 ${
          dense ? '' : 'justify-between'
        }`}
      >
        {multiSelect && (
          <label className="flex shrink-0 items-center gap-2">
            <input
              type="checkbox"
              checked={selected}
              disabled={busy}
              onChange={() => toggleSelected(file.id)}
              className="h-3.5 w-3.5 rounded border-crm-taupe/40 text-crm-indigo focus:ring-crm-taupe/30"
            />
            <span className="sr-only">Select {displayName}</span>
          </label>
        )}
        <button
          type="button"
          onClick={() => onOpen(file, slotKey)}
          className={`min-w-0 flex-1 text-left font-medium text-crm-heading underline-offset-2 hover:underline ${
            dense ? 'truncate text-xs' : 'text-sm'
          }`}
        >
          {displayName}
        </button>
        {!multiSelect && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {dense ? (
              <MiniDownloadButton onClick={() => onDownload(file, slotKey)} />
            ) : (
              <DownloadButton onClick={() => onDownload(file, slotKey)} />
            )}
            {canRemove && onRemove && (
              dense ? (
                <MiniRemoveButton
                  busy={removingFileId === file.id}
                  onClick={() => onRemove(file)}
                />
              ) : (
                <RemoveButton
                  busy={removingFileId === file.id}
                  onClick={() => onRemove(file)}
                />
              )
            )}
          </div>
        )}
      </li>
    );
  };

  const bulkActions = multiSelect && expanded && (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        compact ? 'px-2.5 pb-2' : 'mt-3'
      }`}
    >
      <button
        type="button"
        disabled={busy}
        onClick={toggleSelectAll}
        className="rounded-md border border-crm-taupe/25 bg-crm-white px-2.5 py-1 text-[11px] font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
      >
        {allSelected ? 'Clear' : 'Select all'}
      </button>
      <button
        type="button"
        disabled={busy || selectedFiles.length === 0}
        onClick={() => onDownloadMany(selectedFiles)}
        className="rounded-md border border-crm-taupe/25 bg-crm-white px-2.5 py-1 text-[11px] font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
      >
        Download selected
        {selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}
      </button>
      {canRemove && onRemoveMany && (
        <button
          type="button"
          disabled={busy || selectedFiles.length === 0}
          onClick={() => onRemoveMany(selectedFiles)}
          className="rounded-md border border-rose-200 bg-crm-white px-2.5 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
        >
          Remove selected
          {selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}
        </button>
      )}
    </div>
  );

  if (compact) {
    const rowTone = isEmpty
      ? 'bg-stone-50/90 ring-stone-200/70'
      : 'bg-crm-surface ring-crm-taupe/20';

    return (
      <li className={`rounded-lg ring-1 ${rowTone}`}>
        <button
          type="button"
          disabled={isEmpty}
          onClick={() => setExpanded((open) => !open)}
          className={`flex w-full flex-wrap items-center gap-2 px-2.5 py-2 text-left ${
            isEmpty ? '' : 'cursor-pointer transition hover:bg-crm-taupe-50/60'
          }`}
        >
          <FileLabelPill label="Files" empty={isEmpty} compact />
          {isEmpty ? (
            <span className="min-w-0 flex-1 text-xs text-stone-400">—</span>
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-crm-heading">
                {summary}
              </span>
              <span className="shrink-0 text-[11px] text-crm-slate">
                {expanded ? 'Hide' : 'Show'}
              </span>
            </>
          )}
        </button>
        {expanded && !isEmpty && (
          <>
            <ul className="space-y-1.5 border-t border-crm-taupe/15 px-2.5 py-2">
              {files.map((file) => fileRow(file, true))}
            </ul>
            {bulkActions}
          </>
        )}
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-crm-surface/80 px-4 py-3 ring-1 ring-crm-taupe/20/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-crm-slate">
          Files
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="rounded-md border border-crm-taupe/25 bg-crm-white px-2.5 py-1 text-[11px] font-medium text-crm-heading transition hover:bg-crm-taupe-50"
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {isEmpty ? (
        <p className="mt-1 text-sm text-crm-slate">No previous files</p>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium text-crm-heading">{summary}</p>
          {multiSelect && expanded && (
            <p className="mt-1 text-[11px] text-crm-slate">
              Select files, then download or remove.
            </p>
          )}
          {expanded && (
            <ul className="mt-3 space-y-2 border-t border-crm-taupe/15 pt-3">
              {files.map((file) => fileRow(file, false))}
            </ul>
          )}
          {bulkActions}
        </>
      )}
    </li>
  );
}

function FileRow({
  label,
  file,
  onOpen,
  onDownload,
  onRemove,
  removing = false,
  locked = false,
  compact = false,
}: {
  label: string;
  file?: VolunteerFile;
  onOpen: (file: VolunteerFile) => void;
  onDownload: (file: VolunteerFile) => void;
  onRemove?: (file: VolunteerFile) => void;
  removing?: boolean;
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
              {onRemove && (
                <MiniRemoveButton
                  busy={removing}
                  onClick={() => onRemove(file)}
                />
              )}
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
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <DownloadButton onClick={() => onDownload(file)} />
            {onRemove && (
              <RemoveButton busy={removing} onClick={() => onRemove(file)} />
            )}
          </div>
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
  onRemove,
  removing = false,
  label = 'Other',
}: {
  file: VolunteerFile;
  onOpen: () => void;
  onDownload: () => void;
  onRemove?: () => void;
  removing?: boolean;
  label?: string;
}) {
  const isEmpty = !file.url;
  const rowTone = isEmpty
    ? 'bg-stone-50/90 ring-stone-200/70'
    : label === 'Old'
      ? 'bg-stone-50/90 ring-stone-200/70'
      : 'bg-crm-surface ring-crm-taupe/20';

  return (
    <li
      onClick={file.url ? onOpen : undefined}
      className={`flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2 ring-1 ${rowTone}${
        file.url ? ' cursor-pointer transition hover:ring-crm-taupe/45' : ''
      }`}
    >
      <FileLabelPill label={label} empty={isEmpty || label === 'Old'} />
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
            {onRemove && (
              <MiniRemoveButton busy={removing} onClick={onRemove} />
            )}
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

function MiniRemoveButton({
  onClick,
  busy = false,
}: {
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      title="Remove this file"
      disabled={busy}
      onClick={onClick}
      className="rounded-md border border-rose-200 bg-crm-white px-2 py-0.5 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
    >
      {busy ? 'Removing…' : 'Remove'}
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

function RemoveButton({
  onClick,
  busy = false,
}: {
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="shrink-0 rounded-lg border border-rose-200 bg-crm-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
    >
      {busy ? 'Removing…' : 'Remove'}
    </button>
  );
}
