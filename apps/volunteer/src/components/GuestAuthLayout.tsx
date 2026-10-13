import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { SiteFooter } from './SiteFooter';
import {
  HOME_HERO_PHOTO,
  HOPE_IN_ACTION,
  HOPE_IN_ACTION_TAGLINE,
} from '../lib/nav';

export function GuestAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-crm-white">
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="relative h-40 overflow-hidden md:h-auto md:w-1/2">
          <img src={HOME_HERO_PHOTO} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative z-10 hidden h-full flex-col justify-end p-10 md:flex">
            <BrandMark />
            <h1 className="font-display mt-3 text-5xl font-extrabold tracking-tight text-crm-terracotta">
              {HOPE_IN_ACTION}
            </h1>
            <p className="mt-3 text-2xl font-medium text-black">
              {HOPE_IN_ACTION_TAGLINE}
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col bg-white">
          <header className="px-6 py-4 md:px-10">
            <BrandMark />
          </header>
          <main className="flex flex-1 justify-center px-6 py-8 md:px-10 md:py-12">
            <div className="w-full max-w-md">{children}</div>
          </main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
