import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zonedToInstant, formatDate, formatTime, formatInstantDate, buildIcs, googleCalendarUrl } from '@/lib/dates';

test('las 5 de la tarde en Tepoztlán son las 23:00 UTC', () => {
  // México ya no tiene horario de verano: UTC-6 todo el año.
  const d = zonedToInstant('2027-03-13T17:00', 'America/Mexico_City');
  assert.equal(d.toISOString(), '2027-03-13T23:00:00.000Z');
});

test('aguanta el cambio de horario de verano en Canadá', () => {
  // Toronto adelanta el reloj el 14 de marzo de 2027 a las 2am.
  const antes = zonedToInstant('2027-03-13T17:00', 'America/Toronto'); // EST, UTC-5
  const despues = zonedToInstant('2027-03-15T17:00', 'America/Toronto'); // EDT, UTC-4
  assert.equal(antes.toISOString(), '2027-03-13T22:00:00.000Z');
  assert.equal(despues.toISOString(), '2027-03-15T21:00:00.000Z');
});

test('la misma hora se ve igual desde cualquier parte del mundo', () => {
  const original = process.env.TZ;
  const vistas = new Set<string>();

  for (const tz of ['America/Mexico_City', 'America/Toronto', 'Asia/Tokyo', 'UTC']) {
    process.env.TZ = tz;
    vistas.add(formatTime('2027-03-13T17:00', 'America/Mexico_City', 'es'));
  }

  process.env.TZ = original;
  assert.equal(vistas.size, 1, `Se vio distinto segun el celular: ${[...vistas].join(' / ')}`);
});

test('la fecha se escribe según el idioma', () => {
  const es = formatDate('2027-03-13T17:00', 'America/Mexico_City', 'es');
  const en = formatDate('2027-03-13T17:00', 'America/Mexico_City', 'en');
  assert.match(es, /sábado/i);
  assert.match(es, /marzo/i);
  assert.match(en, /Saturday/);
  assert.match(en, /March/);
});

test('el .ics lleva la hora correcta y el formato que piden los calendarios', () => {
  const ics = buildIcs({
    title: 'Boda de Ana Sofía y Luis Alberto',
    startsAt: '2027-03-13T17:00',
    timeZone: 'America/Mexico_City',
    location: 'Hacienda Santa Elena',
    uid: 'demo@holaboda',
  });

  assert.match(ics, /DTSTART:20270313T230000Z/);
  assert.match(ics, /DTEND:20270314T040000Z/); // 5 horas por defecto
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /END:VCALENDAR/);
  assert.ok(ics.includes('\r\n'), 'el .ics necesita saltos de linea CRLF');
});

test('el .ics escapa las comas, que si no rompen el archivo', () => {
  const ics = buildIcs({
    title: 'Boda',
    startsAt: '2027-03-13T17:00',
    timeZone: 'America/Mexico_City',
    location: 'Camino a Santo Domingo 45, Tepoztlán, Morelos',
    uid: 'x@holaboda',
  });
  assert.match(ics, /LOCATION:Camino a Santo Domingo 45\\, Tepoztlán\\, Morelos/);
});

test('el link de Google Calendar lleva inicio y fin', () => {
  const url = googleCalendarUrl({
    title: 'Boda',
    startsAt: '2027-03-13T17:00',
    timeZone: 'America/Mexico_City',
    uid: 'x@holaboda',
  });
  assert.match(url, /dates=20270313T230000Z%2F20270314T040000Z/);
});

test('una fecha mal escrita truena en vez de inventar una hora', () => {
  assert.throws(() => zonedToInstant('13/03/2027 17:00', 'America/Mexico_City'));
});

test('la fecha límite a las 23:59 de México se lee como el día 13, no el 14', () => {
  // En UTC ya es 14 de febrero a las 05:59. El invitado debe leer 13.
  const es = formatInstantDate('2027-02-13T23:59:59-06:00', 'America/Mexico_City', 'es');
  const en = formatInstantDate('2027-02-13T23:59:59-06:00', 'America/Mexico_City', 'en');
  assert.match(es, /13 de febrero/);
  assert.match(en, /February 13/);
});
