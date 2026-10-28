export const COORDINATOR_EMAIL = 'info@i58global.org';

export const CRISIS_TITLE = 'A Crisis Calling Us to Action';

export const CRISIS_FACTS = [
  {
    icon: 'displaced' as const,
    detail: 'Over 117 million people are forcibly displaced worldwide',
  },
  {
    icon: 'hosted' as const,
    detail:
      'Over 70% of refugees are hosted by low and middle-income countries',
  },
  {
    icon: 'years' as const,
    detail:
      'Over two-thirds of refugees face years of displacement and uncertainty about their safety, legal status, and future',
  },
] as const;

export const GUIDE_FACTS = [
  {
    title: 'Length of Service',
    detail: '3-month term. Shorter terms are considered, but priority is given to full-term volunteers.',
  },
  {
    title: 'Age Requirement',
    detail: 'Individuals must be 18+. Couples and families are welcome.',
  },
  {
    title: 'Monthly Expenses',
    detail: '$750–$950 per individual (housing and utilities).',
  },
  {
    title: 'Travel Costs',
    detail: '$700–$1,400, arranged after acceptance.',
  },
  {
    title: 'Service Training',
    detail: '2-day training in Lancaster, PA. Lodging and meals provided.',
  },
  {
    title: 'Communication',
    detail: 'Unlocked smartphone required. A SIM card is provided upon arrival.',
  },
] as const;

export const LOOKING_FOR_TITLE = "Who We're Looking For";

export const GUIDE_VALUES = [
  { title: 'Team-Oriented', detail: 'Collaborating well across diverse cultures' },
  { title: 'Flexible', detail: 'Adaptable in changing refugee camp environments' },
  { title: 'Teachable', detail: 'Open to learning and new experiences' },
  { title: 'Compassionate', detail: 'Caring towards refugees and team members' },
  { title: 'Respectful', detail: 'Honoring leadership and cultural differences' },
  { title: 'Encouraging', detail: 'Building others up through words and actions' },
] as const;

export const GUIDE_LOCATIONS = [
  {
    region: 'greece' as const,
    title: 'Greece',
    photo: '/brand/greece.jpg',
    detail:
      'Practical humanitarian support and a comforting community presence as refugees navigate camp life on Lesvos and in Malakasa.',
  },
  {
    region: 'germany' as const,
    title: 'Germany',
    photo: '/brand/germany.jpg',
    detail:
      'Walking alongside refugees with emotional support and spiritual care through long, transformative relationships.',
  },
] as const;

export const GUIDE_TESTIMONIAL = {
  quote:
    'Being with you gave me hope again. I learned a lot from you and came to the conclusion that no matter how badly the world has treated us, there are still people who remind us that we are humanity.',
  attribution: 'Refugee on Lesvos',
};
