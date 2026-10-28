import type { ShortTermStepId } from '../contract/volunteerApi';

export const PORTAL_TABS = ['home', 'volunteer'] as const;

export type PortalTab = (typeof PORTAL_TABS)[number];

export const PORTAL_TAB_LABEL: Record<PortalTab, string> = {
  home: 'Home',
  volunteer: 'My Info',
};

export const SHORT_TERM_VIEWS = ['progress', 'documents'] as const;

/** Volunteer-facing name of the short-term files page. */
export const FORMS_AND_REFERENCES_TITLE = 'Forms & References';
export const APPLICATION_PROCESS_TITLE = 'Application Process';
export const SHORT_TERM_APPLICATION_TITLE = 'Short-term application';
export const HOPE_IN_ACTION = 'Hope in Action';
export const HOPE_IN_ACTION_TAGLINE = 'Serving Refugees across Europe';
export const VOLUNTEER_PORTAL_TITLE = 'Volunteer Portal';
export const I58_MARK = '/brand/i58-mark.png';
export const HOME_HERO_PHOTO = '/brand/home-page-main-photo.jpg';
export const GREECE_MAP = '/brand/greece-map.png';
export const GERMANY_MAP = '/brand/germany-map.png';
export const APPLICATION_PROCESS_PHOTO = '/brand/application-process.png';
export const APPLICATION_PROCESS_HERO = '/brand/application-process-hero.jpg?v=2';
export const LOOKING_FOR_PHOTO = '/brand/who-were-looking-for.png?v=3';
export const WORLD_MAP = '/brand/world-map.png';
export const HOME_GREETING_BACKDROP = '/brand/greece-backdrop.jpg';
export const GERMANY_GREETING_BACKDROP = '/brand/germany-greeting.jpg?v=4';
export const FIELD_HOME_BACKDROP = '/brand/field-home.png?v=sky';
export const JOURNEY_PLANE = '/brand/journey-plane.png?v=4';
export const ISAIAH_FOOTER =
  '…to loose the bands of wickedness, to undo the heavy burdens, and let the oppressed go free… to deal bread for the hungry… Isaiah 58:6-7';

export type ShortTermView = (typeof SHORT_TERM_VIEWS)[number];

export type PortalDestination =
  | { tab: 'home' }
  | { tab: 'volunteer' }
  | { tab: 'application'; step: ShortTermStepId };
