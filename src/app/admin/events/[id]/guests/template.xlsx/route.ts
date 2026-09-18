import { requireRole } from '@/lib/auth';

/** La plantilla que se descarga, con encabezados en español y dos filas de ejemplo. */
export async function GET() {
  await requireRole('admin', 'staff');
  const XLSX = await import('xlsx');

  const rows = [
    ['Nombre', 'Pases', 'Telefono', 'Correo', 'Idioma', 'Grupo', 'Mesa'],
    ['Familia López Ramírez', 4, '55 1234 5678', 'lopez@ejemplo.com', 'es', 'Familia novia', '3'],
    ['The Miller Family', 2, '(415) 867-5309', 'millers@example.com', 'en', 'Friends', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 7 }, { wch: 16 }, { wch: 24 }, { wch: 8 }, { wch: 16 }, { wch: 6 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invitados');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-invitados.xlsx"',
    },
  });
}
