import { useMemo, useState } from 'react';
import {
  EMAIL_MERGE_FIELDS,
  formatMergeFieldPreview,
  groupMergeFields,
  mergeFieldGroupLabel,
  mergeFieldToken,
  type EmailMergeFieldDefinition,
} from '../../utils/emailMergeFields';

interface MergeFieldSidebarProps {
  mergeContext?: Record<string, string>;
  onInsert: (value: string) => void;
  disabled?: boolean;
  insertMode?: 'token' | 'value';
  collapsed?: boolean;
}

export default function MergeFieldSidebar({
  mergeContext,
  onInsert,
  disabled = false,
  insertMode = 'value',
  collapsed = false,
}: MergeFieldSidebarProps) {
  const [query, setQuery] = useState('');
  const grouped = groupMergeFields(EMAIL_MERGE_FIELDS);
  const hasLiveValues = Boolean(
    mergeContext && Object.values(mergeContext).some((value) => value?.trim()),
  );

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return grouped;

    const result: Record<string, EmailMergeFieldDefinition[]> = {};
    for (const [group, fields] of Object.entries(grouped)) {
      const matches = fields.filter(
        (field) =>
          field.key.toLowerCase().includes(needle) ||
          field.label.toLowerCase().includes(needle) ||
          field.description.toLowerCase().includes(needle),
      );
      if (matches.length) result[group] = matches;
    }
    return result;
  }, [grouped, query]);

  const insertField = (field: EmailMergeFieldDefinition) => {
    if (insertMode === 'value') {
      onInsert(formatMergeFieldPreview(field.key, mergeContext));
      return;
    }
    onInsert(mergeFieldToken(field.key));
  };

  if (collapsed) {
    return (
      <div className="email-merge-compact">
        <p className="email-merge-compact__title">Merge fields</p>
        <div className="email-merge-compact__chips">
          {EMAIL_MERGE_FIELDS.slice(0, 10).map((field) => (
            <button
              key={field.key}
              type="button"
              disabled={disabled}
              onClick={() => insertField(field)}
              className="email-merge-chip"
              title={field.label}
            >
              {mergeFieldToken(field.key)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="email-merge-sidebar">
      <div className="email-merge-sidebar__header">
        <h4 className="email-merge-sidebar__title">Record data</h4>
        <p className="email-merge-sidebar__subtitle">
          Click to insert at cursor.
          {hasLiveValues
            ? ' Live values shown in green.'
            : ' Open from an application or contact for live values.'}
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields…"
          className="email-merge-sidebar__search"
        />
      </div>

      <div className="email-merge-sidebar__list">
        {Object.entries(filteredGroups).map(([group, fields]) => (
          <section key={group} className="email-merge-sidebar__group">
            <h5 className="email-merge-sidebar__group-title">
              {mergeFieldGroupLabel(group as EmailMergeFieldDefinition['group'])}
            </h5>
            <ul className="space-y-1.5">
              {fields.map((field) => {
                const token = mergeFieldToken(field.key);
                const preview = formatMergeFieldPreview(field.key, mergeContext);
                const hasValue = preview !== token;

                return (
                  <li key={field.key}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => insertField(field)}
                      className="email-merge-field-btn"
                    >
                      <code className="email-merge-field-btn__token">{token}</code>
                      <span className="email-merge-field-btn__meta">
                        <span className="email-merge-field-btn__label">{field.label}</span>
                        <span
                          className={`email-merge-field-btn__value ${
                            hasValue ? 'email-merge-field-btn__value--live' : ''
                          }`}
                        >
                          {hasValue ? preview : field.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}
