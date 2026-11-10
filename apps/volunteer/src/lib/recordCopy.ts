import type { MyInfoFlightLeg, MyInfoFlights } from './myInfo';
import { downloadPdfFile, printHtmlDocument } from './preparationDocumentPdf';

export type ItineraryDirection = {
  title: string;
  legs: MyInfoFlightLeg[];
};

export function itineraryDirections(flights: MyInfoFlights): ItineraryDirection[] {
  const groups: ItineraryDirection[] = [];
  for (const leg of flights.legs) {
    const current = groups.at(-1);
    if (current && current.title === leg.direction) current.legs.push(leg);
    else groups.push({ title: leg.direction, legs: [leg] });
  }
  return groups;
}

export function itineraryLines(flights: MyInfoFlights): string[] {
  const lines = [
    'Itinerary',
    `Passenger: ${flights.passenger}`,
    `Record locator: ${flights.recordLocator}`,
  ];
  for (const direction of itineraryDirections(flights)) {
    lines.push(direction.title);
    for (const leg of direction.legs) {
      lines.push(`${leg.airline} ${leg.flight}`);
      lines.push(leg.date);
      lines.push(
        `${leg.fromCity} (${leg.fromCode}) ${leg.departs} to ${leg.toCity} (${leg.toCode}) ${leg.arrives}`,
      );
    }
  }
  return lines;
}

export function itineraryPrintHtml(flights: MyInfoFlights): string {
  const directions = itineraryDirections(flights)
    .map((direction) => {
      const legs = direction.legs
        .map(
          (leg) => `<p style="margin:14px 0 0;font-size:16px;font-weight:700">${escapeHtml(`${leg.airline} ${leg.flight}`)}</p>
            <p style="margin:2px 0 0">${escapeHtml(leg.date)}</p>
            <p style="margin:2px 0 0">${escapeHtml(`${leg.fromCity} (${leg.fromCode}) ${leg.departs}`)} to ${escapeHtml(`${leg.toCity} (${leg.toCode}) ${leg.arrives}`)}</p>`,
        )
        .join('');
      return `<h2 style="margin:28px 0 0;font-size:14px;letter-spacing:0.12em;text-transform:uppercase">${escapeHtml(direction.title)}</h2>${legs}`;
    })
    .join('');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Itinerary</title>
<style>
  @page { margin: 0.6in; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1b365d; }
</style>
</head>
<body>
  <p style="margin:0;letter-spacing:0.28em;font-size:12px;font-weight:700">i58</p>
  <h1 style="margin:12px 0 0;font-size:28px">Itinerary</h1>
  <p style="margin:18px 0 0;font-size:18px;font-weight:700">${escapeHtml(flights.passenger)}</p>
  <p style="margin:4px 0 0">Record locator: ${escapeHtml(flights.recordLocator)}</p>
  ${directions}
</body>
</html>`;
}

export function passportPrintHtml(src: string, number: string, expiration: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Passport</title>
<style>
  @page { margin: 0.6in; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1b365d; }
  img { width: 100%; height: auto; }
</style>
</head>
<body>
  <img src="${escapeHtml(src)}" alt="Passport" />
  <p style="margin:18px 0 0">Passport number: ${escapeHtml(number)}</p>
  <p style="margin:6px 0 0">Expiration: ${escapeHtml(expiration)}</p>
</body>
</html>`;
}

export function downloadItinerary(flights: MyInfoFlights): void {
  downloadPdfFile('itinerary.pdf', itineraryLines(flights));
}

export function printItinerary(flights: MyInfoFlights): void {
  printHtmlDocument(itineraryPrintHtml(flights));
}

export function downloadPassportImage(src: string): void {
  const link = document.createElement('a');
  link.href = src;
  link.download = 'passport.png';
  link.click();
}

export function printPassport(src: string, number: string, expiration: string): void {
  const absolute = new URL(src, window.location.href).href;
  printHtmlDocument(passportPrintHtml(absolute, number, expiration));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
