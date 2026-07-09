import { useCallback, useState } from 'react';
import { useMockData } from '../config/boards';
import { MOCK_PASTOR_REFERENCE_FORM_FIELDS, MOCK_PASTOR_REFERENCE_FORM_FIELDS_RACHEL } from '../data/mockApplicationForm';
import { mockFiles } from '../data/mockVolunteerDetail';
import { buildPastorReferenceBoardFormFields } from '../services/applicationFormFields';
import { fetchContactItem } from '../services/crmApi';
import { getAllFilesFromColumnValues } from '../services/mondayFileColumns';
import type { ApplicationFormField, VolunteerFile } from '../types/volunteer';
import { findFormPdf } from '../components/applications/FormFieldsPanel';

export function usePastorReferenceDrillDown(linkedItemId: string | undefined) {
  const isMock = useMockData();
  const [fields, setFields] = useState<ApplicationFormField[]>([]);
  const [pdfFile, setPdfFile] = useState<VolunteerFile | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!linkedItemId) {
      setFields([]);
      setPdfFile(undefined);
      setError(null);
      setLoaded(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isMock) {
        const files = mockFiles('mock-pastor-ref');
        const mockFields =
          linkedItemId === 'mock-pastor-ref-2'
            ? MOCK_PASTOR_REFERENCE_FORM_FIELDS_RACHEL
            : MOCK_PASTOR_REFERENCE_FORM_FIELDS;
        setFields(mockFields);
        setPdfFile(
          findFormPdf(files, /pastor.*reference/i) ??
            files.find((file) => /pastor/i.test(file.name)),
        );
        setLoaded(true);
        return;
      }

      const item = await fetchContactItem(linkedItemId);
      const formFields = buildPastorReferenceBoardFormFields(item.column_values);
      const files = getAllFilesFromColumnValues(item.column_values);
      setFields(formFields);
      setPdfFile(
        findFormPdf(files, /pastor.*reference/i) ??
          files.find((file) => /\.pdf$/i.test(file.name)),
      );
      setLoaded(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load pastor reference',
      );
      setFields([]);
      setPdfFile(undefined);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [isMock, linkedItemId]);

  const reset = useCallback(() => {
    setFields([]);
    setPdfFile(undefined);
    setError(null);
    setLoaded(false);
    setLoading(false);
  }, []);

  return {
    fields,
    pdfFile,
    loading,
    error,
    loaded,
    load,
    reset,
  };
}
