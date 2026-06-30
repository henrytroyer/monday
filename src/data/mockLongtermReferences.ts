import { LONGTERM_REFERENCE_SLOT_TYPES } from '../constants/longtermReferenceSlots';
import type { LongtermReferenceSlot } from '../types/longtermReference';
import type { ApplicationFormField } from '../types/volunteer';

type ReceivedSeed = {
  refereeName: string;
  refereeEmail: string;
  receivedAt: string;
  formFields: ApplicationFormField[];
};

function receivedReference(
  slotIndex: number,
  seed: ReceivedSeed,
): LongtermReferenceSlot {
  return {
    slotIndex,
    type: LONGTERM_REFERENCE_SLOT_TYPES[slotIndex]!,
    status: 'received',
    refereeName: seed.refereeName,
    refereeEmail: seed.refereeEmail,
    receivedAt: seed.receivedAt,
    formFields: seed.formFields,
  };
}

function pendingReference(slotIndex: number): LongtermReferenceSlot {
  return {
    slotIndex,
    type: LONGTERM_REFERENCE_SLOT_TYPES[slotIndex]!,
    status: 'pending',
  };
}

function friendFields(
  id: string,
  relationship: string,
  characterNote: string,
  recommend = 'Yes',
): ApplicationFormField[] {
  return [
    {
      id: `${id}-relationship`,
      question: 'How do you know the applicant?',
      answer: relationship,
    },
    {
      id: `${id}-years`,
      question: 'How long have you known them?',
      answer: characterNote.includes('years')
        ? characterNote.split('.')[0] + '.'
        : 'Several years',
    },
    {
      id: `${id}-character`,
      question: 'Character and reliability',
      answer: characterNote,
    },
    {
      id: `${id}-recommend`,
      question: 'Would you recommend this applicant?',
      answer: recommend,
    },
  ];
}

function employerFields(
  id: string,
  refereeName: string,
  organization: string,
  role: string,
  performance: string,
): ApplicationFormField[] {
  return [
    {
      id: `${id}-org`,
      question: 'Organization',
      answer: organization,
    },
    {
      id: `${id}-role`,
      question: 'Applicant role',
      answer: role,
    },
    {
      id: `${id}-supervisor`,
      question: 'Your relationship to the applicant',
      answer: `${refereeName}, direct supervisor`,
    },
    {
      id: `${id}-performance`,
      question: 'Work performance',
      answer: performance,
    },
    {
      id: `${id}-recommend`,
      question: 'Would you rehire or recommend?',
      answer: 'Yes, without hesitation',
    },
  ];
}

function pastorFields(
  id: string,
  refereeName: string,
  church: string,
  relationship: string,
  maturity: string,
): ApplicationFormField[] {
  return [
    {
      id: `${id}-pastor-name`,
      question: 'Pastor name',
      answer: refereeName,
    },
    {
      id: `${id}-church`,
      question: 'Church',
      answer: church,
    },
    {
      id: `${id}-relationship`,
      question: 'How long have you known the applicant?',
      answer: relationship,
    },
    {
      id: `${id}-maturity`,
      question: 'Character and spiritual maturity',
      answer: maturity,
    },
    {
      id: `${id}-recommend`,
      question: 'Would you recommend this applicant?',
      answer: 'Yes, without reservation',
    },
  ];
}

function r(
  refereeName: string,
  refereeEmail: string,
  receivedAt: string,
  formFields: ApplicationFormField[],
): ReceivedSeed {
  return { refereeName, refereeEmail, receivedAt, formFields };
}

/**
 * Reference fill levels mirror pipeline stage:
 * New → 0–1 received | references sent → 2–3 | Holding → 4 | approved+ → 5
 */
const RECEIVED_BY_VOLUNTEER: Record<
  string,
  Partial<Record<number, ReceivedSeed>>
> = {
  // New — just started, maybe one friend reference in
  'longterm-mock-1': {
    0: r(
      'Sarah Mitchell',
      'sarah.mitchell@example.com',
      'May 28, 2026',
      friendFields('lt-ref-1-f1', 'College roommate at Oregon State; still close friends', 'John is dependable, kind under pressure, and follows through on commitments. He volunteered with me at a campus food pantry for two years.'),
    ),
  },
  'longterm-mock-2': {},

  // references sent — forms out, mix coming back
  'longterm-mock-3': {
    0: r(
      'Carlos Ruiz',
      'carlos.ruiz@example.com',
      'May 5, 2026',
      friendFields('lt-ref-3-f1', 'Met through a missions prep course in Barcelona', 'Mateo is thoughtful, culturally sensitive, and genuinely cares about refugees. He showed up early every week to our prep cohort.'),
    ),
    2: r(
      'Pastor Andreas Weber',
      'pastor.weber@berlin-international.org',
      'May 2, 2026',
      pastorFields(
        'lt-ref-3-pastor',
        'Pastor Andreas Weber',
        'Berlin International Church',
        '2 years — member of our young adults ministry',
        'Mateo has grown significantly in discipleship and service. He is teachable, humble, and ready for long-term cross-cultural work.',
      ),
    ),
  },
  'longterm-mock-4': {
    0: r(
      'Lucie Moreau',
      'lucie.moreau@gmail.com',
      'May 10, 2026',
      friendFields('lt-ref-4-f1', 'Childhood friend from Lyon; we attend the same church', 'Sophie is steady, compassionate, and excellent with people in crisis. She has a calm presence that helps teams under stress.'),
    ),
    1: r(
      'Philippe Garnier',
      'p.garnier@hopital-lyon.fr',
      'May 14, 2026',
      employerFields(
        'lt-ref-4-emp',
        'Philippe Garnier',
        'Hôpital Édouard Herriot — Volunteer Services',
        'Hospital welcome desk volunteer (12 hrs/week)',
        'Sophie was always punctual, professional with patients, and willing to cover shifts. Staff frequently asked when she would be on duty.',
      ),
    ),
    2: r(
      'Père Jean-Claude Martin',
      'jc.martin@paroisse-lyon.fr',
      'May 8, 2026',
      pastorFields(
        'lt-ref-4-pastor',
        'Père Jean-Claude Martin',
        'Paroisse Saint-Irénée, Lyon',
        '5 years — youth group leader and worship team',
        'Sophie demonstrates mature faith and a servant heart. I recommend her for long-term ministry without reservation.',
      ),
    ),
  },

  // Holding — almost complete, one slot still out
  'longterm-mock-5': {
    0: r(
      'Amara Okafor',
      'amara.okafor@example.com',
      'April 22, 2026',
      friendFields('lt-ref-5-f1', 'Teammate on a university missions trip to Athens', 'David is resilient, respectful across cultures, and a natural encourager. He helped our team navigate difficult conversations with grace.'),
    ),
    1: r(
      'Grace Okonkwo',
      'grace.okonkwo@family.example',
      'April 18, 2026',
      employerFields(
        'lt-ref-5-emp',
        'Grace Okonkwo',
        'Lagos Community Health Initiative',
        'Program assistant — community outreach',
        'David managed schedules, translated for visitors, and never missed a deadline. Community members trusted him immediately.',
      ),
    ),
    2: r(
      'Rev. Samuel Adeyemi',
      'samuel.adeyemi@gracechurch.ng',
      'April 15, 2026',
      pastorFields(
        'lt-ref-5-pastor',
        'Rev. Samuel Adeyemi',
        'Grace Chapel Lagos',
        '6 years — worship leader and missions committee',
        'David has a clear calling to serve abroad. He is biblically grounded, accountable, and ready for the demands of field life.',
      ),
    ),
    3: r(
      'James Whitfield',
      'j.whitfield@example.com',
      'April 25, 2026',
      friendFields('lt-ref-5-f2', 'Small group leader at Grace Chapel', 'David is honest, coachable, and invests deeply in relationships. He checks in on people consistently and follows up on prayer requests.'),
    ),
  },

  // approved — full set
  'longterm-mock-6': {
    0: r(
      'Rachel Kim',
      'rachel.kim@example.com',
      'March 30, 2026',
      friendFields('lt-ref-6-f1', 'Roommate during a summer internship in Portland', 'Emily is organized, warm, and handles conflict directly but kindly. She was the person everyone on our floor came to for advice.'),
    ),
    1: r(
      'Mark Sullivan',
      'm.sullivan@harborview.org',
      'March 28, 2026',
      employerFields(
        'lt-ref-6-emp',
        'Mark Sullivan',
        'Harborview Family Services',
        'Case management intern',
        'Emily learned our systems quickly, documented thoroughly, and treated every client with dignity. I would hire her again immediately.',
      ),
    ),
    2: r(
      'Rev. Michael Thompson',
      'pastor@gracecommunity.example',
      'March 25, 2026',
      pastorFields(
        'lt-ref-6-pastor',
        'Rev. Michael Thompson',
        'Grace Community Church, Portland OR',
        '4 years — missions team and youth volunteer',
        'Emily has demonstrated sustained commitment to service. She is spiritually mature and well prepared for long-term placement.',
      ),
    ),
    3: r(
      'Daniel Cho',
      'daniel.cho@example.com',
      'April 2, 2026',
      friendFields('lt-ref-6-f2', 'Leader on our church short-term trip to Lesvos', 'Emily stayed calm during long shifts, debriefed thoughtfully with the team, and asked good questions about sustainable ministry.'),
    ),
    4: r(
      'Elena Vasquez',
      'elena.vasquez@example.com',
      'April 4, 2026',
      friendFields('lt-ref-6-f3', 'Coworker at Harborview Family Services', 'Emily is trustworthy with sensitive information and brings positive energy even on hard days. She finishes what she starts.'),
    ),
  },

  // clearances — full set, slightly older dates
  'longterm-mock-7': {
    0: r(
      'Stefan Richter',
      'stefan.richter@example.com',
      'February 14, 2026',
      friendFields('lt-ref-7-f1', 'University housemate in Heidelberg', 'Jonas is disciplined, curious about other cultures, and generous with his time. He helped me adjust when I first moved to Germany.'),
    ),
    1: r(
      'Dr. Ingrid Hoffmann',
      'i.hoffmann@stadtklinik.de',
      'February 10, 2026',
      employerFields(
        'lt-ref-7-emp',
        'Dr. Ingrid Hoffmann',
        'Stadtklinik Heidelberg — Patient Advocacy',
        'Administrative support volunteer',
        'Jonas was reliable, discreet, and compassionate with patients\' families. He handled German and English correspondence fluently.',
      ),
    ),
    2: r(
      'Pastor Klaus Brenner',
      'k.brenner@heidelberg-evangelisch.de',
      'February 8, 2026',
      pastorFields(
        'lt-ref-7-pastor',
        'Pastor Klaus Brenner',
        'Evangelische Gemeinde Heidelberg',
        '3 years — diaconal ministry volunteer',
        'Jonas serves faithfully behind the scenes and has a heart for the marginalized. I support his long-term calling fully.',
      ),
    ),
    3: r(
      'Marta Silva',
      'marta.silva@example.com',
      'February 18, 2026',
      friendFields('lt-ref-7-f2', 'Language exchange partner and close friend', 'Jonas is patient, culturally aware, and quick to admit mistakes. He builds trust across language barriers naturally.'),
    ),
    4: r(
      'Henrik Lund',
      'henrik.lund@example.com',
      'February 20, 2026',
      friendFields('lt-ref-7-f3', 'Teammate on a refugee welcome team in Mannheim', 'Jonas showed up consistently for evening shifts and mentored newer volunteers. He reads situations well and de-escalsates tension.'),
    ),
  },

  // prepartation — full set, oldest dates
  'longterm-mock-8': {
    0: r(
      'Anika Sharma',
      'anika.sharma@example.com',
      'January 12, 2026',
      friendFields('lt-ref-8-f1', 'Met at a YWAM discipleship training school', 'Priya is focused, spiritually grounded, and works well in diverse teams. She takes feedback well and improves quickly.'),
    ),
    1: r(
      'Robert Hayes',
      'r.hayes@globalaid.example',
      'January 8, 2026',
      employerFields(
        'lt-ref-8-emp',
        'Robert Hayes',
        'Global Aid Logistics — Manchester office',
        'Warehouse and distribution volunteer coordinator',
        'Priya coordinated volunteer rotas, tracked inventory accurately, and stayed late during emergency shipments without being asked.',
      ),
    ),
    2: r(
      'Rev. Helen Cartwright',
      'helen.cartwright@stmarys.example',
      'January 5, 2026',
      pastorFields(
        'lt-ref-8-pastor',
        'Rev. Helen Cartwright',
        'St. Mary\'s Anglican, Manchester',
        '5 years — outreach and prayer ministry',
        'Priya has a clear vocation to long-term service. She is mature beyond her years and ready for the field.',
      ),
    ),
    3: r(
      'Tomás Herrera',
      'tomas.herrera@example.com',
      'January 15, 2026',
      friendFields('lt-ref-8-f2', 'Co-leader on a Lesvos orientation trip', 'Priya debriefed carefully with our team, looked out for newer volunteers, and handled long days with a steady attitude.'),
    ),
    4: r(
      'Noah Williams',
      'noah.williams@example.com',
      'January 18, 2026',
      friendFields('lt-ref-8-f3', 'Friend from university missions society', 'Priya is one of the most reliable people I know. She communicates proactively and keeps commitments even when inconvenient.'),
    ),
  },

  // On-field volunteers — all references complete (deployed staff)
  'longterm-mock-9': {
    0: r(
      'Anna Bergstrom',
      'anna.bergstrom@example.com',
      'March 20, 2026',
      friendFields('lt-ref-9-f1', 'Long-term friend from university in Stockholm', 'Thomas is steady, practical, and excellent in high-pressure environments. He was our go-to person during crisis response drills.'),
    ),
    1: r(
      'Erik Lindqvist',
      'e.lindqvist@fieldops.example',
      'March 18, 2026',
      employerFields(
        'lt-ref-9-emp',
        'Erik Lindqvist',
        'Field Operations NGO — Athens hub',
        'Logistics coordinator',
        'Thomas managed supply chains calmly during peak arrival periods. He communicates clearly with local partners and international staff.',
      ),
    ),
    2: r(
      'Rev. Elena Papadou',
      'elena.papadou@stnicholas.gr',
      'March 15, 2026',
      pastorFields(
        'lt-ref-9-pastor',
        'Rev. Elena Papadou',
        'St. Nicholas Parish, Mytilene',
        '4 years — parish partner and short-term host',
        'Thomas has integrated well into local ministry rhythms and shows deep respect for the community he serves.',
      ),
    ),
    3: r(
      'James Ortiz',
      'james.ortiz@example.com',
      'March 22, 2026',
      friendFields('lt-ref-9-f2', 'Small group leader and accountability partner', 'Thomas is transparent about struggles, receptive to counsel, and committed to personal growth. He invests in others consistently.'),
    ),
    4: r(
      'Priya Nair',
      'priya.nair@example.com',
      'March 25, 2026',
      friendFields('lt-ref-9-f3', 'Former teammate on orientation deployment', 'Thomas mentored new arrivals patiently and helped our team navigate cultural differences on Lesvos without friction.'),
    ),
  },
  'longterm-mock-10': {
    0: r(
      'Yannis Kostas',
      'yannis.kostas@example.com',
      'February 28, 2026',
      friendFields('lt-ref-10-f1', 'Family friend in Athens; known Maria since childhood', 'Maria is compassionate, bilingual, and deeply connected to her community. She listens well and responds with practical help.'),
    ),
    1: r(
      'Dr. Sofia Petrou',
      's.petrou@malakasa-clinic.example',
      'February 25, 2026',
      employerFields(
        'lt-ref-10-emp',
        'Dr. Sofia Petrou',
        'Malakasa Community Clinic — volunteer program',
        'Health intake volunteer',
        'Maria translated for patients with care and accuracy. Staff trusted her with sensitive intake conversations immediately.',
      ),
    ),
    2: r(
      'Fr. Dimitrios Ioannou',
      'd.ioannou@orthodox-malakasa.gr',
      'February 22, 2026',
      pastorFields(
        'lt-ref-10-pastor',
        'Fr. Dimitrios Ioannou',
        'Orthodox Parish of Malakasa',
        '7 years — parish volunteer and youth mentor',
        'Maria lives her faith quietly and faithfully. She is prepared for sustained service and handles hardship with grace.',
      ),
    ),
    3: r(
      'Eleni Papadopoulos',
      'eleni.p@family.example',
      'March 1, 2026',
      friendFields('lt-ref-10-f2', 'Cousin and co-volunteer at community kitchen', 'Maria shows up early, stays late, and never makes volunteers feel like a burden. She remembers names and follows up.'),
    ),
    4: r(
      'Christos Andreou',
      'c.andreou@example.com',
      'March 3, 2026',
      friendFields('lt-ref-10-f3', 'Neighbor and friend from Kifisia', 'Maria is trustworthy, discreet, and calm when situations get tense. She thinks before she speaks and de-escalates well.'),
    ),
  },
  'longterm-mock-11': {
    0: r(
      'Felix Wagner',
      'felix.wagner@example.com',
      'January 20, 2026',
      friendFields('lt-ref-11-f1', 'Friend from Taunusstien orientation cohort', 'Lukas is thoughtful, organized, and good at building systems that help teams run smoothly. He documents processes clearly.'),
    ),
    1: r(
      'Sabine Krause',
      's.krause@taunusstien-hub.de',
      'January 18, 2026',
      employerFields(
        'lt-ref-11-emp',
        'Sabine Krause',
        'Taunusstien Welcome Hub — Frankfurt region',
        'Operations support volunteer',
        'Lukas managed volunteer schedules and supply orders without errors. He anticipates needs before they become problems.',
      ),
    ),
    2: r(
      'Pastor Matthias Engel',
      'm.engel@evangelisch-taunus.de',
      'January 15, 2026',
      pastorFields(
        'lt-ref-11-pastor',
        'Pastor Matthias Engel',
        'Evangelische Gemeinde Taunusstien',
        '3 years — diaconal team and welcome ministry',
        'Lukas has a servant heart and theological depth. He is ready for long-term placement and handles stress maturely.',
      ),
    ),
    3: r(
      'Claire Dubois',
      'claire.dubois@example.com',
      'January 22, 2026',
      friendFields('lt-ref-11-f2', 'Teammate on Neustadt rotation last year', 'Lukas communicated clearly across language barriers and helped our team stay unified during a difficult month.'),
    ),
    4: r(
      'Jonas Meier',
      'jonas.meier@example.com',
      'January 25, 2026',
      friendFields('lt-ref-11-f3', 'University friend from Heidelberg missions society', 'Lukas is one of the most dependable people in our circle. He follows through and keeps confidences.'),
    ),
  },
  'longterm-mock-12': {
    0: r(
      'Sophie Laurent',
      'sophie.laurent@example.com',
      'December 10, 2025',
      friendFields('lt-ref-12-f1', 'Friend from Lyon; we trained together for long-term service', 'Claire is empathetic, structured, and excellent at welcoming newcomers. She creates safe spaces for hard conversations.'),
    ),
    1: r(
      'Henri Duval',
      'h.duval@neustadt-welcome.de',
      'December 8, 2025',
      employerFields(
        'lt-ref-12-emp',
        'Henri Duval',
        'Neustadt Welcome Center',
        'Front desk and intake volunteer lead',
        'Claire trained new volunteers patiently and handled difficult intake calls with professionalism. Visitors felt seen and respected.',
      ),
    ),
    2: r(
      'Père Antoine Leclerc',
      'a.leclerc@paroisse-neustadt.fr',
      'December 5, 2025',
      pastorFields(
        'lt-ref-12-pastor',
        'Père Antoine Leclerc',
        'Paroisse Saint-Martin, Neustadt',
        '4 years — outreach and French-German ministry bridge',
        'Claire demonstrates mature faith and cultural sensitivity. I recommend her for continued long-term service.',
      ),
    ),
    3: r(
      'Lukas Fischer',
      'lukas.fischer@example.com',
      'December 12, 2025',
      friendFields('lt-ref-12-f2', 'Field teammate during Taunusstien placement', 'Claire adapted quickly to local rhythms, asked good questions, and supported teammates when morale dipped.'),
    ),
    4: r(
      'Isabelle Renard',
      'isabelle.renard@example.com',
      'December 14, 2025',
      friendFields('lt-ref-12-f3', 'Prayer partner and accountability friend', 'Claire is honest about limits, seeks counsel when needed, and maintains healthy boundaries while serving generously.'),
    ),
  },
  'longterm-mock-13': {
    0: r(
      'Claire Dubois',
      'claire.dubois@example.com',
      'February 5, 2026',
      friendFields('lt-ref-13-f1', 'Orientation cohort friend from Neustadt', 'Felix is upbeat, practical, and good at fixing problems on the fly. He keeps teams moving when energy is low.'),
    ),
    1: r(
      'Dr. Ursula Brandt',
      'u.brandt@giessen-health.example',
      'February 2, 2026',
      employerFields(
        'lt-ref-13-emp',
        'Dr. Ursula Brandt',
        'Giessen Community Health Network',
        'Volunteer program assistant',
        'Felix coordinated schedules across three sites and never dropped a handoff. He is detail-oriented and respectful with staff.',
      ),
    ),
    2: r(
      'Pastor Matthias Engel',
      'm.engel@evangelisch-giessen.de',
      'January 30, 2026',
      pastorFields(
        'lt-ref-13-pastor',
        'Pastor Matthias Engel',
        'Evangelische Gemeinde Giessen',
        '2 years — welcome ministry and youth support',
        'Felix has grown in spiritual maturity and service capacity. He is ready for sustained field assignment.',
      ),
    ),
    3: r(
      'Lukas Fischer',
      'lukas.fischer@example.com',
      'February 8, 2026',
      friendFields('lt-ref-13-f2', 'Shared housing during Giessen placement', 'Felix is considerate as a roommate, cleans up without being asked, and communicates directly when something is wrong.'),
    ),
    4: r(
      'Sarah Chen',
      'sarah.chen@example.com',
      'February 10, 2026',
      friendFields('lt-ref-13-f3', 'Intern cohort colleague and friend', 'Felix helped onboard newer interns and explained local context patiently. He is a natural teacher.'),
    ),
  },
  'longterm-mock-14': {
    0: r(
      'Marcus Chen',
      'marcus.chen@example.com',
      'January 28, 2026',
      friendFields('lt-ref-14-f1', 'Brother — grew up in same household', 'Sarah is disciplined, curious, and deeply committed to serving others. She balances ambition with humility well.'),
    ),
    1: r(
      'Dr. Amy Whitfield',
      'a.whitfield@intern-program.example',
      'January 25, 2026',
      employerFields(
        'lt-ref-14-emp',
        'Dr. Amy Whitfield',
        'Intern Program — Central Operations',
        'Program intern — research and reporting',
        'Sarah delivered weekly reports on time, asked insightful questions, and improved our onboarding docs for future interns.',
      ),
    ),
    2: r(
      'Rev. David Park',
      'd.park@citylight.example',
      'January 22, 2026',
      pastorFields(
        'lt-ref-14-pastor',
        'Rev. David Park',
        'City Light Church, Seattle',
        '3 years — college ministry and missions sending',
        'Sarah has a clear calling and the character to sustain long-term work. Our church sends her with confidence.',
      ),
    ),
    3: r(
      'Felix Wagner',
      'felix.wagner@example.com',
      'January 30, 2026',
      friendFields('lt-ref-14-f2', 'Intern cohort peer in Giessen rotation', 'Sarah picked up local procedures quickly and helped the rest of us understand admin expectations without condescension.'),
    ),
    4: r(
      'Eleanor Whitfield',
      'eleanor.whitfield@example.com',
      'February 1, 2026',
      friendFields('lt-ref-14-f3', 'Mentor through church intern network', 'Sarah receives feedback gracefully and applies it immediately. She is trustworthy with responsibility beyond her experience level.'),
    ),
  },
  'longterm-mock-15': {
    0: r(
      'Emily Hart',
      'emily.hart@example.com',
      'December 18, 2025',
      friendFields('lt-ref-15-f1', 'Friend from Portland missions community', 'Noah is steady under pressure, good with newcomers, and remembers details that make people feel welcome.'),
    ),
    1: r(
      'Thomas Keller',
      't.keller@fieldorg.example',
      'December 15, 2025',
      employerFields(
        'lt-ref-15-emp',
        'Thomas Keller',
        'Field Operations NGO — Lesvos team',
        'Assistant logistics coordinator (pre-deployment training)',
        'Noah completed training modules early and volunteered for extra shadow shifts. Supervisors noted his readiness for field work.',
      ),
    ),
    2: r(
      'Rev. Michael Thompson',
      'pastor@gracecommunity.example',
      'December 12, 2025',
      pastorFields(
        'lt-ref-15-pastor',
        'Rev. Michael Thompson',
        'Grace Community Church, Portland OR',
        '5 years — missions sending and member care',
        'Noah has been faithful in local ministry and prepared thoroughly for long-term service. We send him wholeheartedly.',
      ),
    ),
    3: r(
      'Priya Nair',
      'priya.nair@example.com',
      'December 20, 2025',
      friendFields('lt-ref-15-f2', 'Preparation cohort friend — same deployment timeline', 'Noah debriefs honestly, supports teammates proactively, and stays calm when plans change at the last minute.'),
    ),
    4: r(
      'Anna Bergstrom',
      'anna.bergstrom@example.com',
      'December 22, 2025',
      friendFields('lt-ref-15-f3', 'Accountability partner during pre-field training', 'Noah keeps spiritual disciplines consistently and communicates early when he is overloaded. He is mature and field-ready.'),
    ),
  },
};

export function buildLongtermReferenceSlots(
  volunteerId: string,
): LongtermReferenceSlot[] {
  const received = RECEIVED_BY_VOLUNTEER[volunteerId] ?? {};

  return LONGTERM_REFERENCE_SLOT_TYPES.map((_type, slotIndex) => {
    const seed = received[slotIndex];
    if (seed) {
      return receivedReference(slotIndex, seed);
    }
    return pendingReference(slotIndex);
  });
}

export function findLongtermReferenceSlot(
  volunteerId: string,
  slotIndex: number,
): LongtermReferenceSlot | undefined {
  return buildLongtermReferenceSlots(volunteerId).find(
    (slot) => slot.slotIndex === slotIndex,
  );
}

export function countReceivedReferences(volunteerId: string): number {
  return buildLongtermReferenceSlots(volunteerId).filter(
    (slot) => slot.status === 'received',
  ).length;
}
