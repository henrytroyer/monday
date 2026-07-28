/**
 * Display labels for outbound email engagement (UI-only until a provider exists).
 */

import type {
  EmailMessage,
  EmailTrackingDisplayStatus,
} from '../types/emailThread';

export function resolveEmailTrackingDisplayStatus(
  message: EmailMessage,
): EmailTrackingDisplayStatus {
  if (message.direction !== 'outbound') {
    return 'tracking_unavailable';
  }
  if (
    message.deliveryStatus === 'failed' ||
    message.deliveryStatus === 'bounced' ||
    message.deliveryStatus === 'rejected'
  ) {
    return 'delivery_failed';
  }
  if (!message.trackingEnabled) {
    return 'tracking_disabled';
  }
  if (message.openCount > 0 || message.firstOpenedAt) {
    return 'opened';
  }
  if (
    message.deliveryStatus === 'delivered' ||
    message.deliveryStatus === 'sent'
  ) {
    return 'delivered_no_open';
  }
  return 'tracking_unavailable';
}

export function emailTrackingStatusLabel(
  status: EmailTrackingDisplayStatus,
): string {
  switch (status) {
    case 'opened':
      return 'Opened';
    case 'delivered_no_open':
      return 'Delivered, no open recorded';
    case 'tracking_unavailable':
      return 'Tracking unavailable';
    case 'tracking_disabled':
      return 'Tracking disabled';
    case 'delivery_failed':
      return 'Delivery failed';
    default:
      return 'Tracking unavailable';
  }
}
