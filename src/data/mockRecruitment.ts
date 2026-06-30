import type { RecruitmentNote, RecruitmentProspect } from '../types/recruitment';

function daysAgo(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const DEMO_PROSPECT_MAYA_ID = 'recruit-demo-maya';
export const DEMO_PROSPECT_TOMAS_ID = 'recruit-demo-tomas';

export const MOCK_RECRUITMENT_MAYA: RecruitmentProspect = {
  id: DEMO_PROSPECT_MAYA_ID,
  name: 'Maya Chen',
  email: 'maya.chen@example.com',
  phone: '+1 503 555 0142',
  assignedUserId: 'coord-mike',
  assignedUserName: 'Mike',
  sourceContactId: null,
  priorServiceTerms: [],
  createdAt: daysAgo(18, 9, 15),
  updatedAt: daysAgo(0, 16, 40),
};

/** Back-and-forth team thread for UI preview (list synopsis + detail chat). */
export const MOCK_RECRUITMENT_MAYA_NOTES: RecruitmentNote[] = [
  {
    id: 'recruit-note-demo-maya-1',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Sarah',
    createdAt: daysAgo(18, 9, 20),
    body: 'Referred from Contacts — John mentioned Maya at Sunday lunch. Interested in summer medical outreach on Lesvos.',
  },
  {
    id: 'recruit-note-demo-maya-2',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Mike',
    createdAt: daysAgo(17, 11, 5),
    body: "I'll take first touch. Do we already have her email in the system?",
  },
  {
    id: 'recruit-note-demo-maya-3',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Sarah',
    createdAt: daysAgo(17, 11, 42),
    body: 'Yes — maya.chen@example.com. Nursing student, second year. Prefers email before phone.',
  },
  {
    id: 'recruit-note-demo-maya-4',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Mike',
    createdAt: daysAgo(15, 14, 30),
    body: 'Called her this morning. Very engaged — asked thoughtful questions about housing, Greek lessons, and weekend rhythm on the island.',
  },
  {
    id: 'recruit-note-demo-maya-5',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Elena',
    createdAt: daysAgo(14, 10, 0),
    body: 'Adding her to the April info session invite list unless you want another week, Mike?',
  },
  {
    id: 'recruit-note-demo-maya-6',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Mike',
    createdAt: daysAgo(14, 10, 18),
    body: "April works. She can't do March — midterms. Her roommate might join too; same church small group.",
  },
  {
    id: 'recruit-note-demo-maya-7',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'James',
    createdAt: daysAgo(13, 16, 55),
    body: 'Any red flags from the call? Medical placements need extra clarity on scope of practice.',
  },
  {
    id: 'recruit-note-demo-maya-8',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Mike',
    createdAt: daysAgo(13, 17, 12),
    body: 'None so far. She understands she will not be doing clinical procedures — support and intake only. Asked about pairs policy if both apply.',
  },
  {
    id: 'recruit-note-demo-maya-9',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Sarah',
    createdAt: daysAgo(12, 9, 0),
    body: 'Pairs are fine if both pass screening. I sent the co-applicant policy PDF and the summer term overview.',
  },
  {
    id: 'recruit-note-demo-maya-10',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Elena',
    createdAt: daysAgo(10, 13, 45),
    body: 'Info session Zoom link sent for Apr 12, 7pm Athens / noon Portland. Calendar hold added for Mike.',
  },
  {
    id: 'recruit-note-demo-maya-11',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Mike',
    createdAt: daysAgo(8, 8, 30),
    body: 'Maya confirmed attendance. Question on fundraising minimum — I said $800 for a two-week term; her church may help with a portion.',
  },
  {
    id: 'recruit-note-demo-maya-12',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'James',
    createdAt: daysAgo(5, 15, 20),
    body: "After the info session, let's move her to application if she's still keen. Please flag if pastor reference is slow.",
  },
  {
    id: 'recruit-note-demo-maya-13',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Elena',
    createdAt: daysAgo(2, 19, 10),
    body: 'Info session went well — Maya and her friend both attended. Strong fit, good questions on cultural sensitivity training.',
  },
  {
    id: 'recruit-note-demo-maya-14',
    prospectId: DEMO_PROSPECT_MAYA_ID,
    authorName: 'Sarah',
    createdAt: daysAgo(0, 16, 40),
    body: 'Ready for application invite. Mike — can you nudge pastor reference this week? I will draft the welcome email once forms are open.',
  },
];

export const MOCK_RECRUITMENT_TOMAS: RecruitmentProspect = {
  id: DEMO_PROSPECT_TOMAS_ID,
  name: 'Tomás Rivera',
  email: 'tomas.rivera@example.com',
  phone: '+34 612 555 0198',
  assignedUserId: 'coord-elena',
  assignedUserName: 'Elena',
  sourceContactId: null,
  priorServiceTerms: [
    {
      timelineLabel: 'Fall 2023 · Hospitality',
      pipelineStage: 'Alumni',
      status: 'Completed',
    },
  ],
  createdAt: daysAgo(6, 11, 0),
  updatedAt: daysAgo(1, 9, 30),
};

export const MOCK_RECRUITMENT_TOMAS_NOTES: RecruitmentNote[] = [
  {
    id: 'recruit-note-demo-tomas-1',
    prospectId: DEMO_PROSPECT_TOMAS_ID,
    authorName: 'Elena',
    createdAt: daysAgo(6, 11, 15),
    body: 'Returning volunteer — served Fall 2023 hospitality. Wants a longer medical term next cycle.',
  },
  {
    id: 'recruit-note-demo-tomas-2',
    prospectId: DEMO_PROSPECT_TOMAS_ID,
    authorName: 'James',
    createdAt: daysAgo(1, 9, 30),
    body: 'Fast-track alumni path approved. Elena to send updated application link when medical timeline opens.',
  },
];

export interface RecruitmentDemoBundle {
  prospect: RecruitmentProspect;
  notes: RecruitmentNote[];
}

export const MOCK_RECRUITMENT_DEMOS: RecruitmentDemoBundle[] = [
  { prospect: MOCK_RECRUITMENT_MAYA, notes: MOCK_RECRUITMENT_MAYA_NOTES },
  { prospect: MOCK_RECRUITMENT_TOMAS, notes: MOCK_RECRUITMENT_TOMAS_NOTES },
];
