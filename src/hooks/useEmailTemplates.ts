import { useCallback, useEffect, useState } from 'react';
import type { EmailTemplate } from '../types/emailTemplate';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  fetchEmailTemplates,
  updateEmailTemplate,
} from '../services/emailTemplatesApi';
import type { EmailTemplateInput } from '../types/emailTemplate';

interface UseEmailTemplatesResult {
  templates: EmailTemplate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTemplate: (input: EmailTemplateInput) => Promise<EmailTemplate>;
  saveTemplate: (
    template: EmailTemplate,
    input: EmailTemplateInput,
  ) => Promise<EmailTemplate>;
  removeTemplate: (templateId: string) => Promise<void>;
}

export function useEmailTemplates(): UseEmailTemplatesResult {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchEmailTemplates();
      setTemplates(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load templates.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createTemplate = useCallback(async (input: EmailTemplateInput) => {
    const created = await createEmailTemplate(input);
    setTemplates((current) =>
      [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
    return created;
  }, []);

  const saveTemplate = useCallback(
    async (template: EmailTemplate, input: EmailTemplateInput) => {
      const updated = await updateEmailTemplate(template, input);
      setTemplates((current) =>
        current
          .map((entry) => (entry.id === updated.id ? updated : entry))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      return updated;
    },
    [],
  );

  const removeTemplate = useCallback(async (templateId: string) => {
    await deleteEmailTemplate(templateId);
    setTemplates((current) => current.filter((entry) => entry.id !== templateId));
  }, []);

  return {
    templates,
    loading,
    error,
    refetch,
    createTemplate,
    saveTemplate,
    removeTemplate,
  };
}

export function findEmailTemplate(
  templates: EmailTemplate[],
  id: string,
): EmailTemplate | undefined {
  return templates.find((t) => t.id === id || t.templateId === id);
}
