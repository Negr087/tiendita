import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { SettingsForm } from '@/components/SettingsForm';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect('/login');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-receipt mb-1">configuración</p>
        <h1 className="font-display text-4xl md:text-5xl font-black leading-tight">
          Tu tienda
        </h1>
      </div>

      <SettingsForm
        initial={{
          shopName: user.shopName,
          slug: user.slug,
          shopDescription: user.shopDescription ?? '',
          shopAccent: user.shopAccent,
          lightningAddress: user.lightningAddress,
          wapuAlias: user.wapuAlias ?? '',
          wapuReceiverName: user.wapuReceiverName ?? '',
        }}
      />
    </div>
  );
}
