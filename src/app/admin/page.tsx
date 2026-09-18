import { redirect } from 'next/navigation';

/** La entrada del admin es la lista de eventos. */
export default function AdminHome() {
  redirect('/admin/events');
}
