import { useEffect, useState, type ReactNode } from 'react';
import { TEAM_MEMBERS } from '../../data/mockTeamMembers';
import type { RecruitmentProspect } from '../../types/recruitment';
import RecruitmentNotesSection from './RecruitmentNotesSection';

interface RecruitmentDetailPanelProps {
  prospect: RecruitmentProspect;
  onBack: () => void;
  onUpdate: (
    id: string,
    patch: Partial<
      Pick<
        RecruitmentProspect,
        | 'name'
        | 'email'
        | 'phone'
        | 'assignedUserId'
        | 'assignedUserName'
      >
    >,
  ) => void;
  onDelete: (id: string) => void;
}

export default function RecruitmentDetailPanel({
  prospect,
  onBack,
  onUpdate,
  onDelete,
}: RecruitmentDetailPanelProps) {
  const [name, setName] = useState(prospect.name);
  const [email, setEmail] = useState(prospect.email);
  const [phone, setPhone] = useState(prospect.phone);
  const [assignedUserId, setAssignedUserId] = useState(
    prospect.assignedUserId ?? '',
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(prospect.name);
    setEmail(prospect.email);
    setPhone(prospect.phone);
    setAssignedUserId(prospect.assignedUserId ?? '');
    setSaved(false);
  }, [prospect]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack]);

  const handleSave = () => {
    const member = TEAM_MEMBERS.find((m) => m.id === assignedUserId);
    onUpdate(prospect.id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      assignedUserId: assignedUserId || null,
      assignedUserName: member?.name ?? null,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface p-2 shadow-sm">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface">
        <div className="shrink-0 border-b border-crm-taupe/20 bg-crm-taupe-50 px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-crm-slate transition hover:text-crm-heading"
          >
            ← Back to recruitment
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-crm-heading">
                {prospect.name || 'New prospect'}
              </h2>
              <p className="mt-1 text-sm text-crm-slate">
                Added {new Date(prospect.createdAt).toLocaleDateString()}
                {prospect.sourceContactId && (
                  <> · Linked to contact</>
                )}
              </p>
            </div>

            <section className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
              <h3 className="text-lg font-semibold text-crm-heading">Contact info</h3>
              <div className="mt-4 space-y-4">
                <Field label="Name">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
              <Field label="Assigned to">
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {TEAM_MEMBERS.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
            </section>

            {prospect.priorServiceTerms.length > 0 && (
              <section className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
                <h3 className="text-lg font-semibold text-crm-heading">
                  Previous service records
                </h3>
                <p className="mt-1 text-sm text-crm-slate">
                  Carried over from Contacts when this prospect was created.
                </p>
                <ul className="mt-4 space-y-2">
                  {prospect.priorServiceTerms.map((term, index) => (
                    <li
                      key={`${term.timelineLabel}-${index}`}
                      className="rounded-xl bg-crm-surface px-4 py-3 ring-1 ring-crm-taupe/20"
                    >
                      <p className="font-medium text-crm-heading">
                        {term.timelineLabel}
                      </p>
                      <p className="mt-1 text-sm text-crm-slate">
                        {[term.pipelineStage, term.status]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <RecruitmentNotesSection
              prospectId={prospect.id}
              prospectName={prospect.name}
              sourceContactId={prospect.sourceContactId}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
              >
                Save changes
              </button>
              {saved && (
                <span className="text-sm text-emerald-700">Saved</span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove ${prospect.name} from recruitment? Their service record and internal notes will stay on the contact.`,
                    )
                  ) {
                    onDelete(prospect.id);
                    onBack();
                  }
                }}
                className="ml-auto rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Remove prospect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'mt-2 w-full rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-2.5 text-sm text-crm-text outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20';

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-crm-slate">{label}</span>
      {children}
    </label>
  );
}
