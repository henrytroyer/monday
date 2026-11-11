import {
  GENERAL_INFO_SECTION_LABEL,
  type GeneralInfoSectionId,
} from '../lib/nav';
import { GaliniRulesScreen } from './GaliniRulesScreen';
import { OrgChartScreen } from './OrgChartScreen';
import { OrientationInfoScreen } from './OrientationInfoScreen';
import { PracticalInfoScreen } from './PracticalInfoScreen';

export function GeneralInfoScreen({ section }: { section: GeneralInfoSectionId }) {
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
