import {
  GENERAL_INFO_SECTION_LABEL,
  type GeneralInfoSectionId,
} from '../lib/nav';

export function GeneralInfoScreen({ section }: { section: GeneralInfoSectionId }) {
  return (
    <div>
      <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
        {GENERAL_INFO_SECTION_LABEL[section]}
      </h1>
    </div>
  );
}
