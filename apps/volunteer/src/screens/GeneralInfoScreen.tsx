import {
  GENERAL_INFO_SECTION_LABEL,
  type GeneralInfoSectionId,
} from '../lib/nav';
import { GaliniRulesScreen } from './GaliniRulesScreen';
import { OrgChartScreen } from './OrgChartScreen';
import { OrientationInfoScreen } from './OrientationInfoScreen';
import { PracticalInfoScreen } from './PracticalInfoScreen';
import { LOCAL_GUIDANCE_NOTE } from '../lib/journey';

const LOCAL_SECTIONS = new Set<GeneralInfoSectionId>(['orientation', 'practical', 'galini']);

export function GeneralInfoScreen({
  section,
  showLocalPages,
}: {
  section: GeneralInfoSectionId;
  showLocalPages: boolean;
}) {
  if (!showLocalPages && LOCAL_SECTIONS.has(section)) {
    return (
      <div>
        <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
          {GENERAL_INFO_SECTION_LABEL[section]}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-navy">{LOCAL_GUIDANCE_NOTE}</p>
      </div>
    );
  }
  if (section === 'orientation') return <OrientationInfoScreen />;
  if (section === 'practical') return <PracticalInfoScreen />;
  if (section === 'galini') return <GaliniRulesScreen />;
  if (section === 'orgChart') return <OrgChartScreen />;

  return (
    <div>
      <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
        {GENERAL_INFO_SECTION_LABEL[section]}
      </h1>
    </div>
  );
}
