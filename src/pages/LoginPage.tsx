import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { getDefaultHabitData } from '../lib/google-drive';
import { useAuthStore } from '../stores/auth-store';
import { useHabitStore } from '../stores/habit-store';
import { useSignIn } from '../hooks/useSignIn';
import { useState } from 'react';

interface LoginPageProps {
  isFirstTime?: boolean;
}

export function LoginPage({ isFirstTime = false }: LoginPageProps) {
  const navigate = useNavigate();
  const { setLocalUser } = useAuthStore();
  const { setHabitData } = useHabitStore();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useSignIn();

  const handleContinueLocally = () => {
    setLocalUser();
    setHabitData(getDefaultHabitData());
    navigate('/');
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStatus('Signing in...');
    try {
      await signIn();
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
            {isFirstTime ? 'Welcome to Habitly' : 'Habitly'}
          </h1>
          <p className="text-[var(--color-text-muted)]">
            {isFirstTime
              ? 'Sign in to get started. Your data will be synced across devices.'
              : 'Track your habits, build better routines'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            loadingStatus || 'Signing in...'
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </>
          )}
        </Button>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-muted)]">or</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        <button
          onClick={handleContinueLocally}
          disabled={isLoading}
          className="mt-4 w-full py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
        >
          Continue without account
        </button>

        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          Sign in to sync your data across devices
        </p>
      </Card>
    </div>
  );
}
