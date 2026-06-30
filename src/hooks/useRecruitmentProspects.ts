import { useCallback, useEffect, useState } from 'react';
import {
  createRecruitmentProspect,
  deleteRecruitmentProspect,
  getRecruitmentProspects,
  updateRecruitmentProspect,
} from '../services/recruitmentStorage';
import type {
  RecruitmentProspect,
  RecruitmentProspectInput,
} from '../types/recruitment';

export function useRecruitmentProspects() {
  const [prospects, setProspects] = useState<RecruitmentProspect[]>([]);

  const reload = useCallback(() => {
    setProspects(getRecruitmentProspects());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addProspect = useCallback(
    (input: RecruitmentProspectInput) => {
      const created = createRecruitmentProspect(input);
      setProspects((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const updateProspect = useCallback(
    (
      id: string,
      patch: Parameters<typeof updateRecruitmentProspect>[1],
    ) => {
      const updated = updateRecruitmentProspect(id, patch);
      if (updated) {
        setProspects((prev) =>
          prev.map((p) => (p.id === id ? updated : p)),
        );
      }
      return updated;
    },
    [],
  );

  const removeProspect = useCallback((id: string) => {
    deleteRecruitmentProspect(id);
    setProspects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    prospects,
    addProspect,
    updateProspect,
    removeProspect,
    reload,
  };
}
