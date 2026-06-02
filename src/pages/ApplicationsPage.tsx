import { useMemo, useState } from 'react';
import ApplicationDetailPanel from '../components/applications/ApplicationDetailPanel';
import ApplicationFilters from '../components/applications/ApplicationFilters';
import PipelineSection from '../components/applications/PipelineSection';
import { countVolunteers } from '../data/mockApplications';
import { useApplicationsPipeline } from '../hooks/useApplicationsPipeline';
import type { ApplicationFilterState, Volunteer } from '../types/volunteer';
import {
  countMatchingVolunteers,
  emptyFilters,
  filterPipeline,
} from '../utils/filterApplications';

export default function ApplicationsPage() {
  const [filters, setFilters] = useState<ApplicationFilterState>(emptyFilters);
  const [selectedApplication, setSelectedApplication] =
    useState<Volunteer | null>(null);

  const { pipeline, loading, error, isMock, boardId, refetch } =
    useApplicationsPipeline();

  const totalCount = useMemo(() => countVolunteers(pipeline), [pipeline]);

  const matchingCount = useMemo(
    () => countMatchingVolunteers(pipeline, filters),
    [pipeline, filters],
  );

  const filteredPipeline = useMemo(
    () => filterPipeline(pipeline, filters),
    [pipeline, filters],
  );

  const showingDetail = selectedApplication !== null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Applications</h1>
          {!showingDetail && (
            <p className="mt-2 text-slate-500">
              Track volunteers through onboarding, references, placement, and
              deployment.
            </p>
          )}
          {!showingDetail && !isMock && boardId && (
            <p className="mt-2 text-xs text-slate-400">
              Live data from monday.com board {boardId}
            </p>
          )}
          {!showingDetail && isMock && (
            <p className="mt-2 text-xs text-amber-700">
              Mock data mode (VITE_USE_MOCK_DATA=true)
            </p>
          )}
        </div>
        {!isMock && !showingDetail && (
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        )}
      </div>

      {loading && !showingDetail && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading applications from monday.com…
        </div>
      )}

      {error && !loading && !showingDetail && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">Could not load applications</p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-3 text-sm text-red-600">
            Open this app as a Board View on your Applications board, or set{' '}
            <code className="rounded bg-red-100 px-1">VITE_APPLICATIONS_BOARD_ID</code>{' '}
            in .env for local testing.
          </p>
        </div>
      )}

      {!loading && !error && showingDetail && selectedApplication && (
        <ApplicationDetailPanel
          volunteer={selectedApplication}
          boardId={boardId}
          onBack={() => setSelectedApplication(null)}
        />
      )}

      {!loading && !error && !showingDetail && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ApplicationFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyFilters)}
            matchingCount={matchingCount}
            totalCount={totalCount}
          />

          {filteredPipeline.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-lg font-semibold text-slate-900">
                No volunteers match these filters
              </p>
              <p className="mt-2 text-slate-500">
                Try clearing filters or selecting different locations or timelines.
              </p>
              <button
                type="button"
                onClick={() => setFilters(emptyFilters)}
                className="mt-6 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-8 pb-4">
              {filteredPipeline.map((section) => (
                <PipelineSection
                  key={section.stage}
                  section={section}
                  onSelectVolunteer={setSelectedApplication}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
