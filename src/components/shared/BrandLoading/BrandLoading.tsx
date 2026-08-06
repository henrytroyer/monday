/**
 * BrandLoading.tsx — Full-page / section loading UI: animated i58 logo draw + progress bar.
 * Ported from i58 Finance BrandLoading. Logo + indeterminate bar share one loop.
 * Keep button-level Spinner for tiny inline waits.
 */

import type { FC } from 'react';
import logoSvg from '../../../assets/brand/i58-logo-draw.svg?raw';
import styles from './BrandLoading.module.css';

export type BrandLoadingVariant = 'fullscreen' | 'inline' | 'overlay';

export interface BrandLoadingProps {
  /** Layout variant */
  variant?: BrandLoadingVariant;
  /** Optional determinate progress 0–1; omit for indeterminate bar */
  progress?: number;
  /** Visible status text under the bar */
  label?: string;
  /** Accessible status label */
  ariaLabel?: string;
  className?: string;
}

export const BrandLoading: FC<BrandLoadingProps> = ({
  variant = 'inline',
  progress,
  label,
  ariaLabel = 'Loading',
  className = '',
}) => {
  const determinate =
    typeof progress === 'number' && Number.isFinite(progress);
  const pct = determinate
    ? Math.min(100, Math.max(0, progress * 100))
    : undefined;

  const rootClass = [styles.root, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? Math.round(pct!) : undefined}
    >
      <div
        className={styles.logoWrap}
        // Animations live inside the SVG <style>; raw inject preserves them.
        dangerouslySetInnerHTML={{ __html: logoSvg }}
      />
      <div className={styles.barTrack}>
        {determinate ? (
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        ) : (
          <div className={`${styles.barFill} ${styles.barIndeterminate}`} />
        )}
      </div>
      {label ? <p className={styles.label}>{label}</p> : null}
      <span className={styles.srOnly}>{ariaLabel}</span>
    </div>
  );
};

export default BrandLoading;
