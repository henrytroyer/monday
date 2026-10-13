import { SiteFooter } from '../components/SiteFooter';
import { BrandMark } from '../components/BrandMark';
import {
  HOME_HERO_PHOTO,
  HOPE_IN_ACTION,
  HOPE_IN_ACTION_TAGLINE,
} from '../lib/nav';

export function LandingScreen({
  onContinueWithGoogle,
  pending = false,
  error = null,
  configured = true,
}: {
  onContinueWithGoogle: () => void;
  pending?: boolean;
  error?: string | null;
  configured?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <section className="relative flex min-h-dvh flex-1 flex-col md:flex-row">
        <div className="relative h-52 overflow-hidden md:h-auto md:w-1/2">
          <img src={HOME_HERO_PHOTO} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_42%]" />
        </div>
        <div className="flex flex-1 flex-col justify-center bg-white px-6 py-10 md:px-12">
          <BrandMark />
          <h1 className="font-display mt-3 max-w-xl text-5xl font-extrabold tracking-tight text-crm-terracotta sm:text-6xl">
            {HOPE_IN_ACTION}
          </h1>
          <p className="mt-4 max-w-lg text-2xl font-medium text-black">
            {HOPE_IN_ACTION_TAGLINE}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-navy/80">
            Sign in to track your short-term application, review your steps, and
            open the forms you still need.
          </p>
          <p className="mt-3 text-xs text-crm-slate">
            Use the Google account for the email we should keep on your contact
            record. Your information is only seen by the i58 team.
          </p>
          {configured ? (
            <div className="mt-10">
              <button
                type="button"
                onClick={onContinueWithGoogle}
                disabled={pending}
                className="min-h-12 rounded-full bg-navy px-10 text-[15px] font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
              >
                {pending ? 'Opening Google…' : 'Continue with Google'}
              </button>
            </div>
          ) : (
            <p role="alert" className="mt-10 max-w-xl text-sm text-crm-terracotta">
              Google sign-in is not configured. Add the i58-finance Firebase web
              config to apps/volunteer/.env and restart the dev server.
            </p>
          )}
          {error ? (
            <p role="alert" className="mt-4 max-w-xl text-sm text-crm-terracotta">
              {error}
            </p>
          ) : null}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
