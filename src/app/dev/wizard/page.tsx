import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { WizardDemo } from './WizardDemo';

export const dynamic = 'force-dynamic';

/** Los pasos del wizard con datos de mentira. No existe en producción. */
export default async function DevWizard({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { paso } = await searchParams;
  const messages = await getMessages({ locale: 'es' });
  return (
    <main className="mx-auto max-w-3xl bg-[#faf8f5] px-5 py-8">
      <NextIntlClientProvider locale="es" messages={{ store: messages.store }}>
        <WizardDemo step={paso === 'datos' ? 'details' : 'design'} />
      </NextIntlClientProvider>
    </main>
  );
}
