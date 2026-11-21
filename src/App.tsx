import { useCallback, useEffect, useState } from 'react';
import { AuthPortal } from './components/AuthPortal';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { CaregiverDashboard } from './components/dashboards/CaregiverDashboard';
import { DoctorDashboard } from './components/dashboards/DoctorDashboard';
import { NurseDashboard } from './components/dashboards/NurseDashboard';
import { PatientDashboard } from './components/dashboards/PatientDashboard';
import { api, getAuthToken } from './lib/api';
import type { AuthUser, DashboardPayload } from './types/healthcare';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadDashboard = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const payload = await api.getDashboard();
      setDashboard(payload);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load dashboard.', 'error');
    }
  }, [showToast]);

  const handleAuthenticated = async (authedUser: AuthUser) => {
    setUser(authedUser);
    setLoading(true);
    try {
      const payload = await api.getDashboard();
      setDashboard(payload);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setDashboard(null);
  };

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadDashboard();
    }, 20000);
    return () => clearInterval(interval);
  }, [user, loadDashboard]);

  if (!user) {
    return <AuthPortal onAuthenticated={handleAuthenticated} />;
  }

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-sm w-full text-center space-y-2">
          <p className="text-base font-bold text-blue-700">SmartCare</p>
          <p className="text-sm text-slate-600">Loading your {user.role} workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 max-w-sm px-4 py-3 rounded-lg border text-xs font-medium shadow-md ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-white border-blue-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {dashboard.user.role === 'patient' && (
        <PatientDashboard
          data={dashboard}
          onRefresh={loadDashboard}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      )}
      {dashboard.user.role === 'doctor' && (
        <DoctorDashboard
          data={dashboard}
          onRefresh={loadDashboard}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      )}
      {dashboard.user.role === 'nurse' && (
        <NurseDashboard
          data={dashboard}
          onRefresh={loadDashboard}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      )}
      {dashboard.user.role === 'caregiver' && (
        <CaregiverDashboard
          data={dashboard}
          onRefresh={loadDashboard}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      )}
      {dashboard.user.role === 'admin' && (
        <AdminDashboard
          data={dashboard}
          onRefresh={loadDashboard}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      )}
    </>
  );
}
