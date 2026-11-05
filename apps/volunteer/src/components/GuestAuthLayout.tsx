import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { SiteFooter } from './SiteFooter';
import { HOME_HERO_PHOTO } from '../lib/nav';

export function GuestAuthLayout({ children }: { children: ReactNode }) {
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
            className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
          />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 md:px-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
