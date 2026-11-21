import { useState, type FormEvent } from 'react';
import { Calendar, ClipboardList, Pill, Stethoscope, Users } from 'lucide-react';
import { api } from '../../lib/api';
import type { DashboardPayload } from '../../types/healthcare';
import { LayoutShell, type NavItem } from '../LayoutShell';
import { StatusLabel } from '../StatusLabel';

interface DoctorDashboardProps {
  data: DashboardPayload;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'patients', label: 'Assigned Patients', icon: Users },
  { id: 'prescriptions', label: 'Prescriptions & Tasks', icon: Pill },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'availability', label: 'Profile & Availability', icon: Stethoscope },
];

export function DoctorDashboard({ data, onRefresh, onLogout, onNotify }: DoctorDashboardProps) {
  const [activeTab, setActiveTab] = useState('patients');
  const doctor = data.doctors.find((d) => d.id === data.user.linkedProfileId) || data.doctors[0];

  // Prescription form
  const [rxPatientId, setRxPatientId] = useState(data.patients[0]?.id || '');
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily (Morning)');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [treatmentInstructions, setTreatmentInstructions] = useState('');
  const [careInstructions, setCareInstructions] = useState('');

  // Nursing Task form
  const [taskPatientId, setTaskPatientId] = useState(data.patients[0]?.id || '');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('15:00');
  const [taskPriority, setTaskPriority] = useState<'routine' | 'priority' | 'urgent'>('priority');

  // Availability form
  const [availableDaysText, setAvailableDaysText] = useState(doctor?.availableDays.join(', ') || 'Mon, Tue, Wed, Thu, Fri');
  const [availableTimings, setAvailableTimings] = useState(doctor?.availableTimings || '09:00 AM – 04:30 PM');
  const [consultationHours, setConsultationHours] = useState(doctor?.consultationHours || '');
  const [unavailableDatesText, setUnavailableDatesText] = useState(doctor?.unavailableDates.join(', ') || '');
  const [slotsText, setSlotsText] = useState(doctor?.appointmentSlots.join(', ') || '09:00 AM, 10:30 AM, 02:00 PM');

  const handleCreatePrescription = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createPrescription({
        patientId: rxPatientId,
        medicineName,
        dosage,
        frequency,
        treatmentInstructions,
        careInstructions,
        scheduledDate,
        scheduledTime,
      });
      setMedicineName('');
      setDosage('');
      setTreatmentInstructions('');
      setCareInstructions('');
      await onRefresh();
      onNotify('Prescription and scheduled medicine reminder created.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to save prescription.', 'error');
    }
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createNursingTask({
        patientId: taskPatientId,
        title: taskTitle,
        description: taskDesc,
        dueTime: taskDue,
        priority: taskPriority,
      });
      setTaskTitle('');
      setTaskDesc('');
      await onRefresh();
      onNotify('Nursing task assigned and nurse notified.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to assign task.', 'error');
    }
  };

  const handleUpdateCondition = async (patientId: string, conditionStatus: 'Stable' | 'Observation' | 'Critical' | 'Recovering') => {
    try {
      await api.updatePatient(patientId, { conditionStatus });
      await onRefresh();
      onNotify(`Patient condition updated to ${conditionStatus}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update patient condition.', 'error');
    }
  };

  const handleAppointmentDecision = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      await api.updateAppointment(id, { status });
      await onRefresh();
      onNotify(`Appointment marked as ${status}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update appointment.', 'error');
    }
  };

  const handleSaveAvailability = async (e: FormEvent) => {
    e.preventDefault();
    if (!doctor) return;
    try {
      await api.updateDoctor(doctor.id, {
        availableDays: availableDaysText.split(',').map((s) => s.trim()).filter(Boolean),
        availableTimings,
        consultationHours,
        unavailableDates: unavailableDatesText.split(',').map((s) => s.trim()).filter(Boolean),
        appointmentSlots: slotsText.split(',').map((s) => s.trim()).filter(Boolean),
      });
      await onRefresh();
      onNotify('Consultation schedule and availability updated.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update availability.', 'error');
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
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Assigned Patients</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data.patients.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Pending Appointments</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data.appointments.filter((a) => a.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Active Prescriptions</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data.prescriptions.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Consultation Room</p>
              <p className="text-sm font-semibold text-slate-900 mt-2 truncate">
                {doctor?.roomNumber || 'Room TBD'}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Assigned Patient Records</h1>
            {data.patients.length === 0 ? (
              <p className="text-sm text-slate-500">No patients assigned to your profile yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.patients.map((pat) => (
                  <div key={pat.id} className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold text-slate-900">{pat.name}</span>
                        <span className="text-xs font-mono tabular-nums text-slate-500">
                          Age {pat.age} · {pat.roomNumber} · {pat.bedNumber}
                        </span>
                        <StatusLabel status={pat.conditionStatus} />
                      </div>
                      <p className="text-xs text-slate-600">{pat.medicalHistory}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-slate-500">Condition:</label>
                      <select
                        value={pat.conditionStatus}
                        onChange={(e) =>
                          handleUpdateCondition(
                            pat.id,
                            e.target.value as 'Stable' | 'Observation' | 'Critical' | 'Recovering'
                          )
                        }
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                      >
                        <option value="Stable">Stable</option>
                        <option value="Observation">Observation</option>
                        <option value="Recovering">Recovering</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-3">Latest Nursing Vitals Reports</h2>
            {data.patientReports.length === 0 ? (
              <p className="text-sm text-slate-500">No reports logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-4 font-medium">Patient</th>
                      <th className="py-2 pr-4 font-medium">Recorded</th>
                      <th className="py-2 pr-4 font-medium">Condition</th>
                      <th className="py-2 pr-4 font-medium">Vitals</th>
                      <th className="py-2 font-medium">Observations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.patientReports.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{r.patientName}</td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusLabel status={r.condition} />
                        </td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums text-xs text-slate-700">
                          {r.temperature} · {r.bloodPressure} · {r.pulseRate} · SpO2 {r.oxygenSaturation}
                        </td>
                        <td className="py-2.5 text-xs text-slate-600">{r.generalObservations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Prescription & Medicine Schedule */}
          <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Prescribe Medicine & Schedule</h1>
            <form onSubmit={handleCreatePrescription} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient</label>
                <select
                  value={rxPatientId}
                  onChange={(e) => setRxPatientId(e.target.value)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Name</label>
                  <input
                    type="text"
                    required
                    value={medicineName}
                    onChange={(e) => setMedicineName(e.target.value)}
                    placeholder="e.g. Amoxicillin"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prescribed Dosage</label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500 mg Capsule"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <input
                    type="text"
                    required
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dose Time</label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Treatment Instructions</label>
                <input
                  type="text"
                  value={treatmentInstructions}
                  onChange={(e) => setTreatmentInstructions(e.target.value)}
                  placeholder="Take after meal; monitor BP prior to dose"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Care Instructions</label>
                <input
                  type="text"
                  value={careInstructions}
                  onChange={(e) => setCareInstructions(e.target.value)}
                  placeholder="Hydration & rest protocol"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Prescription & Schedule Reminder
              </button>
            </form>
          </section>

          {/* Assign Nursing Task */}
          <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Assign Nursing Task</h2>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient</label>
                <select
                  value={taskPatientId}
                  onChange={(e) => setTaskPatientId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {data.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.roomNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Post-op Wound Dressing & Temp Check"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="time"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as 'routine' | 'priority' | 'urgent')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="routine">Routine</option>
                    <option value="priority">Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Details</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Specific clinical instructions for assigned nurse..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Assign Task to Ward Nurse
              </button>
            </form>
          </section>
        </div>
      )}

      {activeTab === 'appointments' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Appointment Queue</h1>
          {data.appointments.length === 0 ? (
            <p className="text-sm text-slate-500">No appointments booked yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.appointments.map((apt) => (
                <div key={apt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-900">{apt.patientName}</span>
                      <StatusLabel status={apt.status} />
                    </div>
                    <p className="text-xs font-mono tabular-nums text-slate-500">
                      {apt.date} at {apt.timeSlot} · {apt.hospitalName} · {apt.roomNumber}
                    </p>
                    <p className="text-xs text-slate-700">{apt.reason}</p>
                  </div>
                  {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                    <div className="flex items-center gap-2 shrink-0">
                      {apt.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleAppointmentDecision(apt.id, 'confirmed')}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Confirm
                        </button>
                      )}
                      {apt.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleAppointmentDecision(apt.id, 'completed')}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                        >
                          Mark Completed
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAppointmentDecision(apt.id, 'cancelled')}
                        className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'availability' && doctor && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={doctor.photoUrl}
                alt={doctor.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-xl object-cover bg-slate-100"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-900">{doctor.name}</h1>
                <p className="text-xs text-blue-700 font-medium">{doctor.specialization}</p>
                <p className="text-xs text-slate-500 mt-0.5">{doctor.qualification}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Experience</dt>
                <dd className="font-mono font-semibold text-slate-900">{doctor.experienceYears} years</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Department</dt>
                <dd className="font-medium text-slate-900">{doctor.department}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Room Number</dt>
                <dd className="font-medium text-slate-900">{doctor.roomNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Contact</dt>
                <dd className="font-mono text-slate-900 text-xs">{doctor.contact}</dd>
              </div>
            </dl>
          </section>

          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Manage Availability & Slots</h2>
            <form onSubmit={handleSaveAvailability} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Available Days (comma-separated)</label>
                <input
                  type="text"
                  value={availableDaysText}
                  onChange={(e) => setAvailableDaysText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Available Timings</label>
                  <input
                    type="text"
                    value={availableTimings}
                    onChange={(e) => setAvailableTimings(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Hours</label>
                  <input
                    type="text"
                    value={consultationHours}
                    onChange={(e) => setConsultationHours(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Appointment Slots (comma-separated)
                </label>
                <input
                  type="text"
                  value={slotsText}
                  onChange={(e) => setSlotsText(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unavailable Dates (YYYY-MM-DD, comma-separated)
                </label>
                <input
                  type="text"
                  value={unavailableDatesText}
                  onChange={(e) => setUnavailableDatesText(e.target.value)}
                  placeholder="e.g. 2026-11-28, 2026-12-05"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Availability
              </button>
            </form>
          </section>
        </div>
      )}
    </LayoutShell>
  );
}
