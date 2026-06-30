import { useEffect, useState } from 'react';
import RecruitmentDetailPanel from '../components/recruitment/RecruitmentDetailPanel';
import RecruitmentList from '../components/recruitment/RecruitmentList';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import { useRecruitmentProspects } from '../hooks/useRecruitmentProspects';
import type { RecruitmentProspect } from '../types/recruitment';

export default function RecruitmentPage({
  focusProspectId,
  onClearFocus,
}: {
  focusProspectId?: string | null;
  onClearFocus?: () => void;
}) {
  const { prospects, addProspect, updateProspect, removeProspect, reload } =
    useRecruitmentProspects();
  const [selected, setSelected] = useState<RecruitmentProspect | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const { requestClose: requestCloseDetail } = useNavLayer(
    selected !== null,
    () => setSelected(null),
    `recruitment-${selected?.id ?? 'none'}`,
  );

  const { setDetailMode } = useLayout();
  const showingDetail = selected !== null;

  useEffect(() => {
    setDetailMode(showingDetail);
    return () => setDetailMode(false);
  }, [showingDetail, setDetailMode]);

  useEffect(() => {
    if (!focusProspectId) return;
    reload();
  }, [focusProspectId, reload]);

  useEffect(() => {
    if (!focusProspectId) return;
    const match = prospects.find((p) => p.id === focusProspectId);
    if (match) {
      setSelected(match);
      onClearFocus?.();
    }
  }, [focusProspectId, prospects, onClearFocus]);

  useEffect(() => {
    if (!selected) return;
    const fresh = prospects.find((p) => p.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [prospects, selected?.id]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setAddError('Enter a name for this prospect.');
      return;
    }
    setAddError(null);
    const created = addProspect({
      name: trimmedName,
      email: email.trim(),
      phone: phone.trim(),
    });
    setName('');
    setEmail('');
    setPhone('');
    setSelected(created);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-4xl font-semibold text-crm-heading">Recruitment</h1>
        {!showingDetail && (
          <p className="mt-2 text-crm-slate">
            Prospects and early-stage volunteer outreach.
          </p>
        )}
      </div>

      {showingDetail && selected && (
        <RecruitmentDetailPanel
          prospect={selected}
          onBack={requestCloseDetail}
          onUpdate={updateProspect}
          onDelete={removeProspect}
        />
      )}

      {!showingDetail && (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          <form
            onSubmit={handleAdd}
            className="rounded-3xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-crm-heading">Add prospect</h2>
            <p className="mt-1 text-sm text-crm-slate">
              Basic contact info — a contact tagged Recruitment will also be
              created. You can add notes and assign someone after saving.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="text-sm font-medium text-crm-slate">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-4 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-crm-slate">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-4 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-crm-slate">Phone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-4 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                />
              </label>
            </div>
            {addError && (
              <p className="mt-3 text-sm text-amber-800">{addError}</p>
            )}
            <button
              type="submit"
              className="mt-4 rounded-xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
            >
              Add prospect
            </button>
          </form>

          <RecruitmentList prospects={prospects} onSelect={setSelected} />
        </div>
      )}
    </div>
  );
}
