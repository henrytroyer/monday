import { useCallback, useEffect, useState } from 'react';
import {
  addServiceRecordNote,
  getServiceRecordNotes,
} from '../services/serviceRecordNoteStorage';
import type { ServiceRecordNote } from '../types/internalNote';
import type { RecruitmentNoteAttachment } from '../types/recruitment';

export function useServiceRecordNotes(serviceRecordId: string) {
  const [notes, setNotes] = useState<ServiceRecordNote[]>([]);
  const [sending, setSending] = useState(false);

  const reload = useCallback(() => {
    setNotes(getServiceRecordNotes(serviceRecordId));
  }, [serviceRecordId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addNote = useCallback(
    async (body: string, attachment?: RecruitmentNoteAttachment) => {
      const trimmed = body.trim();
      if (!trimmed && !attachment) return;
      setSending(true);
      try {
        const note = addServiceRecordNote(
          serviceRecordId,
          trimmed,
          'You',
          attachment,
        );
        setNotes((prev) => [...prev, note]);
      } finally {
        setSending(false);
      }
    },
    [serviceRecordId],
  );

  return { notes, sending, addNote, reload };
}
