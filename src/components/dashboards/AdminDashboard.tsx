import { useState, type FormEvent } from 'react';
import {
  Ambulance as AmbulanceIcon,
  Building2,
  ExternalLink,
  Megaphone,
  Phone,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { Ambulance, DashboardPayload, UserRole } from '../../types/healthcare';
import { LayoutShell, type NavItem } from '../LayoutShell';
import { StatusLabel } from '../StatusLabel';

interface AdminDashboardProps {
  data: DashboardPayload;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'hospital', label: 'Hospital & Announcements', icon: Building2 },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'nurses', label: 'Nurses', icon: UserCheck },
  { id: 'patients', label: 'Patients & Rooms', icon: Users },
  { id: 'ambulances', label: 'Ambulance Fleet', icon: AmbulanceIcon },
];

export function AdminDashboard({ data, onRefresh, onLogout, onNotify }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('hospital');

  // Hospital info state
  const [hospName, setHospName] = useState(data.hospital.name);
  const [hospAddress, setHospAddress] = useState(data.hospital.address);
  const [hospLocation, setHospLocation] = useState(data.hospital.location);
  const [hospMaps, setHospMaps] = useState(data.hospital.googleMapsUrl);
  const [hospPhone, setHospPhone] = useState(data.hospital.contactNumber);
  const [hospEmail, setHospEmail] = useState(data.hospital.email);
  const [hospHours, setHospHours] = useState(data.hospital.openingHours);
  const [hospEmergencyHours, setHospEmergencyHours] = useState(data.hospital.emergencyHours);

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTarget, setAnnTarget] = useState<UserRole | 'all'>('all');

  // Add Doctor state
  const [docName, setDocName] = useState('');
  const [docQual, setDocQual] = useState('MD');
  const [docSpec, setDocSpec] = useState('');
  const [docDept, setDocDept] = useState('');
  const [docRoom, setDocRoom] = useState('');
  const [docContact, setDocContact] = useState('');
  const [docExp, setDocExp] = useState('8');

  // Add Nurse state
  const [nurseName, setNurseName] = useState('');
  const [nurseDept, setNurseDept] = useState('');
  const [nurseContact, setNurseContact] = useState('');
  const [nurseShift, setNurseShift] = useState('Day Shift · 07:00 AM – 07:00 PM');

  // Add Patient state
  const [patName, setPatName] = useState('');
  const [patAge, setPatAge] = useState('42');
  const [patContact, setPatContact] = useState('');
  const [patHistory, setPatHistory] = useState('');
  const [patRoom, setPatRoom] = useState('Room 204');
  const [patBed, setPatBed] = useState('Bed A');
  const [patDocId, setPatDocId] = useState(data.doctors[0]?.id || '');
  const [patNurseId, setPatNurseId] = useState(data.nurses[0]?.id || '');
  const [patCgId, setPatCgId] = useState(data.caregivers[0]?.id || '');

  // Add Ambulance state
  const [ambNumber, setAmbNumber] = useState('');
  const [ambDriver, setAmbDriver] = useState('');
  const [ambPhone, setAmbPhone] = useState('');
  const [ambType, setAmbType] = useState<Ambulance['ambulanceType']>('Basic Life Support');
  const [ambLocation, setAmbLocation] = useState('Emergency Bay · North Entrance');

  const handleSaveHospital = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.updateHospital({
        name: hospName,
        address: hospAddress,
        location: hospLocation,
        googleMapsUrl: hospMaps,
        contactNumber: hospPhone,
        email: hospEmail,
        openingHours: hospHours,
        emergencyHours: hospEmergencyHours,
      });
      await onRefresh();
      onNotify('Hospital profile updated.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to save hospital info.', 'error');
    }
  };

  const handleSendAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.sendAnnouncement({ title: annTitle, message: annMessage, targetRole: annTarget });
      setAnnTitle('');
      setAnnMessage('');
      await onRefresh();
      onNotify('Hospital announcement broadcasted.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to broadcast announcement.', 'error');
    }
  };

  const handleAddDoctor = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createDoctor({
        name: docName,
        qualification: docQual,
        specialization: docSpec || docDept,
        department: docDept,
        roomNumber: docRoom,
        contact: docContact,
        experienceYears: Number(docExp),
        availableTimings: '09:00 AM – 05:00 PM',
        consultationHours: '09:00 AM – 01:00 PM',
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        appointmentSlots: ['09:00 AM', '10:30 AM', '02:00 PM', '03:30 PM'],
      });
      setDocName('');
      setDocSpec('');
      setDocDept('');
      setDocRoom('');
      setDocContact('');
      await onRefresh();
      onNotify('Doctor added to hospital roster.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to add doctor.', 'error');
    }
  };

  const handleAddNurse = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createNurse({
        name: nurseName,
        department: nurseDept,
        contact: nurseContact,
        shiftSchedule: nurseShift,
      });
      setNurseName('');
      setNurseDept('');
      setNurseContact('');
      await onRefresh();
      onNotify('Nurse added to department roster.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to add nurse.', 'error');
    }
  };

  const handleAddPatient = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createPatient({
        name: patName,
        age: Number(patAge),
        contactNumber: patContact,
        medicalHistory: patHistory,
        roomNumber: patRoom,
        bedNumber: patBed,
        assignedDoctorId: patDocId,
        assignedNurseId: patNurseId,
        assignedCaregiverId: patCgId,
      });
      setPatName('');
      setPatContact('');
      setPatHistory('');
      await onRefresh();
      onNotify('Patient registered and care team assigned.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to register patient.', 'error');
    }
  };

  const handleUpdatePatientAssignment = async (
    patientId: string,
    updates: { roomNumber?: string; bedNumber?: string; assignedDoctorId?: string; assignedNurseId?: string; assignedCaregiverId?: string }
  ) => {
    try {
      await api.updatePatient(patientId, updates);
      await onRefresh();
      onNotify('Patient ward & team assignment updated.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update patient.', 'error');
    }
  };

  const handleAddAmbulance = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createAmbulance({
        ambulanceNumber: ambNumber,
        driverName: ambDriver,
        driverContact: ambPhone,
        ambulanceType: ambType,
        hospitalLocation: ambLocation,
      });
      setAmbNumber('');
      setAmbDriver('');
      setAmbPhone('');
      await onRefresh();
      onNotify('Ambulance unit registered.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to add ambulance.', 'error');
    }
  };

  const handleAmbulanceStatus = async (id: string, availability: Ambulance['availability']) => {
    try {
      await api.updateAmbulance(id, { availability });
      await onRefresh();
      onNotify(`Ambulance marked as ${availability}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update ambulance.', 'error');
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
      {/* Hospital KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Registered Patients</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{data.patients.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Active Doctors</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{data.doctors.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Nursing Staff</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{data.nurses.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Available Ambulances</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {data.ambulances.filter((a) => a.availability === 'available').length} / {data.ambulances.length}
          </p>
        </div>
      </div>

      {activeTab === 'hospital' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-bold text-slate-900">Hospital Information</h1>
              <a
                href={data.hospital.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <span>Open Maps Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <form onSubmit={handleSaveHospital} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Address</label>
                <input
                  type="text"
                  required
                  value={hospAddress}
                  onChange={(e) => setHospAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location Summary</label>
                  <input
                    type="text"
                    value={hospLocation}
                    onChange={(e) => setHospLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Google Maps Link</label>
                  <input
                    type="url"
                    value={hospMaps}
                    onChange={(e) => setHospMaps(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={hospPhone}
                    onChange={(e) => setHospPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Email</label>
                  <input
                    type="email"
                    value={hospEmail}
                    onChange={(e) => setHospEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Hours</label>
                  <input
                    type="text"
                    value={hospHours}
                    onChange={(e) => setHospHours(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Dept Hours</label>
                  <input
                    type="text"
                    value={hospEmergencyHours}
                    onChange={(e) => setHospEmergencyHours(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Hospital Details
              </button>
            </form>
          </section>

          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Hospital Announcements</h2>
            </div>
            <form onSubmit={handleSendAnnouncement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={annTarget}
                  onChange={(e) => setAnnTarget(e.target.value as UserRole | 'all')}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Users (Patients, Staff, Caregivers)</option>
                  <option value="patient">Patients Only</option>
                  <option value="doctor">Doctors Only</option>
                  <option value="nurse">Nurses Only</option>
                  <option value="caregiver">Caregivers Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Cardiology Wing Maintenance Notice"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
                <textarea
                  rows={3}
                  required
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Enter announcement details..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Broadcast Announcement
              </button>
            </form>
          </section>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Add Doctor</h1>
            <form onSubmit={handleAddDoctor} className="space-y-3">
              <input
                type="text"
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Doctor full name (e.g. Dr. Maya Lin, MD)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={docDept}
                  onChange={(e) => setDocDept(e.target.value)}
                  placeholder="Department"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={docRoom}
                  onChange={(e) => setDocRoom(e.target.value)}
                  placeholder="Room (e.g. Room 215)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={docQual}
                  onChange={(e) => setDocQual(e.target.value)}
                  placeholder="Qualification"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  min={0}
                  value={docExp}
                  onChange={(e) => setDocExp(e.target.value)}
                  placeholder="Years exp"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <input
                type="text"
                value={docSpec}
                onChange={(e) => setDocSpec(e.target.value)}
                placeholder="Specialization"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={docContact}
                onChange={(e) => setDocContact(e.target.value)}
                placeholder="Contact number"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Doctor to Roster
              </button>
            </form>
          </section>

          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Medical Staff Directory</h2>
            <div className="divide-y divide-slate-100">
              {data.doctors.map((doc) => (
                <div key={doc.id} className="py-3.5 flex items-center gap-4">
                  <img
                    src={doc.photoUrl}
                    alt={doc.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-500">
                      {doc.department} · {doc.roomNumber} · {doc.qualification}
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      {doc.availableDays.join(', ')} · {doc.availableTimings}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'nurses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Add Nurse</h1>
            <form onSubmit={handleAddNurse} className="space-y-3">
              <input
                type="text"
                required
                value={nurseName}
                onChange={(e) => setNurseName(e.target.value)}
                placeholder="Nurse name (e.g. Hannah Brooks, RN)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={nurseDept}
                onChange={(e) => setNurseDept(e.target.value)}
                placeholder="Department"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={nurseContact}
                onChange={(e) => setNurseContact(e.target.value)}
                placeholder="Contact phone"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={nurseShift}
                onChange={(e) => setNurseShift(e.target.value)}
                placeholder="Shift schedule"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Nurse
              </button>
            </form>
          </section>

          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Nursing Roster</h2>
            <div className="divide-y divide-slate-100">
              {data.nurses.map((nurse) => (
                <div key={nurse.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{nurse.name}</p>
                    <p className="text-xs text-slate-500">
                      {nurse.department} · {nurse.shiftSchedule}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-600">
                    {nurse.assignedPatientIds.length} patients
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Register Patient & Assign Care Team</h1>
            <form onSubmit={handleAddPatient} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={patName}
                  onChange={(e) => setPatName(e.target.value)}
                  placeholder="Patient name"
                  className="col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  required
                  value={patAge}
                  onChange={(e) => setPatAge(e.target.value)}
                  placeholder="Age"
                  className="px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <input
                type="text"
                required
                value={patContact}
                onChange={(e) => setPatContact(e.target.value)}
                placeholder="Contact number"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={patRoom}
                  onChange={(e) => setPatRoom(e.target.value)}
                  placeholder="Room number"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={patBed}
                  onChange={(e) => setPatBed(e.target.value)}
                  placeholder="Bed number"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <select
                value={patDocId}
                onChange={(e) => setPatDocId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {data.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Doctor: {d.name}
                  </option>
                ))}
              </select>
              <select
                value={patNurseId}
                onChange={(e) => setPatNurseId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {data.nurses.map((n) => (
                  <option key={n.id} value={n.id}>
                    Nurse: {n.name}
                  </option>
                ))}
              </select>
              <select
                value={patCgId}
                onChange={(e) => setPatCgId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {data.caregivers.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caregiver: {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={patHistory}
                onChange={(e) => setPatHistory(e.target.value)}
                placeholder="Medical history notes"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Register Patient
              </button>
            </form>
          </section>

          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Ward & Care Team Assignments</h2>
            <div className="divide-y divide-slate-100">
              {data.patients.map((pat) => (
                <div key={pat.id} className="py-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      {pat.name} <span className="text-xs font-mono text-slate-500">({pat.age}y)</span>
                    </span>
                    <StatusLabel status={pat.conditionStatus} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <input
                      type="text"
                      defaultValue={pat.roomNumber}
                      onBlur={(e) => {
                        if (e.target.value !== pat.roomNumber) {
                          handleUpdatePatientAssignment(pat.id, { roomNumber: e.target.value });
                        }
                      }}
                      aria-label={`Room for ${pat.name}`}
                      className="px-2 py-1.5 font-mono border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      defaultValue={pat.bedNumber}
                      onBlur={(e) => {
                        if (e.target.value !== pat.bedNumber) {
                          handleUpdatePatientAssignment(pat.id, { bedNumber: e.target.value });
                        }
                      }}
                      aria-label={`Bed for ${pat.name}`}
                      className="px-2 py-1.5 font-mono border border-slate-300 rounded"
                    />
                    <select
                      value={pat.assignedDoctorId}
                      onChange={(e) =>
                        handleUpdatePatientAssignment(pat.id, { assignedDoctorId: e.target.value })
                      }
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      {data.doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={pat.assignedNurseId}
                      onChange={(e) =>
                        handleUpdatePatientAssignment(pat.id, { assignedNurseId: e.target.value })
                      }
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      {data.nurses.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'ambulances' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Register Ambulance Unit</h1>
            <form onSubmit={handleAddAmbulance} className="space-y-3">
              <input
                type="text"
                required
                value={ambNumber}
                onChange={(e) => setAmbNumber(e.target.value)}
                placeholder="Ambulance ID (e.g. SC-AMB-402)"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={ambDriver}
                onChange={(e) => setAmbDriver(e.target.value)}
                placeholder="Driver Name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={ambPhone}
                onChange={(e) => setAmbPhone(e.target.value)}
                placeholder="Driver Contact Number"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
              <select
                value={ambType}
                onChange={(e) => setAmbType(e.target.value as Ambulance['ambulanceType'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Basic Life Support">Basic Life Support</option>
                <option value="Advanced Cardiac Life Support">Advanced Cardiac Life Support</option>
                <option value="Neonatal ICU">Neonatal ICU</option>
              </select>
              <input
                type="text"
                value={ambLocation}
                onChange={(e) => setAmbLocation(e.target.value)}
                placeholder="Hospital bay / location"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Ambulance
              </button>
            </form>
          </section>

          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Emergency Ambulance Fleet</h2>
            <div className="divide-y divide-slate-100">
              {data.ambulances.map((amb) => (
                <div key={amb.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-slate-900">{amb.ambulanceNumber}</span>
                      <StatusLabel status={amb.availability} />
                    </div>
                    <p className="text-xs text-slate-600">
                      {amb.ambulanceType} · Driver: {amb.driverName} · {amb.hospitalLocation}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={amb.availability}
                      onChange={(e) =>
                        handleAmbulanceStatus(amb.id, e.target.value as Ambulance['availability'])
                      }
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                    >
                      <option value="available">Available</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                    <a
                      href={`tel:${amb.driverContact}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Driver</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </LayoutShell>
  );
}
