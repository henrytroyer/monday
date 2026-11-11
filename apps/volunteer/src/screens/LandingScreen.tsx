import { SiteFooter } from '../components/SiteFooter';
import { BrandMark } from '../components/BrandMark';
import {
  HOME_HERO_PHOTO,
  HOPE_IN_ACTION,
  HOPE_IN_ACTION_TAGLINE,
} from '../lib/nav';

export function LandingScreen({
  onContinueWithGoogle,
  onMockSignIn,
  onMockCreateAccount,
  pending = false,
  error = null,
  configured = true,
}: {
  onContinueWithGoogle: () => void;
  onMockSignIn: () => void;
  onMockCreateAccount: () => void;
  pending?: boolean;
  error?: string | null;
  configured?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <section className="relative flex min-h-dvh flex-1 flex-col md:flex-row">
        <div className="absolute left-5 top-5 z-20 mix-blend-multiply sm:left-8 sm:top-6">
          <BrandMark />
        </div>
        <div className="relative h-52 overflow-hidden md:h-auto md:w-1/2">
          <img
            src={HOME_HERO_PHOTO}
            alt=""
            className="absolute inset-0 h-full w-full origin-[60%_58%] scale-[1.28] object-cover object-[60%_58%]"
          />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 text-center md:px-12">
          <h1 className="font-display max-w-xl text-5xl font-extrabold tracking-tight text-crm-terracotta sm:text-6xl">
            {HOPE_IN_ACTION}
          </h1>
          <p className="mt-4 max-w-lg text-2xl font-medium text-black">
            {HOPE_IN_ACTION_TAGLINE}
          </p>
          {configured ? (
            <>
              <p className="mt-3 max-w-xl text-xs text-crm-slate">
                Use the Google account for the email we should keep on your contact
                record. Your information is only seen by the i58 team.
              </p>
              <div className="mt-10">
                <button
                  type="button"
                  onClick={onContinueWithGoogle}
                  disabled={pending}
                  className="min-h-12 shrink-0 whitespace-nowrap rounded-full bg-navy px-10 text-[15px] font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
                >
                  {pending ? 'Opening Google…' : 'Continue with Google'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={onMockSignIn}
                  className="min-h-12 shrink-0 whitespace-nowrap rounded-full bg-navy px-10 text-[15px] font-semibold text-white hover:bg-navy-dark"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={onMockCreateAccount}
                  className="min-h-12 shrink-0 whitespace-nowrap rounded-full border border-navy bg-white px-10 text-[15px] font-semibold text-navy hover:bg-crm-indigo-50"
                >
                  Create account
                </button>
              </div>
              <p className="mt-4 max-w-xl text-xs text-crm-slate">
                Your information is only seen by the i58 team.
              </p>
              <p className="mt-4 max-w-xl text-center text-xs text-crm-slate">
                Preview sign-in. Google sign-in replaces this once it is configured.
              </p>
            </>
          )}
          {error ? (
            <p role="alert" className="mt-4 max-w-xl text-center text-sm text-crm-terracotta">
              {error}
            </p>
          ) : null}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
