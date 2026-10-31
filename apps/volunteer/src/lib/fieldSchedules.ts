/**
 * Field-home schedules opened from the photo bar.
 * Camp rows stand in for the Google Sheet until staff supply them.
 * Cleaning rows follow the current house sheet.
 */

export type CampScheduleRow = {
  id: string;
  day: string;
  time: string;
  activity: string;
  place: string;
};

export const CAMP_SCHEDULE_ROWS: readonly CampScheduleRow[] = [
  { id: 'mon-meet', day: 'Monday', time: '8:00 AM', activity: 'Team meeting', place: 'Common room' },
  { id: 'mon-setup', day: 'Monday', time: '9:30 AM', activity: 'Camp setup', place: 'Shore camp' },
  { id: 'mon-sports', day: 'Monday', time: '7:00 PM', activity: 'Sports Night', place: 'Field' },
  { id: 'tue-distribution', day: 'Tuesday', time: '10:00 AM', activity: 'Distribution', place: 'Camp entrance' },
  { id: 'wed-class', day: 'Wednesday', time: '9:00 AM', activity: 'Language class', place: 'Classroom tent' },
  { id: 'thu-visits', day: 'Thursday', time: '2:00 PM', activity: 'Family visits', place: 'Housing area' },
  { id: 'fri-debrief', day: 'Friday', time: '4:30 PM', activity: 'Team debrief', place: 'Common room' },
  { id: 'sat-worship', day: 'Saturday', time: '6:00 PM', activity: 'Worship night', place: 'Courtyard' },
];

export type CleaningRow = {
  id: string;
  name: string;
  detail: string;
  timing?: string;
};

export type CleaningArea = {
  id: string;
  title: string;
  rows: readonly CleaningRow[];
};

export const CLEANING_AREAS: readonly CleaningArea[] = [
  {
    id: 'laundry',
    title: 'Cornerstone Laundry Area',
    rows: [
      {
        id: 'travis',
        name: 'Travis',
        detail: 'Take out trash, wipe down washers, and tidy the area',
        timing: 'Once a week',
      },
    ],
  },
  {
    id: 'vehicles',
    title: 'Vehicles',
    rows: [
      {
        id: 'jacob',
        name: 'Jacob (8213)',
        detail:
          '1. Wash exterior and vacuum interior. 2. Wipe down interior surfaces and take out trash',
      },
    ],
  },
  {
    id: 'brick',
    title: 'Brick',
    rows: [
      {
        id: 'rose',
        name: 'Rose',
        detail: 'Sweep daily and mop the floor 3x weekly',
        timing: 'Monday, Wednesday, and Friday',
      },
      {
        id: 'kara',
        name: 'Kara',
        detail:
          'Wash all used dish rags and tea towels, hang on the upstairs drying rack, fold, and place in bin under the sink',
        timing: 'Please do it over the weekend!',
      },
      {
        id: 'jamison',
        name: 'Jamison',
        detail: 'Empty trash cans downstairs and upstairs including the bathroom',
        timing: 'Every evening',
      },
      {
        id: 'sara',
        name: 'Sara',
        detail: 'Clean upstairs bathroom',
        timing: 'Once a week',
      },
      {
        id: 'ava',
        name: 'Ava',
        detail: 'Clean up kitchen, wash, and put away dishes',
        timing: 'Every evening before you leave',
      },
      {
        id: 'upstairs-floors',
        name: '',
        detail: 'Vacuum floors and carpet upstairs using the vacuum stored by the bathroom',
        timing: 'Once a week',
      },
    ],
  },
];
