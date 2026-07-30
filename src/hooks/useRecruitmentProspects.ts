import { useCallback, useEffect, useState } from 'react';
import {
  createRecruitmentProspect,
  deleteRecruitmentProspect,
  getRecruitmentProspects,
  updateRecruitmentProspect,
} from '../services/recruitmentStorage';
import { listProspectsFromPortal } from '../services/portalRecruitmentSync';
import { useMockData } from '../config/boards';
import type {
  RecruitmentProspect,
  RecruitmentProspectInput,
} from '../types/recruitment';

function mergeProspects(
  local: RecruitmentProspect[],
  remote: RecruitmentProspect[],
): RecruitmentProspect[] {
  const byId = new Map<string, RecruitmentProspect>();
  for (const p of remote) byId.set(p.id, p);
  for (const p of local) {
    const existing = byId.get(p.id);
    if (!existing) {
      byId.set(p.id, p);
      continue;
    }
    // Newer updatedAt wins
    const localAt = new Date(p.updatedAt).getTime();
    const remoteAt = new Date(existing.updatedAt).getTime();
    byId.set(p.id, localAt >= remoteAt ? p : existing);
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function useRecruitmentProspects() {
  const [prospects, setProspects] = useState<RecruitmentProspect[]>([]);
  const isMock = useMockData();

  const reload = useCallback(() => {
    setProspects(getRecruitmentProspects());
    if (isMock) return;
    void listProspectsFromPortal()
      .then((remote) => {
        if (remote.length === 0) return;
        setProspects((local) => mergeProspects(local, remote));
      })
      .catch(() => undefined);
  }, [isMock]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addProspect = useCallback(
    async (input: RecruitmentProspectInput) => {
      const created = await createRecruitmentProspect(input);
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
