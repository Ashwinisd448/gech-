import { useState, type FormEvent } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Pill,
  ShieldAlert,
  User,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { DashboardPayload, DoseStatus, EmergencyAlert } from '../../types/healthcare';
import { LayoutShell, type NavItem } from '../LayoutShell';
import { StatusLabel } from '../StatusLabel';

interface PatientDashboardProps {
  data: DashboardPayload;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'My Care Profile', icon: User },
  { id: 'medicines', label: 'Medicine Reminders', icon: Pill },
  { id: 'appointments', label: 'Doctor Appointments', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export function PatientDashboard({ data, onRefresh, onLogout, onNotify }: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sosOpen, setSosOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [latestAlert, setLatestAlert] = useState<EmergencyAlert | null>(data.emergencyAlerts[0] || null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationNote, setLocationNote] = useState('');

  // Appointment booking state
  const [selectedDoctorId, setSelectedDoctorId] = useState(data.doctors[0]?.id || '');
  const [aptDate, setAptDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [aptSlot, setAptSlot] = useState('');
  const [aptReason, setAptReason] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);

  // Reschedule state
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');

  const patient = data.patients[0];
  const assignedDoctor = data.doctors.find((d) => d.id === patient?.assignedDoctorId);
  const assignedNurse = data.nurses.find((n) => n.id === patient?.assignedNurseId);
  const assignedCaregiver = data.caregivers.find((c) => c.id === patient?.assignedCaregiverId);

  const selectedDoctor = data.doctors.find((d) => d.id === selectedDoctorId) || data.doctors[0];
  const bookedSlotsForSelected = new Set(
    data.appointments
      .filter(
        (a) =>
          a.doctorId === selectedDoctor?.id &&
          a.date === aptDate &&
          (a.status === 'pending' || a.status === 'confirmed')
      )
      .map((a) => a.timeSlot)
  );

  const handleDoseStatus = async (id: string, status: DoseStatus) => {
    try {
      await api.updateDoseStatus(id, { status });
      await onRefresh();
      onNotify(`Medicine dose marked as ${status}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update dose.', 'error');
    }
  };

  const handleBookAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !aptSlot) {
      onNotify('Please choose an available time slot.', 'error');
      return;
    }
    setBookingBusy(true);
    try {
      await api.bookAppointment({
        doctorId: selectedDoctor.id,
        date: aptDate,
        timeSlot: aptSlot,
        reason: aptReason,
      });
      setAptReason('');
      setAptSlot('');
      await onRefresh();
      onNotify('Appointment request submitted and sent for doctor confirmation.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not book appointment.', 'error');
    } finally {
      setBookingBusy(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await api.updateAppointment(id, { status: 'cancelled' });
      await onRefresh();
      onNotify('Appointment cancelled.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to cancel appointment.', 'error');
    }
  };

  const handleReschedule = async (e: FormEvent, id: string) => {
    e.preventDefault();
    try {
      await api.updateAppointment(id, { date: rescheduleDate, timeSlot: rescheduleSlot });
      setRescheduleId(null);
      await onRefresh();
      onNotify('Appointment rescheduled.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Reschedule failed.', 'error');
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      onNotify('Geolocation is not supported by this browser.', 'error');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        };
        setCoordinates(coords);
        setLocationNote(`GPS ${coords.lat}, ${coords.lng}`);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        onNotify('Location permission declined; ward room and bed details will be used instead.', 'error');
      },
      { timeout: 6000 }
    );
  };

  const handleSendSos = async () => {
    setSosLoading(true);
    try {
      const created = await api.triggerEmergency({
        locationText:
          locationNote ||
          `${patient?.hospitalName || data.hospital.name} · ${patient?.roomNumber || 'Ward'} · ${patient?.bedNumber || ''}`,
        coordinates,
      });
      setLatestAlert(created);
      await onRefresh();
      onNotify('SOS alert confirmed and dispatched to caregiver & hospital desk.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to send SOS alert.', 'error');
    } finally {
      setSosLoading(false);
    }
  };

  const upcomingMedCount = data.medicineSchedules.filter((m) => m.status === 'scheduled').length;
  const confirmedApts = data.appointments.filter((a) => a.status === 'confirmed');

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
      onOpenSos={() => setSosOpen(true)}
    >
      {/* Overview / Profile */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome, {patient?.name || data.user.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {patient?.hospitalName || data.hospital.name} · {patient?.roomNumber || 'Outpatient'} ·{' '}
                {patient?.bedNumber || 'Unassigned'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSosOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shrink-0"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>SOS Emergency Help</span>
            </button>
          </div>

          {/* 4-column summary strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Condition Status</p>
              <div className="mt-2">
                <StatusLabel status={patient?.conditionStatus || 'Stable'} />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Scheduled Doses</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {upcomingMedCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Confirmed Visits</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {confirmedApts.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Room & Bed</p>
              <p className="text-base font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
                {patient?.roomNumber || 'TBD'} · {patient?.bedNumber || '-'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Patient Details & Medical History */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <h2 className="text-base font-bold text-slate-900">Patient Medical Profile</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Patient Name</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{patient?.name || data.user.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Age</dt>
                  <dd className="font-medium font-mono tabular-nums text-slate-900 mt-0.5">
                    {patient?.age ?? '—'} years
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Contact Number</dt>
                  <dd className="font-medium font-mono tabular-nums text-slate-900 mt-0.5">
                    {patient?.contactNumber || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Hospital Location</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{patient?.hospitalName}</dd>
                </div>
              </dl>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Medical History</p>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {patient?.medicalHistory || 'No medical history recorded.'}
                </p>
              </div>
            </section>

            {/* Assigned Care Team */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Assigned Care Team</h2>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="py-3">
                  <p className="text-xs text-slate-500">Assigned Doctor</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {assignedDoctor ? assignedDoctor.name : 'Pending assignment'}
                  </p>
                  {assignedDoctor && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {assignedDoctor.department} · {assignedDoctor.roomNumber} · {assignedDoctor.contact}
                    </p>
                  )}
                </div>
                <div className="py-3">
                  <p className="text-xs text-slate-500">Assigned Nurse</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {assignedNurse ? assignedNurse.name : 'Pending assignment'}
                  </p>
                  {assignedNurse && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {assignedNurse.department} · {assignedNurse.shiftSchedule}
                    </p>
                  )}
                </div>
                <div className="py-3">
                  <p className="text-xs text-slate-500">Registered Caregiver</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {assignedCaregiver ? assignedCaregiver.name : 'Not assigned'}
                  </p>
                  {assignedCaregiver && (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        {assignedCaregiver.relationship} · {assignedCaregiver.contactNumber}
                      </span>
                      <a
                        href={`tel:${assignedCaregiver.contactNumber}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Latest Vitals History */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Recent Condition & Vitals Updates</h2>
            {data.patientReports.length === 0 ? (
              <p className="text-sm text-slate-500">No vitals observations logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-4 font-medium">Date & Time</th>
                      <th className="py-2 pr-4 font-medium">Condition</th>
                      <th className="py-2 pr-4 font-medium">Temp</th>
                      <th className="py-2 pr-4 font-medium">BP</th>
                      <th className="py-2 pr-4 font-medium">Pulse</th>
                      <th className="py-2 pr-4 font-medium">SpO2</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.patientReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-4 font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                          {new Date(rep.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusLabel status={rep.condition} />
                        </td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums">{rep.temperature}</td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums">{rep.bloodPressure}</td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums">{rep.pulseRate}</td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums">{rep.oxygenSaturation}</td>
                        <td className="py-2.5 text-xs text-slate-600">{rep.nursingNotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Medicine Reminders */}
      {activeTab === 'medicines' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Medicine Schedule & Reminders</h1>
              <p className="text-xs text-slate-500 mt-1">
                Prescribed by your doctor. Medicine reminders are a scheduling aid and do not substitute medical
                supervision.
              </p>
            </div>
          </div>

          {data.medicineSchedules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              No medicine schedules assigned yet.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {data.medicineSchedules.map((med) => (
                <div
                  key={med.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900">{med.medicineName}</span>
                      <span className="text-sm font-mono tabular-nums text-blue-700 font-medium">
                        {med.dosage}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <StatusLabel status={med.status} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {med.scheduledDate} at {med.scheduledTime} · {med.frequency} · Prescribed by {med.doctorName}
                    </p>
                    <p className="text-xs text-slate-700">{med.instructions}</p>
                    {med.statusReason && (
                      <p className="text-xs text-amber-700">Note: {med.statusReason}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDoseStatus(med.id, 'taken')}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Mark Taken
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDoseStatus(med.id, 'postponed')}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      Postpone
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDoseStatus(med.id, 'missed')}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Mark Missed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appointments */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Doctor Directory & Booking Form */}
            <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Book Doctor Appointment</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Double-booking is automatically blocked per doctor, date, and time slot.
                </p>
              </div>

              <form onSubmit={handleBookAppointment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Choose Doctor</label>
                  <div className="space-y-2">
                    {data.doctors.map((doc) => {
                      const active = doc.id === selectedDoctor?.id;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setAptSlot('');
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                            active ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <img
                            src={doc.photoUrl}
                            alt={doc.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover shrink-0 bg-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {doc.department} · {doc.roomNumber} · {doc.experienceYears} yrs exp
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {doc.availableDays.join(', ')} · {doc.availableTimings}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="apt-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Date
                  </label>
                  <input
                    id="apt-date"
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={aptDate}
                    onChange={(e) => {
                      setAptDate(e.target.value);
                      setAptSlot('');
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Available Time Slots
                  </label>
                  {selectedDoctor?.unavailableDates.includes(aptDate) ? (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                      {selectedDoctor.name} has marked {aptDate} as unavailable. Please select another date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {(selectedDoctor?.appointmentSlots || []).map((slot) => {
                        const taken = bookedSlotsForSelected.has(slot);
                        const chosen = aptSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={taken}
                            onClick={() => setAptSlot(slot)}
                            className={`px-2.5 py-2 text-xs font-mono tabular-nums rounded-md border transition-colors ${
                              taken
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                                : chosen
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="apt-reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Consultation Reason
                  </label>
                  <input
                    id="apt-reason"
                    type="text"
                    required
                    value={aptReason}
                    onChange={(e) => setAptReason(e.target.value)}
                    placeholder="e.g. Follow-up blood pressure check"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingBusy || !aptSlot}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {bookingBusy ? 'Submitting Request...' : 'Book Appointment'}
                </button>
              </form>
            </section>

            {/* My Appointments & Hospital Navigation */}
            <section className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-bold text-slate-900 mb-4">Your Appointments & Room Navigation</h2>
                {data.appointments.length === 0 ? (
                  <p className="text-sm text-slate-500">You have not booked any appointments yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.appointments.map((apt) => (
                      <div key={apt.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{apt.doctorName}</p>
                            <p className="text-xs text-slate-500">
                              {apt.hospitalName} · {apt.department} · {apt.roomNumber}
                            </p>
                          </div>
                          <StatusLabel status={apt.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            {apt.date} at {apt.timeSlot}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{apt.reason}</p>

                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <a
                              href={data.hospital.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Hospital Directions</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleId(rescheduleId === apt.id ? null : apt.id);
                                setRescheduleDate(apt.date);
                                setRescheduleSlot(apt.timeSlot);
                              }}
                              className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelAppointment(apt.id)}
                              className="px-2.5 py-1 text-xs font-medium border border-red-200 rounded text-red-700 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {rescheduleId === apt.id && (
                          <form
                            onSubmit={(e) => handleReschedule(e, apt.id)}
                            className="pt-2 flex flex-wrap items-center gap-2"
                          >
                            <input
                              type="date"
                              required
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                            />
                            <select
                              value={rescheduleSlot}
                              onChange={(e) => setRescheduleSlot(e.target.value)}
                              className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                            >
                              {(
                                data.doctors.find((d) => d.id === apt.doctorId)?.appointmentSlots || [apt.timeSlot]
                              ).map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save New Slot
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Patient Notifications & Reminders</h1>
          {data.notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications at this time.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.notifications.map((n) => (
                <div key={n.id} className="py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-blue-700 capitalize">{n.category.replace('_', ' ')}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SOS Emergency Modal */}
      {sosOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5 text-red-700">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h2 className="text-lg font-bold">Emergency SOS Assistance</h2>
              </div>
              <button
                type="button"
                onClick={() => setSosOpen(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Patient</span>
                <span className="font-semibold text-slate-900">{patient?.name || data.user.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Hospital</span>
                <span className="font-medium text-slate-900 text-right">
                  {patient?.hospitalName || data.hospital.name}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Room & Bed</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {patient?.roomNumber || 'Ward'} · {patient?.bedNumber || 'Bed'}
                </span>
              </div>
              <div className="flex justify-between gap-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500">Registered Caregiver</span>
                <span className="font-semibold text-slate-900">
                  {assignedCaregiver ? `${assignedCaregiver.name} (${assignedCaregiver.contactNumber})` : 'Hospital Care Desk'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCaptureLocation}
                disabled={geoLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{geoLoading ? 'Getting GPS...' : coordinates ? 'GPS Attached' : 'Attach Current GPS Location'}</span>
              </button>

              <a
                href={`tel:${assignedCaregiver?.contactNumber || data.hospital.contactNumber}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Registered Caregiver</span>
              </a>
            </div>

            {latestAlert && latestAlert.deliveryConfirmed && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-semibold">
                  Emergency Alert Recorded & Confirmed ({latestAlert.id})
                </p>
                <p>
                  Status: {latestAlert.status.replace('_', ' ')} · Recorded at{' '}
                  <span className="font-mono tabular-nums">
                    {new Date(latestAlert.createdAt).toLocaleTimeString()}
                  </span>
                </p>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Safety notice: SmartCare SOS alerts notify your registered caregiver and hospital desk inside this
              platform. This feature does not replace calling local emergency services (e.g., 911 / 112) in a
              life-threatening emergency.
            </p>

            <button
              type="button"
              onClick={handleSendSos}
              disabled={sosLoading}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {sosLoading ? 'Dispatching SOS Alert...' : 'Send Emergency SOS Alert Now'}
            </button>
          </div>
        </div>
      )}
    </LayoutShell>
  );
}
