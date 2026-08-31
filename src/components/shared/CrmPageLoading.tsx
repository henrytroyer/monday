/**
 * CrmPageLoading.tsx — Standard i58 Volunteer portal loading for CRM shell / pages.
 * Wraps BrandLoading so every page load shares the same look and copy.
 */

import { BrandLoading, type BrandLoadingVariant } from './BrandLoading/BrandLoading';

const DEFAULT_LABEL = 'i58 Volunteer portal';

export default function CrmPageLoading({
  label = DEFAULT_LABEL,
  variant = 'inline',
  className,
}: {
  /** Visible status under the bar (defaults to Volunteer portal) */
  label?: string;
  variant?: BrandLoadingVariant;
  className?: string;
}) {
  return (
    <BrandLoading
      variant={variant}
      label={label}
      ariaLabel={`Loading ${label}`}
      className={className}
    />
  );
}
