/**
 * Interactive Contacts map — Leaflet pins for geocoded mailing addresses.
 */

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { ContactListItem } from '../../types/contact';
import { CONTACT_TAG_LABELS } from '../../types/contact';
import { useContactMapPoints } from '../../hooks/useContactMapPoints';
import { contactTagListPillClass } from '../../utils/contactTagStyles';
import { ensureLeafletDefaultIcons } from './leafletSetup';

ensureLeafletDefaultIcons();

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 3;

function FitBounds({
  positions,
  ready,
}: {
  positions: Array<[number, number]>;
  /** When true (geocoding finished), refit to the full set. */
  ready: boolean;
}) {
  const map = useMap();
  const boundsKey = `${ready ? '1' : '0'}:${positions.length}:${positions[0]?.join(',') ?? ''}:${positions[positions.length - 1]?.join(',') ?? ''}`;

  useEffect(() => {
    if (positions.length === 0) return;
    // Fit as soon as we have pins; refit once when geocoding completes.
    if (!ready && positions.length < 3) {
      // Wait for a few pins before the early fit to avoid jumping on the first result.
      if (positions.length === 1) {
        map.setView(positions[0]!, 10);
      }
      return;
    }
    if (positions.length === 1) {
      map.setView(positions[0]!, 10);
      return;
    }
    map.fitBounds(positions, { padding: [40, 40], maxZoom: 12 });
  }, [map, boundsKey, positions, ready]);

  return null;
}

export default function ContactMapView({
  contacts,
  onSelectContact,
}: {
  contacts: ContactListItem[];
  onSelectContact: (contact: ContactListItem) => void;
}) {
  const {
    points,
    withAddress,
    failedLocate,
    pending,
    geocoding,
    retryFailed,
  } = useContactMapPoints(contacts, true);

  const contactById = useMemo(() => {
    const map = new Map<string, ContactListItem>();
    for (const contact of contacts) {
      map.set(contact.id, contact);
    }
    return map;
  }, [contacts]);

  const positions = useMemo(
    () => points.map((point) => [point.coords.lat, point.coords.lng] as [number, number]),
    [points],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-crm-taupe/15 px-4 py-2 text-xs text-crm-slate">
        <p>
          {points.length} pin{points.length === 1 ? '' : 's'} on the map
          {!geocoding && failedLocate > 0
            ? ` · ${failedLocate} could not locate`
            : ''}
        </p>
        <div className="flex items-center gap-3">
          {geocoding && (
            <p className="font-medium text-crm-heading">
              Locating addresses…{' '}
              {Math.max(0, withAddress - points.length - failedLocate)}/
              {withAddress}
              {pending > 0 ? ` (${pending} unique left)` : ''}
            </p>
          )}
          {!geocoding && failedLocate > 0 && (
            <button
              type="button"
              onClick={retryFailed}
              className="rounded-md border border-crm-taupe/30 px-2 py-1 font-medium text-crm-heading hover:bg-crm-cream/60"
            >
              Retry locate
            </button>
          )}
        </div>
      </div>

      <div className="relative z-0 isolate min-h-0 flex-1 overflow-hidden rounded-b-2xl">
        {withAddress === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-center text-sm text-crm-slate">
            No contacts in this filter have a mailing address to plot.
          </div>
        ) : (
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="z-0 h-full min-h-[320px] w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds positions={positions} ready={!geocoding} />
            {points.map((point) => (
              <Marker
                key={point.contactId}
                position={[point.coords.lat, point.coords.lng]}
              >
                <Popup>
                  <div className="min-w-[160px] space-y-2">
                    <button
                      type="button"
                      className="block text-left text-sm font-semibold text-crm-indigo underline-offset-2 hover:underline"
                      onClick={() => {
                        const contact = contactById.get(point.contactId);
                        if (contact) onSelectContact(contact);
                      }}
                    >
                      {point.name}
                    </button>
                    <div className="flex flex-wrap gap-1">
                      {point.tags.map((tag) => (
                        <span key={tag} className={contactTagListPillClass(tag)}>
                          {CONTACT_TAG_LABELS[tag]}
                        </span>
                      ))}
                    </div>
                    {point.addressLabel ? (
                      <p className="text-xs text-crm-slate">{point.addressLabel}</p>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
