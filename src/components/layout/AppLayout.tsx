import type { ReactNode } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { signOut } from '../../lib/google-auth';
import { Button } from '../ui';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, clearAuth } = useAuthStore();

  const handleSignOut = () => {
    signOut();
    clearAuth();
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--color-text)]">Habitly</h1>
          {user && (
            <div className="flex items-center gap-3">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
