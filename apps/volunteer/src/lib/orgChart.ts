/**
 * Wording and people from the i58 accountability chart.
 * Keep names, roles, duties, and open-role labels as they appear there.
 */

export type OrgTone =
  | 'board'
  | 'admin'
  | 'coordinator'
  | 'worker'
  | 'location'
  | 'project'
  | 'partner'
  | 'partners';

export type OrgEntry = {
  id: string;
  tone: OrgTone;
  headings: readonly string[];
  name?: string;
  open?: string;
  note?: string;
  duties?: readonly string[];
  children?: readonly OrgEntry[];
  beside?: readonly OrgEntry[];
  /** Name-only children drawn as one table. */
  columns?: 2;
};

export const ORG_TONE_CLASS: Record<OrgTone, string> = {
  board: 'bg-navy text-white',
  admin: 'bg-[#9ec4ee] text-navy',
  coordinator: 'bg-[#eadcc0] text-navy',
  worker: 'bg-[#d3e7f8] text-navy',
  location: 'bg-[#8fd0c9] text-navy',
  project: 'bg-[#e0dbe8] text-navy',
  partner: 'bg-[#c6f0e4] text-navy',
  partners: 'bg-[#e6e4ef] text-navy',
};

export const ORG_LEGEND = [
  { tone: 'board' as const, label: 'Board Members' },
  { tone: 'location' as const, label: 'Locations / Teams' },
  { tone: 'admin' as const, label: 'Executive Admin Team' },
  { tone: 'project' as const, label: 'Field Projects' },
  { tone: 'coordinator' as const, label: 'Coordinators / Project Leaders' },
  { tone: 'partner' as const, label: 'External / Internal Partners' },
  { tone: 'worker' as const, label: 'Long Term Workers' },
  { tone: 'open' as const, label: 'Open Roles' },
];

const CHART_TITLE = 'Accountability Chart';
const CHART_SITE = 'www.i58global.org';
const CHART_SITE_HREF = 'https://www.i58global.org/';

function person(id: string, name: string, tone: OrgTone = 'worker', note?: string): OrgEntry {
  return { id, tone, headings: [], name, ...(note ? { note } : {}) };
}

function role(
  id: string,
  tone: OrgTone,
  title: string,
  name?: string,
  extra?: Partial<Pick<OrgEntry, 'open' | 'note' | 'duties' | 'children' | 'beside' | 'columns'>>,
): OrgEntry {
  return {
    id,
    tone,
    headings: [title],
    ...(name ? { name } : {}),
    ...extra,
  };
}

function openSlot(id: string, label: 'Open Role' | 'Open Roles'): OrgEntry {
  return { id, tone: 'worker', headings: [], open: label };
}

export const ORG_CHART = {
  title: CHART_TITLE,
  site: CHART_SITE,
  siteHref: CHART_SITE_HREF,
  vision: 'That the Whole World Would See The Glory of God',
  missionLead: 'To recruit, send, and organize relief workers:',
  missionRest:
    'Empowering them to provide aid and share hope to the refugees in Greece and beyond.',
  partnersTitle: 'Ministry Partners',
  partners: [
    'Hellenic Ministries (Greece)',
    'Eurorelief (Greece)',
    'CRR (Netherlands)',
    'Interserve (Germany)',
    'Global Nomads (Germany)',
    'Destinations International (USA)',
  ],
  partnerPeople: [
    role('rodney-nolt', 'partner', 'Rodney & Dawn Nolt', undefined, {
      note: 'Executive Director for Eurorelief',
    }),
    role('savvas-liaison', 'partner', 'Savvas & Joy Emmanouilidis', undefined, {
      note: 'Oasis Project / Greek Liaison',
    }),
  ],
  visionary: role('visionary', 'board', 'Visionary', 'Emanuel Esh', {
    duties: [
      'Generate Possibilities',
      'World Awareness',
      "Hearing God's Heart",
      'Seeing Opportunities',
      'Provide Inspiration',
    ],
  }),
  implementer: role('implementer', 'board', 'Implementer (CEO)', 'Amos Kauffman', {
    duties: [
      'Lead Board Meetings',
      'Legal Representation',
      "Communications with NGO's",
      'Church Networking',
      'Leads in Problem Solving',
      "Processing Visionary's Ideas",
      'LMA (Lead, Manage & Hold Accountable)',
    ],
  }),
  board: [
    role('cfo', 'board', 'Chief Finance Officer', 'Kirby Waddle', {
      duties: [
        'Accounts Payable',
        'Accounts Receivable',
        'Profit & Loss Reports',
        'Budgeting',
        'LMA',
      ],
    }),
    role('executive-pr', 'board', 'Executive PR Director', '(Amos Kauffman)', {
      open: 'Open Position',
      duties: [
        'Recruiting',
        'Fund-Raising',
        'Church Networking',
        'Manage Digital Content',
        'LMA',
      ],
    }),
    role('recording-secretary', 'board', 'Recording Secretary', 'Naomi Byler', {
      duties: ['Record Meeting Minutes', 'LMA'],
    }),
    role('greece-field-director', 'board', 'Greece - Executive Field Director', 'Nate Shrock', {
      duties: [
        'Approve Field Budget',
        'Cascading Messages',
        'Member Care',
        'Interim Director',
        'Liaison',
        'LMA',
      ],
    }),
    role('human-resources', 'board', 'Human Resources', 'John Kauffman', {
      duties: ['Volunteer Vetting', 'Volunteer Communication', 'Training', 'LMA'],
    }),
    role('germany-field-director', 'board', 'Germany - Executive Field Director', 'Henry Troyer', {
      duties: [
        'Approve Field Budget',
        'Cascading Messages',
        'Member Care',
        'Liaison',
        'LMA',
      ],
    }),
    role('stateside-coordinators', 'board', 'Stateside Coordinators', 'Marlin & Amy', {
      duties: ['Organize Short Term Teams', 'Stateside Training & Orientation', 'LMA'],
    }),
  ],
  executiveTeam: [
    role('germany-field-director-admin', 'admin', 'Germany Field Director', 'Henry Troyer'),
    role('financial-director', 'admin', 'Financial Director', 'Naomi Byler'),
    role('member-care-director', 'admin', 'Member Care Director', undefined, {
      open: 'Open Position',
    }),
    role('global-development', 'admin', 'Global Development', 'Amos Kauffman'),
    role(
      'communications-hr',
      'admin',
      'Communications / HR Coordinator',
      'Marganitha Guenther',
    ),
    role('pr-coordinator-admin', 'admin', 'PR Coordinator', 'Courtney Gingerich'),
    role('stateside-coordinator', 'admin', 'Stateside Coordinator', 'Marlin & Amy Hostetler'),
  ],
  statesideBench: [
    role('exec-admin-leader', 'location', 'Executive Admin Team Leader'),
    role('exec-field-director', 'admin', 'Executive Field Director', 'Nate Shrock'),
  ],
  publicRelations: role('public-relations', 'location', 'Public Relations Team', undefined, {
    children: [
      role('pr-coordinator', 'coordinator', 'PR Coordinator', 'Courtney Gingerich'),
      role('grammar-editor', 'worker', 'Grammar Editor', 'Naomi Byler'),
      role('content-editor', 'worker', 'Content Editor', 'Becca Shrock'),
      role('approvals-amos', 'worker', 'Approvals', 'Amos Kauffman'),
      role('approvals-nate', 'worker', 'Approvals', 'Nate Shrock'),
    ],
  }),
  fieldProjects: [
    role('ioannina', 'location', 'Ioannina Project', undefined, {
      children: [
        role('ioannina-coordinator', 'coordinator', 'Field Coordinator', undefined, {
          open: 'Open Role',
        }),
        openSlot('ioannina-open-1', 'Open Roles'),
        openSlot('ioannina-open-2', 'Open Roles'),
      ],
    }),
    role('samos', 'location', 'Samos Project', undefined, {
      children: [
        role('samos-coordinator', 'coordinator', 'Field Coordinator', 'Nick & Lisa Berringer'),
        openSlot('samos-open-1', 'Open Roles'),
        openSlot('samos-open-2', 'Open Roles'),
      ],
    }),
    role('turkey', 'location', 'Turkey Project', undefined, {
      children: [
        role('turkey-coordinator', 'coordinator', 'Field Coordinator', undefined, {
          open: 'Open Role',
        }),
        openSlot('turkey-open-1', 'Open Roles'),
        openSlot('turkey-open-2', 'Open Roles'),
      ],
    }),
    role('athens', 'location', 'Athens Project', undefined, {
      note: '(Malakasa)',
      children: [
        role('athens-coordinator', 'coordinator', 'Field Coordinator', 'Daniel & Amber Miller'),
        person('chad-fonda', 'Chad & Fonda Martin', 'worker', '(DNI Partners)'),
        person('erik-esh', 'Erik Esh'),
        role('athens-womens', 'project', "Women's Ministry", undefined, {
          children: [
            person('twila-rohrer', 'Twila Rohrer'),
            openSlot('athens-womens-open', 'Open Role'),
          ],
        }),
        role('micro-camps', 'project', 'Micro Camps'),
      ],
    }),
  ],
  lesvos: role('lesvos', 'location', 'Lesvos Project', undefined, {
    children: [
      role('lesvos-directors', 'worker', 'Lesvos Directors', 'Nate & Becca Shrock'),
      role('lesvos-womens', 'project', "Women's Ministry", undefined, {
        children: [person('grace-troyer', 'Grace Troyer'), person('kaitlyn-hess', 'Kaitlyn Hess')],
      }),
      role('oasis', 'project', 'Oasis Project', undefined, {
        children: [
          person(
            'oasis-savvas',
            'Savvas & Joy Emmanouilidis',
            'partner',
            'Oasis Project / Greek Liaison',
          ),
        ],
      }),
      role('interns-2024', 'project', '2024 Intern Team', undefined, {
        children: [
          person('joshua-burkholder', 'Joshua Burkholder'),
          person('eric-burkholder', 'Eric Burkholder'),
          person('larisha-musser', 'Larisha Musser'),
          person('tara-hershberger', 'Tara Hershberger'),
        ],
      }),
    ],
    beside: [
      role('long-term-camp-staff', 'project', 'Long Term Camp Staff', undefined, {
        columns: 2,
        children: [
          person('sabrina-miller', 'Sabrina Miller'),
          person('cheyanne-miller', 'Cheyanne Miller'),
          person('marganitha-staff', 'Marganitha Guenther'),
          person('amanda-fisher', 'Amanda Fisher'),
          person('felicity-nolt', 'Felicity Nolt'),
          person('lesh-martin', 'Lesh Martin'),
          person('dawn-nolt', 'Dawn Nolt'),
          person('courtney-staff', 'Courtney Gingerich'),
          person('gilbert-nolt', 'Gilbert Nolt'),
          person('kevin-kinsinger', 'Kevin Kinsinger'),
          person('jordan-beachy', 'Jordan Beachy'),
          person('jason-bender', 'Jason Bender'),
        ],
      }),
    ],
  }),
  lesvosCoordinators: role(
    'lesvos-coordinators',
    'coordinator',
    'Lesvos Team Coordinators',
    'Paul & Marilyn Lehman',
    {
      children: [
        role('short-term-coordination', 'project', 'Short term Team Coordination'),
        role('lesvos-financial', 'project', 'Lesvos Financial Coordinator'),
        role('maintenance', 'project', 'Maintenance', undefined, {
          children: [
            role('domestic-coordinator', 'project', 'Domestic Coordinator'),
            role('poc-couple', 'worker', 'POC/Short term couple'),
          ],
        }),
      ],
    },
  ),
  germany: role('germany', 'location', 'Germany Project', undefined, {
    children: [
      role('germany-directors', 'worker', 'Germany Directors', 'Henry & Emma Troyer', {
        children: [
          role('admin-team', 'coordinator', 'Administrative Team', undefined, {
            children: [
              person('seth-stoltzfus', 'Seth Stoltzfus'),
              person('eleanor-frost', 'Eleanor Frost'),
              person('megan-sink', 'Megan Sink'),
              {
                id: 'financial-tracking',
                tone: 'project',
                headings: ['Financial Tracking', 'Short Term Teams'],
              },
            ],
          }),
        ],
        beside: [
          role('giessen', 'project', 'Giessen'),
          role('neustadt', 'project', 'Neustadt', undefined, {
            children: [
              person('alen-liz', 'Alen & Liz', 'partner', '(InterServe)'),
              person('anna-eims-wolfe', 'Anna Eims-Wolfe'),
            ],
          }),
          role('taunustein', 'project', 'Taunustein', undefined, {
            children: [
              person('elijah-lloyd', 'Elijah & Verna Lloyd'),
              role('germany-womens', 'project', "Women's Ministry", undefined, {
                children: [
                  person('susanna-lambright', 'Susanna Lambright'),
                  person('marta-bergen', 'Marta Bergen'),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  }),
} as const;

export function collectEntries(roots: readonly OrgEntry[]): OrgEntry[] {
  const out: OrgEntry[] = [];
  const walk = (entry: OrgEntry) => {
    out.push(entry);
    entry.children?.forEach(walk);
    entry.beside?.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

export function chartEntries(): OrgEntry[] {
  return collectEntries([
    ORG_CHART.visionary,
    ORG_CHART.implementer,
    ...ORG_CHART.partnerPeople,
    ...ORG_CHART.board,
    ...ORG_CHART.executiveTeam,
    ...ORG_CHART.statesideBench,
    ORG_CHART.publicRelations,
    ...ORG_CHART.fieldProjects,
    ORG_CHART.lesvos,
    ORG_CHART.lesvosCoordinators,
    ORG_CHART.germany,
  ]);
}
