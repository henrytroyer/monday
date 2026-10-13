import type { VolunteerGuidelines } from '../contract/volunteerApi';

export const GUIDELINES_BANNER = 'Guidelines';
export const PERSONAL_CONDUCT_HEADING = 'Personal Conduct';
export const DRESS_CODE_HEADING = 'Dress Code';
export const DRESS_CODE_LADIES_HEADING = 'Ladies:';
export const DRESS_CODE_MEN_HEADING = 'Men:';
export const DRESS_CODE_GENERAL_HEADING = 'General Conduct';
export const AGREEMENT_SECTION = 'Agreement';
export const AGREEMENT_LABEL =
  'By Toggling, I agree to the i58Global Guidelines and Rules of Conduct';
export const AGREEMENT_NOTE =
  'Those in leadership roles may need to address specific issues with individual volunteers. Please receive their guidance respectfully and cooperate graciously; any of the i58 administrators reserve the right to terminate your service if their instructions or these guidelines are disregarded';

export const PERSONAL_CONDUCT_BULLETS = [
  "For the greatest impact among displaced people groups, maintaining spiritual, emotional, and physical well-being is paramount. A committed relationship with God, the ultimate source of life, is essential for each individual's well-being.",
  'We expect you to walk in the authority of Christ and under the guidance of your parents, local church, and i58 leadership. Our aim is team unity and cohesion over individual interests. No one individual can accomplish as much as all of us working together.',
  'Safety protocols are in place for your benefit. Compliance with all written and verbal instructions from i58 leadership is required, regardless of your level of understanding or agreement with them.',
  'Maximize your time for ministry, avoiding a vacation mindset or "volun-tourism." Be prepared to work hard, embrace long days, and handle any tasks necessary.',
  "Our volunteer teams are diverse in background and culture; please respect each team member's differing convictions. Serving in the field is not the time to exercise or flaunt personal liberties in areas such as music, movies, or dress.",
  'Use your "time off" intentionally, avoiding unproductive activities like excessive movie watching or meaningless digital screen time. Instead, we encourage you to engage in meaningful conversations, personal and spiritual development, and restful activities for your body, mind, and soul.',
] as const;

export const DRESS_CODE_LADIES_BULLETS = [
  'Ladies should wear their hair up neatly under headship veiling, as per 1 Corinthians 11',
  'Ensure coverage to the ankle when around refugees (e.g., in camp and at the Oasis)',
  'Respect the Middle Eastern culture by prioritizing the comfort of others over personal comfort. Outside of these situations, skirts or dresses should be mid-calf length or long enough to cover the knees when sitting',
] as const;

export const DRESS_CODE_MEN_BULLETS = [
  'Men should refrain from having long hair',
  'Refrain from wearing shorts or sleeveless garments (except when swimming)',
  'We encourage sensitivity towards refugees in the type of clothing worn while working in the camp.',
  'Avoid expensive name-brand clothing or garments with prominent branding to better relate to displaced peoples and avoid status symbols',
] as const;

export const DRESS_CODE_BRACELET_NOTE =
  'Bracelets may be gifted to volunteers by refugees. While space is given to wear them out of respect for the giver, it is expected that each volunteer strictly adheres to the guidelines of their parents and home church regarding jewelry and/or bracelets';

export const DRESS_CODE_GENERAL_BULLETS = [
  'No use of tobacco, drugs, alcoholic beverages, or foul language',
  'No romantic relationships during your time with i58. If you plan to serve with your significant other, ensure that your trip is approved by your parents or church authorities and the i58 board',
  'Full attention is expected on the work at hand, and if an exception is granted, a hands-off policy must be maintained in the field',
] as const;

export const THANK_YOU_TITLE = 'Thank you!';
export const THANK_YOU_SUBTITLE = 'Your application has been sent.';
export const THANK_YOU_WAIT =
  'Please allow several weeks for us to get back to you.';
export const THANK_YOU_CONTACT_LEAD =
  'If you have any questions in the mean time. Please email';
export const THANK_YOU_EMAIL = 'info@i58greece.org';
export const THANK_YOU_PHONE = '717-314-8425';
export const THANK_YOU_CONTACT_END = 'Thank you';
export const COPY_HEADING = 'Copy of Application';
export const COPY_HINT =
  'Would you like a copy of your application? Send yourself a copy here.';
export const COPY_EMAIL_PLACEHOLDER = 'you@company.com';
export const COPY_SEND_LABEL = 'Send';
export const COPY_SENT_MESSAGE = 'Copy sent.';

export const emptyGuidelines = (): VolunteerGuidelines => ({
  agreed: false,
});

export function isGuidelinesComplete(draft: VolunteerGuidelines): boolean {
  return draft.agreed === true;
}

export function isCopyEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
