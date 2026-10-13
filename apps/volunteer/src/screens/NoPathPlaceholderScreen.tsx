import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  NO_PATH_PLACEHOLDER_BODY,
  NO_PATH_PLACEHOLDER_TITLE,
} from '../process/gettingStarted';

export function NoPathPlaceholderScreen({ onBack }: { onBack: () => void }) {
  return (
    <FormCard>
      <BackButton onClick={onBack} />
      <h1 className="text-center text-xl font-semibold tracking-tight text-navy">
        {NO_PATH_PLACEHOLDER_TITLE}
      </h1>
      <p className="mt-3 text-center text-sm leading-relaxed text-crm-slate">
        {NO_PATH_PLACEHOLDER_BODY}
      </p>
    </FormCard>
  );
}
