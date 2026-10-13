export const PORTAL_TABS = [
  'home',
  'short-term',
  'long-term',
  'volunteer',
] as const;

export type PortalTab = (typeof PORTAL_TABS)[number];

export const PORTAL_TAB_LABEL: Record<PortalTab, string> = {
  home: 'Home',
  'short-term': 'Short-term',
  volunteer: 'Volunteer',
  'long-term': 'Long-term',
};

export const SHORT_TERM_VIEWS = ['progress', 'documents'] as const;

/** Volunteer-facing name of the short-term files page. */
export const FORMS_AND_REFERENCES_TITLE = 'Forms & References';
export const APPLICATION_PROCESS_TITLE = 'Application process';
export const SHORT_TERM_APPLICATION_TITLE = 'Short-term application';
export const HOPE_IN_ACTION = 'Hope in Action';
export const HOPE_IN_ACTION_TAGLINE = 'Serving Refugees across Europe';
export const VOLUNTEER_PORTAL_TITLE = 'Volunteer Portal';
export const I58_MARK = '/brand/i58-mark.png';
export const HOME_HERO_PHOTO = '/brand/home-page-main-photo.jpg';
export const GREECE_MAP = '/brand/greece-map.png';
export const GERMANY_MAP = '/brand/germany-map.png';
export const APPLICATION_PROCESS_PHOTO = '/brand/application-process.png';
export const WORLD_MAP = '/brand/world-map.png';
export const JOURNEY_PLANE = '/brand/journey-plane.png?v=4';
export const ISAIAH_FOOTER =
  '…to loose the bands of wickedness, to undo the heavy burdens, and let the oppressed go free… to deal bread for the hungry… Isaiah 58:6-7';

export type ShortTermView = (typeof SHORT_TERM_VIEWS)[number];

export type PortalDestination =
  | { tab: 'home' }
  | { tab: 'long-term' }
  | { tab: 'volunteer' }
  | { tab: 'short-term'; view?: ShortTermView };
