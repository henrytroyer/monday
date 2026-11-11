import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GENERAL_INFO_SECTION_LABEL } from '../lib/nav';
import {
  ORG_CHART,
  ORG_TONE_CLASS,
  chartEntries,
  type OrgEntry,
} from '../lib/orgChart';

const LINE = 'bg-navy/55';

const SelectContext = createContext<{
  selectedId: string | null;
  select: (id: string) => void;
}>({ selectedId: null, select: () => undefined });

export function OrgChartScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? (chartEntries().find((entry) => entry.id === selectedId) ?? null)
    : null;

  return (
    <SelectContext.Provider value={{ selectedId, select: setSelectedId }}>
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <div className="mx-auto w-full max-w-[90rem] px-4 pb-6 sm:px-6">
          <header>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-navy">
              {GENERAL_INFO_SECTION_LABEL.orgChart}
            </h1>
            <p className="mt-1 font-display text-xl font-extrabold text-navy">{ORG_CHART.title}</p>
          </header>
          <Detail entry={selected} />
          <FitChart>
            <Overview />
          </FitChart>
          <p className="mt-4 text-center text-sm font-bold text-navy">
            <a
              href={ORG_CHART.siteHref}
              className="underline decoration-navy/30 underline-offset-4 hover:decoration-navy"
            >
              {ORG_CHART.site}
            </a>
          </p>
        </div>
      </div>
    </SelectContext.Provider>
  );
}

function FitChart({ children }: { children: ReactNode }) {
  const viewRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [manual, setManual] = useState<number | null>(null);

  useLayoutEffect(() => {
    const view = viewRef.current;
    const chart = chartRef.current;
    if (!view || !chart) return;
    const measure = () => {
      const room = Math.max(240, window.innerHeight - view.getBoundingClientRect().top - 28);
      const nextView = { w: view.clientWidth, h: room };
      const nextNatural = { w: chart.offsetWidth, h: chart.offsetHeight };
      setViewport((prev) =>
        prev.w === nextView.w && prev.h === nextView.h ? prev : nextView,
      );
      setNatural((prev) =>
        prev.w === nextNatural.w && prev.h === nextNatural.h ? prev : nextNatural,
      );
    };
    let active = true;
    const safeMeasure = () => {
      if (active) measure();
    };
    window.scrollTo(0, 0);
    safeMeasure();
    const observer = new ResizeObserver(safeMeasure);
    observer.observe(view);
    observer.observe(chart);
    window.addEventListener('resize', safeMeasure);
    document.fonts?.ready.then(safeMeasure);
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener('resize', safeMeasure);
    };
  }, []);

  const fitWidth = natural.w > 0 && viewport.w > 0 ? (viewport.w - 2) / natural.w : 1;
  const fitHeight = natural.h > 0 && viewport.h > 0 ? viewport.h / natural.h : 1;
  const fitted = Math.min(1, fitWidth, fitHeight);
  // Narrow screens stay large enough to read and scroll. Wider screens show the whole chart.
  const preferred = viewport.w > 0 && viewport.w < 800 ? Math.max(fitted, 0.68) : fitted;
  const scale = manual ?? preferred;

  function zoomBy(factor: number) {
    setManual((current) => {
      const base = current ?? scale;
      return Math.min(1.8, Math.max(0.4, Math.round(base * factor * 100) / 100));
    });
  }

  const ready = natural.w > 0;

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2">
        <ZoomButton
          onClick={() => setManual(fitted)}
          label="Fit the whole chart"
          pressed={Math.abs(scale - fitted) < 0.015}
        >
          Fit
        </ZoomButton>
        <ZoomButton onClick={() => zoomBy(1 / 1.2)} label="Zoom out">
          −
        </ZoomButton>
        <ZoomButton onClick={() => zoomBy(1.2)} label="Zoom in">
          +
        </ZoomButton>
        <span className="text-xs font-semibold text-navy/50">{Math.round(scale * 100)}%</span>
      </div>
      <div ref={viewRef} className="overflow-auto">
        <div
          className="mx-auto overflow-hidden"
          style={{
            width: ready ? natural.w * scale : undefined,
            height: ready ? natural.h * scale : undefined,
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <div ref={chartRef} className="w-max">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoomButton({
  children,
  label,
  onClick,
  pressed = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`h-8 min-w-8 rounded-full px-3 text-sm font-bold ring-1 ${
        pressed
          ? 'bg-navy text-white ring-navy'
          : 'bg-white text-navy ring-sand hover:bg-crm-indigo-50'
      }`}
    >
      {children}
    </button>
  );
}

function Detail({ entry }: { entry: OrgEntry | null }) {
  if (!entry) {
    return (
      <p className="mt-3 min-h-8 text-sm text-navy/55">
        Select a role to read who holds it and what they are accountable for.
      </p>
    );
  }
  const title = [entry.headings.join(' · '), entry.open, entry.name, entry.note]
    .filter((part) => part && part.length > 0)
    .join(' · ');
  return (
    <p className="mt-3 min-h-8 text-sm leading-6 text-navy">
      <span className="font-bold">{title}</span>
      {entry.duties ? <span>{` — ${entry.duties.join(' · ')}`}</span> : null}
    </p>
  );
}

function Overview() {
  const teams: readonly OrgEntry[] = [
    ORG_CHART.publicRelations,
    ...ORG_CHART.fieldProjects,
    ORG_CHART.lesvos,
    ORG_CHART.lesvosCoordinators,
    ORG_CHART.germany,
  ];
  const admin: readonly OrgEntry[] = [...ORG_CHART.executiveTeam, ...ORG_CHART.statesideBench];

  return (
    <div className="flex w-max flex-col items-center px-1 py-1">
      <div className="grid grid-cols-[13rem_auto_13rem] items-center">
        <div />
        <div className="flex flex-col items-center">
          <Node entry={ORG_CHART.visionary} fixed />
          <Stem />
          <div className="flex items-center">
            <Node entry={ORG_CHART.implementer} fixed />
            <span className={`h-px w-3 ${LINE}`} aria-hidden />
          </div>
        </div>
        <div className="flex items-stretch pl-1">
          <div className="my-1 mr-1.5 w-2 shrink-0 border-y border-l border-navy/55" />
          <div className="flex w-[11.5rem] flex-col gap-1">
            <div className={`rounded-md px-1.5 py-1 ring-2 ring-black/10 ${ORG_TONE_CLASS.partners}`}>
              <p className="text-center text-[10px] font-extrabold leading-tight text-navy">
                {ORG_CHART.partnersTitle}
              </p>
              <ul className="mt-1 space-y-0.5 text-[10px] leading-4 text-navy">
                {ORG_CHART.partners.map((partner) => (
                  <li key={partner}>{partner}</li>
                ))}
              </ul>
            </div>
            {ORG_CHART.partnerPeople.map((person) => (
              <Node key={person.id} entry={person} />
            ))}
          </div>
        </div>
      </div>

      <Stem />
      <SiblingRow entries={ORG_CHART.board} render={(entry) => <Node entry={entry} fixed />} />
      <Stem />
      <SiblingRow entries={admin} render={(entry) => <Node entry={entry} fixed />} />
      <Stem />
      <SiblingRow entries={teams} render={(entry) => <TeamColumn entry={entry} />} />
    </div>
  );
}

function SiblingRow({
  entries,
  render,
}: {
  entries: readonly OrgEntry[];
  render: (entry: OrgEntry) => ReactNode;
}) {
  return (
    <div className="flex items-start justify-center">
      {entries.map((entry, index) => (
        <div key={entry.id} className="relative shrink-0 px-0.5 pt-2">
          <Connector
            first={index === 0}
            last={index === entries.length - 1}
            only={entries.length === 1}
          />
          {render(entry)}
        </div>
      ))}
    </div>
  );
}

function TeamColumn({ entry }: { entry: OrgEntry }) {
  return (
    <div className="flex w-max flex-col items-center">
      <Node entry={entry} />
      <Beside entry={entry} />
    </div>
  );
}

function Beside({ entry }: { entry: OrgEntry }) {
  const reports = entry.children ?? [];
  const beside = entry.beside ?? [];
  if (reports.length === 0 && beside.length === 0) return null;
  return (
    <div className="mt-0.5 flex items-start gap-1">
      {reports.length > 0 ? <TreeList entries={reports} /> : null}
      {beside.length > 0 ? <TreeList entries={beside} /> : null}
    </div>
  );
}

function TreeList({ entries }: { entries: readonly OrgEntry[] }) {
  return (
    <ul className="border-l border-navy/35 pl-1">
      {entries.map((entry) => (
        <li key={entry.id} className="mt-0.5">
          {entry.columns === 2 ? (
            <PeopleGrid entry={entry} />
          ) : (
            <>
              <Node entry={entry} />
              <Beside entry={entry} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function PeopleGrid({ entry }: { entry: OrgEntry }) {
  return (
    <div className="w-[11.5rem] overflow-hidden rounded-md ring-2 ring-black/10">
      <div className={`px-1 py-0.5 text-center text-[10px] font-extrabold leading-tight ${ORG_TONE_CLASS[entry.tone]}`}>
        {entry.headings[0]}
      </div>
      <div className="grid grid-cols-2">
        {entry.children?.map((child) => (
          <NameCell key={child.id} entry={child} />
        ))}
      </div>
    </div>
  );
}

function NameCell({ entry }: { entry: OrgEntry }) {
  const { selectedId, select } = useContext(SelectContext);
  const selected = selectedId === entry.id;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => select(entry.id)}
      className={`border border-white/70 px-0.5 py-0.5 text-center text-[10px] font-semibold leading-tight ${ORG_TONE_CLASS[entry.tone]} ${
        selected ? 'ring-2 ring-crm-terracotta ring-inset' : ''
      }`}
    >
      {entry.name}
    </button>
  );
}

function Node({ entry, fixed = false }: { entry: OrgEntry; fixed?: boolean }) {
  const { selectedId, select } = useContext(SelectContext);
  const selected = selectedId === entry.id;
  const openClass = entry.tone === 'board' ? 'text-[#ffb4b4]' : 'text-[#c23b3b]';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => select(entry.id)}
      className={`block cursor-pointer rounded-md px-1 py-0.5 text-center font-sans ring-2 ${
        fixed ? 'w-[7.5rem]' : 'w-[9.25rem]'
      } ${ORG_TONE_CLASS[entry.tone]} ${
        selected ? 'ring-crm-terracotta' : 'ring-black/10'
      }`}
    >
      {entry.headings.map((line) => (
        <span key={line} className="block text-[10px] font-bold leading-tight">
          {line}
        </span>
      ))}
      {entry.open ? (
        <span className={`block text-[10px] font-extrabold leading-tight ${openClass}`}>
          {entry.open}
        </span>
      ) : null}
      {entry.name ? (
        <span className="block font-display text-[11px] font-extrabold leading-tight">{entry.name}</span>
      ) : null}
      {entry.note ? <span className="block text-[10px] leading-tight">{entry.note}</span> : null}
    </button>
  );
}

function Stem() {
  return <div className={`mx-auto h-2 w-px ${LINE}`} aria-hidden />;
}

function Connector({ first, last, only }: { first: boolean; last: boolean; only: boolean }) {
  if (only) {
    return <span className={`absolute top-0 left-1/2 h-2 w-px -translate-x-1/2 ${LINE}`} aria-hidden />;
  }
  const bar = first ? 'left-1/2 right-0' : last ? 'right-1/2 left-0' : 'inset-x-0';
  return (
    <>
      <span className={`absolute top-0 h-px ${bar} ${LINE}`} aria-hidden />
      <span className={`absolute top-0 left-1/2 h-2 w-px -translate-x-1/2 ${LINE}`} aria-hidden />
    </>
  );
}
