import type { VehicleReservation } from '../contract/volunteerApi';

export type VehicleReservationDraft = {
  volunteerId: string;
  volunteerName: string;
  vehicleId: string;
  lengthId: string;
  date: string;
  slotId: string;
  startLabel: string;
  endLabel: string;
};

/** One reservation per volunteer, vehicle, and length. The newest click replaces the earlier one. */
export function saveVehicleReservation(
  existing: readonly VehicleReservation[] | undefined,
  next: VehicleReservation,
): VehicleReservation[] {
  const rest = (existing ?? []).filter(
    (item) =>
      !(
        item.volunteerId === next.volunteerId &&
        item.vehicleId === next.vehicleId &&
        item.lengthId === next.lengthId
      ),
  );
  return [...rest, next];
}

export function buildVehicleReservation(
  draft: VehicleReservationDraft,
  now = new Date(),
): VehicleReservation {
  return {
    id: `vehicle-${draft.volunteerId}-${draft.vehicleId}-${draft.lengthId}-${draft.date}-${draft.slotId}`,
    volunteerId: draft.volunteerId,
    volunteerName: draft.volunteerName,
    vehicleId: draft.vehicleId,
    lengthId: draft.lengthId,
    date: draft.date,
    slotId: draft.slotId,
    startLabel: draft.startLabel,
    endLabel: draft.endLabel,
    submittedAt: now.toISOString(),
  };
}

export function reservationMatchesPick(
  reservation: VehicleReservation,
  pick: { volunteerId: string; vehicleId: string; lengthId: string; date: string; slotId: string },
): boolean {
  return (
    reservation.volunteerId === pick.volunteerId &&
    reservation.vehicleId === pick.vehicleId &&
    reservation.lengthId === pick.lengthId &&
    reservation.date === pick.date &&
    reservation.slotId === pick.slotId
  );
}
