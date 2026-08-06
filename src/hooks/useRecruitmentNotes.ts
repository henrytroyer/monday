import { useCallback, useEffect, useState } from 'react';
import { useCurrentUser } from '../context/useCurrentUser';
import {
  addRecruitmentNote,
  getRecruitmentNotes,
} from '../services/recruitmentStorage';
import type {
  RecruitmentNote,
  RecruitmentNoteAttachment,
} from '../types/recruitment';

export function useRecruitmentNotes(prospectId: string) {
  const { displayName } = useCurrentUser();
  const [notes, setNotes] = useState<RecruitmentNote[]>([]);
  const [sending, setSending] = useState(false);

  const reload = useCallback(() => {
    setNotes(getRecruitmentNotes(prospectId));
  }, [prospectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addNote = useCallback(
    async (body: string, attachment?: RecruitmentNoteAttachment) => {
      const trimmed = body.trim();
      if (!trimmed && !attachment) return;
      setSending(true);
      try {
        const note = await addRecruitmentNote(
          prospectId,
          trimmed,
          displayName,
          attachment,
        );
        setNotes((prev) => [...prev, note]);
      } finally {
        setSending(false);
      }
    },
    [prospectId, displayName],
  );

  return { notes, sending, addNote, reload };
}
