import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { CalendarPage } from './pages/CalendarPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ManageHabitsPage } from './pages/ManageHabitsPage';
import { useAuthStore } from './stores/auth-store';
import { initializeGoogleAuth } from './lib/google-auth';

const queryClient = new QueryClient();

// Check if this is first time use (no local data)
function isFirstTimeUser(): boolean {
  const storage = localStorage.getItem('habitly-storage');
  if (!storage) return true;
  try {
    const data = JSON.parse(storage);
    // Check if state exists and has been initialized
    return !data.state || (data.state.habits.length === 0 && data.state.entries.length === 0);
  } catch {
    return true;
  }
}

function AppRoutes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isFirstTime] = useState(() => isFirstTimeUser());

  // First time users must login first
  if (isFirstTime && !isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage isFirstTime />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<HomePage />} />
      <Route path="/calendar/:habitId" element={<CalendarPage />} />
      <Route path="/statistics/:habitId" element={<StatisticsPage />} />
      <Route path="/manage" element={<ManageHabitsPage />} />
    </Routes>
  );
}

function App() {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    initializeGoogleAuth()
      .then(() => setIsGoogleLoaded(true))
      .catch((err) => setLoadError(err.message));
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load Google services</p>
          <p className="text-[var(--color-text-muted)] text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!isGoogleLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
