import { useState } from 'react';
import { HeartHandshake, MapPin, Phone, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';
import type { DashboardPayload, EmergencyStatus } from '../../types/healthcare';
import { LayoutShell, type NavItem } from '../LayoutShell';
import { StatusLabel } from '../StatusLabel';

interface CaregiverDashboardProps {
  data: DashboardPayload;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'alerts', label: 'Emergency SOS Alerts', icon: ShieldAlert },
  { id: 'patients', label: 'Assigned Patients', icon: HeartHandshake },
];

export function CaregiverDashboard({ data, onRefresh, onLogout, onNotify }: CaregiverDashboardProps) {
  const [activeTab, setActiveTab] = useState('alerts');

  const handleUpdateAlert = async (id: string, status: EmergencyStatus) => {
    try {
      await api.updateEmergencyStatus(id, status);
      await onRefresh();
      onNotify(`Emergency alert updated to "${status.replace('_', ' ')}".`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update emergency status.', 'error');
    }
  };

  const activeAlerts = data.emergencyAlerts.filter((e) => e.status !== 'resolved');

  return (
    <LayoutShell
      user={data.user}
      hospitalName={data.hospital.name}
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notifications={data.notifications}
      onMarkNotificationRead={async (id) => {
        await api.markNotificationRead(id);
        await onRefresh();
      }}
      onRefresh={onRefresh}
      onLogout={onLogout}
    >
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Active SOS Alerts</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-1">
                {activeAlerts.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Assigned Patients</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data.patients.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 lg:col-span-1">
              <p className="text-xs text-slate-500">Hospital Care Desk</p>
              <a
                href={`tel:${data.hospital.contactNumber}`}
                className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-blue-700 mt-1.5 hover:underline"
              >
                <Phone className="w-4 h-4" />
                <span>{data.hospital.contactNumber}</span>
              </a>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Emergency SOS Feed</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time patient emergency notifications. Update response status so the patient and hospital know you
                are responding.
              </p>
            </div>

            {data.emergencyAlerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No SOS emergency alerts triggered for your assigned patients.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.emergencyAlerts.map((alert) => (
                  <div key={alert.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-slate-900">{alert.patientName}</span>
                        <StatusLabel status={alert.status} />
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        Triggered {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <p>
                        {alert.hospitalName} · <span className="font-mono">{alert.roomNumber}</span> ·{' '}
                        <span className="font-mono">{alert.bedNumber}</span>
                      </p>
                      <p className="inline-flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Location: {alert.locationText}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {alert.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateAlert(alert.id, 'acknowledged')}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Acknowledge Alert
                        </button>
                      )}
                      {(alert.status === 'active' || alert.status === 'acknowledged') && (
                        <button
                          type="button"
                          onClick={() => handleUpdateAlert(alert.id, 'en_route')}
                          className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700"
                        >
                          Mark En Route
                        </button>
                      )}
                      {alert.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateAlert(alert.id, 'resolved')}
                          className="px-3 py-1.5 text-xs font-medium border border-emerald-300 text-emerald-800 rounded-md hover:bg-emerald-50"
                        >
                          Mark Resolved
                        </button>
                      )}
                      <a
                        href={`tel:${data.hospital.contactNumber}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Hospital</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'patients' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Assigned Patients & Ward Details</h1>
          {data.patients.length === 0 ? (
            <p className="text-sm text-slate-500">No patients currently assigned to you.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.patients.map((pat) => {
                const doc = data.doctors.find((d) => d.id === pat.assignedDoctorId);
                return (
                  <div key={pat.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-slate-900">{pat.name}</span>
                        <StatusLabel status={pat.conditionStatus} />
                      </div>
                      <p className="text-xs text-slate-600">
                        {pat.hospitalName} · <span className="font-mono">{pat.roomNumber}</span> ·{' '}
                        <span className="font-mono">{pat.bedNumber}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Attending Doctor: {doc?.name || 'Assigned physician'} ({doc?.department || 'General'})
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={`tel:${pat.contactNumber}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Patient</span>
                      </a>
                      <a
                        href={`tel:${data.hospital.contactNumber}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Hospital</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </LayoutShell>
  );
}
