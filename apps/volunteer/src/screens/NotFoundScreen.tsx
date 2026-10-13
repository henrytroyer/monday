import { BackButton } from '../components/BackButton';
import { GuestAuthLayout } from '../components/GuestAuthLayout';

export function NotFoundScreen({
  email,
  onCreateAccount,
  onBack,
}: {
  email: string;
  onCreateAccount: () => void;
  onBack: () => void;
}) {
  return (
    <GuestAuthLayout>
      <BackButton onClick={onBack} />
      <h1 className="text-3xl font-semibold tracking-tight text-navy">
        No account yet
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-crm-slate">
        We do not have an account for{' '}
        <span className="font-medium text-navy">{email}</span>.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={onCreateAccount}
          className="min-h-11 rounded-md bg-navy px-4 text-base font-semibold text-white hover:bg-navy-dark"
        >
          Create account
        </button>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-md border border-navy/20 bg-white px-4 text-base font-medium text-navy hover:bg-crm-indigo-50"
        >
          Try a different email
        </button>
      </div>
    </GuestAuthLayout>
  );
}
