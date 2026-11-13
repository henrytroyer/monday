import type { CSSProperties } from 'react';
import { CORE_VALUES_WASH } from '../lib/visionValues';

/** Height of the torn edge shared with the core-values wash. */
export const TORN_WASH_BAND = '4.25rem';

/** Watercolor wash without the torn edge. */
export const washStyle: CSSProperties = {
  backgroundImage: `url(${CORE_VALUES_WASH})`,
};

/**
 * Torn-paper edge with the watercolor wash continuing through the filled area.
 * The band above the section shows through the ragged top.
 */
export const tornWashStyle: CSSProperties = {
  ...washStyle,
  maskImage: `url(/brand/core-values-wave-mask.svg), linear-gradient(#000 0 0)`,
  WebkitMaskImage: `url(/brand/core-values-wave-mask.svg), linear-gradient(#000 0 0)`,
  maskSize: `100% ${TORN_WASH_BAND}, 100% calc(100% - ${TORN_WASH_BAND} + 2px)`,
  WebkitMaskSize: `100% ${TORN_WASH_BAND}, 100% calc(100% - ${TORN_WASH_BAND} + 2px)`,
  maskPosition: 'top, bottom',
  WebkitMaskPosition: 'top, bottom',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskComposite: 'add',
  WebkitMaskComposite: 'source-over',
};

export const tornWashClassName = 'bg-[#f7f7f7] bg-[length:100%_100%] bg-center bg-no-repeat';
