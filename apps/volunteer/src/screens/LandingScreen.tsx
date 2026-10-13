import { SiteFooter } from '../components/SiteFooter';
import { BrandMark } from '../components/BrandMark';
import {
  HOME_HERO_PHOTO,
  HOPE_IN_ACTION,
  HOPE_IN_ACTION_TAGLINE,
} from '../lib/nav';

export function LandingScreen({
  onSignIn,
  onCreateAccount,
}: {
  onSignIn: () => void;
  onCreateAccount: () => void;
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
            Your information is only seen by the i58 team.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onSignIn}
              className="min-h-12 rounded-full bg-navy px-10 text-[15px] font-semibold text-white hover:bg-navy-dark"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onCreateAccount}
              className="min-h-12 rounded-full border border-navy bg-white px-10 text-[15px] font-semibold text-navy hover:bg-crm-indigo-50"
            >
              Create account
            </button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
