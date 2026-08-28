/**
 * PhonePreviewShell.tsx — same-document phone frame for CRM mobile preview (dev).
 * Styles: ./mobile-preview.css
 *
 * Activate: http://localhost:4040/?mobilePreview=1
 * Optional page: &page=longterm-applications
 */
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { PageId } from '../../constants/navItems';
import {
  ACCOUNT_NAV_ITEMS,
  COMMUNICATIONS_NAV_ITEMS,
  HISTORY_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
  SETTINGS_NAV_ITEMS,
} from '../../constants/navItems';
import { patchCrmNavigationState } from '../../services/crmNavigationStorage';
import './mobile-preview.css';

export const PHONE_PREVIEW_KEY = 'crm_phone_preview';
const DEVICE_KEY = 'crm_phone_device';

type DevicePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
};

const DEVICES: DevicePreset[] = [
  { id: 'iphone-14', label: 'iPhone 14', width: 390, height: 844 },
  { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667 },
  { id: 'pixel-7', label: 'Pixel 7', width: 412, height: 915 },
];

const PREVIEW_ROUTES: { page: PageId; label: string }[] = [
  ...PRIMARY_NAV_ITEMS.map(([page, label]) => ({ page, label })),
  ...COMMUNICATIONS_NAV_ITEMS.map(([page, label]) => ({ page, label })),
  ...HISTORY_NAV_ITEMS.map(([page, label]) => ({ page, label })),
  ...ACCOUNT_NAV_ITEMS.map(([page, label]) => ({ page, label })),
  ...SETTINGS_NAV_ITEMS.map(([page, label]) => ({ page, label })),
];

const VALID_PAGE_IDS = new Set(PREVIEW_ROUTES.map((r) => r.page));

export function isPhonePreviewActive(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has('mobilePreview') || params.has('phone')) return true;
  return sessionStorage.getItem(PHONE_PREVIEW_KEY) === '1';
}

export function readPreviewPageFromUrl(): PageId | null {
  if (typeof window === 'undefined') return null;
  const page = new URLSearchParams(window.location.search).get('page');
  if (page && VALID_PAGE_IDS.has(page as PageId)) return page as PageId;
  return null;
}

function enablePreview(): void {
  sessionStorage.setItem(PHONE_PREVIEW_KEY, '1');
  document.body.classList.add('is-phone-preview');
}

export function disablePhonePreview(): void {
  sessionStorage.removeItem(PHONE_PREVIEW_KEY);
  document.body.classList.remove('is-phone-preview');
  const url = new URL(window.location.href);
  url.searchParams.delete('mobilePreview');
  url.searchParams.delete('phone');
  url.searchParams.delete('page');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

function navigatePreviewPage(page: PageId): void {
  patchCrmNavigationState({ activePage: page });
  const url = new URL(window.location.href);
  url.searchParams.set('mobilePreview', '1');
  url.searchParams.set('page', page);
  window.history.replaceState({}, '', url.toString());
  window.dispatchEvent(
    new CustomEvent('crm-preview-navigate', { detail: { page } }),
  );
}

export default function PhonePreviewShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(() => isPhonePreviewActive());
  const [deviceId, setDeviceId] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DEVICE_KEY);
      if (saved && DEVICES.some((d) => d.id === saved)) return saved;
    } catch {
      // ignore
    }
    return DEVICES[0].id;
  });
  const [activePage, setActivePage] = useState<PageId>(
    () => readPreviewPageFromUrl() ?? 'longterm-applications',
  );

  const device = useMemo(
    () => DEVICES.find((d) => d.id === deviceId) ?? DEVICES[0],
    [deviceId],
  );

  useEffect(() => {
    const nextActive = isPhonePreviewActive();
    if (nextActive) enablePreview();
    else document.body.classList.remove('is-phone-preview');
    setActive(nextActive);

    const fromUrl = readPreviewPageFromUrl();
    if (fromUrl) {
      setActivePage(fromUrl);
      patchCrmNavigationState({ activePage: fromUrl });
      window.dispatchEvent(
        new CustomEvent('crm-preview-navigate', { detail: { page: fromUrl } }),
      );
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'd' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        exitPreview();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  function goTo(page: PageId) {
    setActivePage(page);
    navigatePreviewPage(page);
  }

  function exitPreview() {
    disablePhonePreview();
    setActive(false);
  }

  function reload() {
    window.location.reload();
  }

  if (!active) return <>{children}</>;

  return (
    <div className="mobile-preview">
      <aside className="mobile-preview-panel" data-preview-chrome="true">
        <p className="mobile-preview-kicker">Dev tool</p>
        <h1>Mobile preview</h1>
        <p className="mobile-preview-help">
          Real CRM inside the phone — check onboarding on a narrow screen. Toggle
          with <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>.
        </p>

        <label className="mobile-preview-label" htmlFor="crm-device">
          Device
        </label>
        <select
          id="crm-device"
          value={deviceId}
          onChange={(e) => {
            setDeviceId(e.target.value);
            sessionStorage.setItem(DEVICE_KEY, e.target.value);
          }}
        >
          {DEVICES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} ({d.width}×{d.height})
            </option>
          ))}
        </select>

        <p className="mobile-preview-label">Page</p>
        <div
          className="mobile-preview-routes"
          role="group"
          aria-label="Preview pages"
        >
          {PREVIEW_ROUTES.map((r) => (
            <button
              key={r.page}
              type="button"
              className={activePage === r.page ? 'is-active' : ''}
              onClick={() => goTo(r.page)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mobile-preview-actions">
          <button type="button" onClick={reload}>
            Reload
          </button>
          <button type="button" onClick={exitPreview}>
            Exit phone view
          </button>
        </div>

        <p className="mobile-preview-meta">
          Showing <code>{activePage}</code> at {device.width}×{device.height}
        </p>
        <p className="mobile-preview-meta">
          Open again:{' '}
          <code>?mobilePreview=1&amp;page=longterm-applications</code>
        </p>
      </aside>

      <div className="mobile-preview-stage">
        <div
          className="mobile-preview-phone"
          style={
            {
              '--phone-w': `${device.width}px`,
              '--phone-h': `${device.height}px`,
            } as CSSProperties
          }
        >
          <div className="mobile-preview-notch" aria-hidden />
          <div className="mobile-preview-screen">{children}</div>
        </div>
      </div>
    </div>
  );
}
