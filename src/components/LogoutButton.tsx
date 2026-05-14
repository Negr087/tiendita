'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-ink-mute hover:text-err mt-3 inline-flex items-center gap-1"
    >
      <LogOut className="w-3 h-3" /> cerrar sesión
    </button>
  );
}
