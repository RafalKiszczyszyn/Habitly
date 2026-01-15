import { signIn as googleSignIn } from '../lib/google-auth';
import { loadHabitData, getDefaultHabitData } from '../lib/google-drive';
import { useAuthStore } from '../stores/auth-store';
import { useHabitStore } from '../stores/habit-store';
import type { User } from '../types';

export function useSignIn() {
  const { user: prevUser, setAuth } = useAuthStore();
  const { setHabitData, clearHabitData, setLoading } = useHabitStore();

  const signIn = async (): Promise<{ accessToken: string; user: User }> => {
    const { accessToken, user } = await googleSignIn();
    setAuth(user, accessToken);

    const userChanged = !prevUser || prevUser.id !== user.id;
    if (userChanged) {
      if (prevUser && prevUser.id !== user.id) {
        clearHabitData();
      }

      setLoading(true);
      try {
        const cloudData = await loadHabitData(accessToken);
        if (cloudData) {
          setHabitData(cloudData);
        } else {
          setHabitData(getDefaultHabitData());
        }
      } catch (loadErr) {
        console.error('Failed to load cloud data:', loadErr);
        setHabitData(getDefaultHabitData());
      } finally {
        setLoading(false);
      }
    }

    return { accessToken, user };
  };

  return { signIn };
}
