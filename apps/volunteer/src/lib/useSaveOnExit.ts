import { useEffect, useRef } from 'react';

/** Persist the latest draft when this screen unmounts, including the back arrow and Home. */
export function useSaveOnExit<T>(draft: T, onSave: (draft: T) => void) {
  const draftRef = useRef(draft);
  const saveRef = useRef(onSave);
  draftRef.current = draft;
  saveRef.current = onSave;

  useEffect(() => {
    return () => {
      saveRef.current(draftRef.current);
    };
  }, []);
}
