import { useState, type FormEvent } from 'react';
import { Activity, ClipboardCheck, Lock, Pill } from 'lucide-react';
import { api } from '../../lib/api';
import type { DashboardPayload, DoseStatus } from '../../types/healthcare';
import { LayoutShell, type NavItem } from '../LayoutShell';
import { StatusLabel } from '../StatusLabel';

interface NurseDashboardProps {
  data: DashboardPayload;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'medicine', label: 'Medicine Administration', icon: Pill },
  { id: 'vitals', label: 'Patient Vitals & Condition', icon: Activity },
  { id: 'tasks', label: 'Nursing Tasks', icon: ClipboardCheck },
];

export function NurseDashboard({ data, onRefresh, onLogout, onNotify }: NurseDashboardProps) {
  const [activeTab, setActiveTab] = useState('medicine');
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});

  // Vitals form
  const [patientId, setPatientId] = useState(data.patients[0]?.id || '');
  const [condition, setCondition] = useState('Stable');
  const [temperature, setTemperature] = useState('98.6 °F');
  const [bloodPressure, setBloodPressure] = useState('120/80 mmHg');
  const [pulseRate, setPulseRate] = useState('72 bpm');
  const [oxygenSaturation, setOxygenSaturation] = useState('98%');
  const [generalObservations, setGeneralObservations] = useState('');
  const [nursingNotes, setNursingNotes] = useState('');

  const handleDoseUpdate = async (id: string, status: DoseStatus) => {
    const reason = reasonMap[id]?.trim() || '';
    if ((status === 'missed' || status === 'delayed') && !reason) {
      onNotify('Please enter a clinical reason before marking a dose missed or delayed.', 'error');
      return;
    }
    try {
      await api.updateDoseStatus(id, { status, statusReason: reason || undefined });
      await onRefresh();
      onNotify(`Dose status recorded as ${status}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to record dose.', 'error');
    }
  };

  const handleSaveVitals = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createReport({
        patientId,
        condition,
        temperature,
        bloodPressure,
        pulseRate,
        oxygenSaturation,
        generalObservations,
        nursingNotes,
      });
      setGeneralObservations('');
      setNursingNotes('');
      await onRefresh();
      onNotify('Patient vitals and nursing notes logged with timestamp.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to log vitals.', 'error');
    }
  };

  const handleTaskStatus = async (id: string, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      await api.updateNursingTask(id, status);
      await onRefresh();
      onNotify(`Task marked as ${status.replace('_', ' ')}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update task.', 'error');
    }
  };

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
      {activeTab === 'medicine' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Doctor-Prescribed Medicine Schedule</h1>
              <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Prescriptions are read-only for nursing staff; dosage changes require doctor approval.</span>
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {data.medicineSchedules.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No scheduled doses for your assigned patients.
              </div>
            ) : (
              data.medicineSchedules.map((med) => (
                <div key={med.id} className="p-5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{med.patientName}</span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-semibold text-blue-700">
                          {med.medicineName} ({med.dosage})
                        </span>
                        <StatusLabel status={med.status} />
                      </div>
                      <p className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                        Time: {med.scheduledDate} at {med.scheduledTime} · Prescribed by {med.doctorName}
                      </p>
                      <p className="text-xs text-slate-700 mt-1">{med.instructions}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={reasonMap[med.id] || ''}
                      onChange={(e) => setReasonMap({ ...reasonMap, [med.id]: e.target.value })}
                      placeholder="Reason required if delayed or missed..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDoseUpdate(med.id, 'administered')}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Administered
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDoseUpdate(med.id, 'delayed')}
                        className="px-3 py-1.5 text-xs font-medium border border-amber-300 text-amber-800 rounded-md hover:bg-amber-50"
                      >
                        Delayed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDoseUpdate(med.id, 'missed')}
                        className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                      >
                        Missed
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'vitals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Record Patient Condition & Vitals</h1>
            <form onSubmit={handleSaveVitals} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {data.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.roomNumber} · {p.bedNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Stable">Stable</option>
                  <option value="Observation">Observation</option>
                  <option value="Recovering">Recovering</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Temperature</label>
                  <input
                    type="text"
                    required
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    required
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pulse Rate</label>
                  <input
                    type="text"
                    required
                    value={pulseRate}
                    onChange={(e) => setPulseRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Oxygen Saturation</label>
                  <input
                    type="text"
                    required
                    value={oxygenSaturation}
                    onChange={(e) => setOxygenSaturation(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">General Observations</label>
                <input
                  type="text"
                  value={generalObservations}
                  onChange={(e) => setGeneralObservations(e.target.value)}
                  placeholder="Alert, comfortable, normal breathing"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nursing Notes</label>
                <textarea
                  rows={2}
                  value={nursingNotes}
                  onChange={(e) => setNursingNotes(e.target.value)}
                  placeholder="Shift handover & follow-up notes..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Condition & Vitals
              </button>
            </form>
          </section>

          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Condition & Vitals History</h2>
            <div className="divide-y divide-slate-100">
              {data.patientReports.map((r) => (
                <div key={r.id} className="py-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{r.patientName}</span>
                      <StatusLabel status={r.condition} />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-mono tabular-nums text-slate-700">
                    Temp: {r.temperature} · BP: {r.bloodPressure} · Pulse: {r.pulseRate} · SpO2: {r.oxygenSaturation}
                  </p>
                  <p className="text-xs text-slate-600">{r.generalObservations}</p>
                  <p className="text-xs text-slate-500">Notes ({r.recordedByName}): {r.nursingNotes}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'tasks' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Doctor-Assigned Nursing Tasks</h1>
          {data.nursingTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No pending nursing tasks.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.nursingTasks.map((task) => (
                <div key={task.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{task.title}</span>
                      <StatusLabel status={task.priority} />
                      <StatusLabel status={task.status} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {task.patientName} · {task.roomNumber} · {task.bedNumber} · Due {task.dueTime} · Assigned by{' '}
                      {task.assignedByDoctorName}
                    </p>
                    <p className="text-xs text-slate-700">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleTaskStatus(task.id, 'in_progress')}
                        className="px-3 py-1.5 text-xs font-medium border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50"
                      >
                        Start Task
                      </button>
                    )}
                    {task.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleTaskStatus(task.id, 'completed')}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </LayoutShell>
  );
}
