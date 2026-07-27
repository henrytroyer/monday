/**
 * Resolve map pins for filtered contacts from full mailing addresses.
 * Geocodes street + city/region only — never city-centroid fallbacks.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContactListItem, ContactTag } from '../types/contact';
import {
  addressQueryFromDemographics,
  buildGeocodeQueries,
  geocodeAddressSync,
  geocodeAddressesBatched,
  type GeocodeCoords,
  type GeocodeRequest,
} from '../services/geocodeAddress';
import { clearGeocodeFailures } from '../services/geocodeCache';

export interface ContactMapPoint {
  contactId: string;
  name: string;
  tags: ContactTag[];
  addressLabel: string;
  coords: GeocodeCoords;
}

export interface ContactMapPointsState {
  points: ContactMapPoint[];
  withAddress: number;
  withoutAddress: number;
  failedLocate: number;
  pending: number;
  geocoding: boolean;
  /** Clear cached misses and re-run geocoding for unresolved addresses. */
  retryFailed: () => void;
}

interface AddressableContact {
  contact: ContactListItem;
  address: string;
  request: GeocodeRequest;
}

function contactsMapSignature(contacts: ContactListItem[]): string {
  return contacts
    .map((contact) => {
      const address = addressQueryFromDemographics(contact.demographics) ?? '';
      return `${contact.id}\t${contact.name}\t${contact.tags.join(',')}\t${address}`;
    })
    .join('\n');
}

function collectAddressable(contacts: ContactListItem[]): {
  addressable: AddressableContact[];
  withoutAddress: number;
} {
  const addressable: AddressableContact[] = [];
  let withoutAddress = 0;

  for (const contact of contacts) {
    const address = addressQueryFromDemographics(contact.demographics);
    if (!address) {
      withoutAddress += 1;
      continue;
    }
    addressable.push({
      contact,
      address,
      request: {
        key: address,
        queries: buildGeocodeQueries(contact.demographics),
      },
    });
  }

  return { addressable, withoutAddress };
}

export function useContactMapPoints(
  contacts: ContactListItem[],
  enabled: boolean,
): ContactMapPointsState {
  const [points, setPoints] = useState<ContactMapPoint[]>([]);
  const [pending, setPending] = useState(0);
  const [withAddress, setWithAddress] = useState(0);
  const [withoutAddress, setWithoutAddress] = useState(0);
  const [failedLocate, setFailedLocate] = useState(0);
  const [retryToken, setRetryToken] = useState(0);

  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  const signature = useMemo(
    () => contactsMapSignature(contacts),
    [contacts],
  );

  useEffect(() => {
    if (!enabled) {
      setPoints([]);
      setPending(0);
      setWithAddress(0);
      setWithoutAddress(0);
      setFailedLocate(0);
      return;
    }

    const { addressable, withoutAddress: missing } = collectAddressable(
      contactsRef.current,
    );

    setWithAddress(addressable.length);
    setWithoutAddress(missing);

    if (addressable.length === 0) {
      setPoints([]);
      setPending(0);
      setFailedLocate(0);
      return;
    }

    const addressCoords = new Map<string, GeocodeCoords | null>();
    const pendingRequests: GeocodeRequest[] = [];
    const pendingKeys = new Set<string>();

    for (const entry of addressable) {
      if (addressCoords.has(entry.address)) continue;
      const sync = geocodeAddressSync(entry.address);
      if (sync !== undefined) {
        addressCoords.set(entry.address, sync);
      } else if (!pendingKeys.has(entry.address)) {
        pendingKeys.add(entry.address);
        pendingRequests.push(entry.request);
      }
    }

    const buildPoints = () => {
      const next: ContactMapPoint[] = [];
      let failed = 0;
      for (const entry of addressable) {
        const coords = addressCoords.get(entry.address);
        if (coords === undefined) continue;
        if (!coords) {
          failed += 1;
          continue;
        }
        next.push({
          contactId: entry.contact.id,
          name: entry.contact.name,
          tags: entry.contact.tags,
          addressLabel: entry.address,
          coords,
        });
      }
      return { next, failed };
    };

    const painted = buildPoints();
    setPoints(painted.next);
    setFailedLocate(painted.failed);
    setPending(pendingRequests.length);

    if (pendingRequests.length === 0) {
      return;
    }

    const signal = { cancelled: false };
    let pendingLeft = pendingRequests.length;
    let rafId = 0;

    const flush = () => {
      rafId = 0;
      if (signal.cancelled) return;
      const built = buildPoints();
      setPoints(built.next);
      setFailedLocate(built.failed);
      setPending(pendingLeft);
    };

    const scheduleFlush = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(flush);
    };

    void geocodeAddressesBatched(
      pendingRequests,
      (address, coords) => {
        if (signal.cancelled) return;
        addressCoords.set(address, coords);
        pendingLeft = Math.max(0, pendingLeft - 1);
        scheduleFlush();
      },
      { signal },
    ).then(() => {
      if (signal.cancelled) return;
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      const built = buildPoints();
      setPoints(built.next);
      setFailedLocate(built.failed);
      setPending(0);
    });

    return () => {
      signal.cancelled = true;
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [enabled, signature, retryToken]);

  return {
    points,
    withAddress,
    withoutAddress,
    failedLocate,
    pending,
    geocoding: enabled && pending > 0,
    retryFailed: () => {
      clearGeocodeFailures();
      setRetryToken((token) => token + 1);
    },
  };
}
