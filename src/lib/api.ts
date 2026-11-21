import type {
  Ambulance,
  AppNotification,
  Appointment,
  AuthUser,
  Caregiver,
  DashboardPayload,
  Doctor,
  DoseStatus,
  EmergencyAlert,
  EmergencyStatus,
  Hospital,
  Nurse,
  NursingTask,
  Patient,
  PatientReport,
  UserRole,
} from '../types/healthcare';

let memoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryToken = token;
}

export function getAuthToken(): string | null {
  return memoryToken;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (memoryToken) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }

  const res = await fetch(url, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export interface PublicDirectory {
  hospital: Hospital;
  doctors: { id: string; name: string; department: string; specialization: string }[];
  nurses: { id: string; name: string; department: string }[];
  caregivers: { id: string; name: string; relationship: string }[];
  patientProfiles: { id: string; name: string; hospitalName: string }[];
}

export const api = {
  getPublicDirectory: () => apiFetch<PublicDirectory>('/api/public/directory'),

  register: async (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    linkedProfileId?: string;
    consentGiven: boolean;
    age?: number;
    contactNumber?: string;
    medicalHistory?: string;
  }) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(res.token);
    return res;
  },

  login: async (payload: { email: string; password: string }) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(res.token);
    return res;
  },

  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  getDashboard: () => apiFetch<DashboardPayload>('/api/dashboard'),

  updateHospital: (payload: Partial<Hospital>) =>
    apiFetch<Hospital>('/api/hospital', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  createDoctor: (payload: {
    name: string;
    qualification: string;
    specialization: string;
    department: string;
    roomNumber: string;
    contact: string;
    experienceYears: number;
    availableTimings: string;
    consultationHours: string;
    availableDays: string[];
    appointmentSlots: string[];
  }) =>
    apiFetch<Doctor>('/api/doctors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDoctor: (id: string, payload: Partial<Doctor>) =>
    apiFetch<Doctor>(`/api/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  createNurse: (payload: { name: string; department: string; contact: string; shiftSchedule: string }) =>
    apiFetch<Nurse>('/api/nurses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createCaregiver: (payload: { name: string; relationship: string; contactNumber: string; email: string }) =>
    apiFetch<Caregiver>('/api/caregivers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createPatient: (payload: {
    name: string;
    age: number;
    contactNumber: string;
    medicalHistory: string;
    roomNumber: string;
    bedNumber: string;
    assignedDoctorId: string;
    assignedNurseId: string;
    assignedCaregiverId: string;
  }) =>
    apiFetch<Patient>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePatient: (id: string, payload: Partial<Patient>) =>
    apiFetch<Patient>(`/api/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  bookAppointment: (payload: {
    doctorId: string;
    date: string;
    timeSlot: string;
    reason: string;
    patientId?: string;
  }) =>
    apiFetch<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAppointment: (id: string, payload: { status?: string; date?: string; timeSlot?: string }) =>
    apiFetch<Appointment>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  createPrescription: (payload: {
    patientId: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    treatmentInstructions: string;
    careInstructions: string;
    scheduledDate: string;
    scheduledTime: string;
  }) =>
    apiFetch('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDoseStatus: (id: string, payload: { status: DoseStatus; statusReason?: string }) =>
    apiFetch(`/api/medicine-schedules/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  createNursingTask: (payload: {
    patientId: string;
    title: string;
    description: string;
    dueTime: string;
    priority: 'routine' | 'priority' | 'urgent';
  }) =>
    apiFetch<NursingTask>('/api/nursing-tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateNursingTask: (id: string, status: 'pending' | 'in_progress' | 'completed') =>
    apiFetch<NursingTask>(`/api/nursing-tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  createReport: (payload: {
    patientId: string;
    condition: string;
    temperature: string;
    bloodPressure: string;
    pulseRate: string;
    oxygenSaturation: string;
    generalObservations: string;
    nursingNotes: string;
  }) =>
    apiFetch<PatientReport>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  triggerEmergency: (payload: { locationText: string; coordinates?: { lat: number; lng: number } | null }) =>
    apiFetch<EmergencyAlert>('/api/emergency', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEmergencyStatus: (id: string, status: EmergencyStatus) =>
    apiFetch<EmergencyAlert>(`/api/emergency/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  markNotificationRead: (id: string) =>
    apiFetch<AppNotification>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  sendAnnouncement: (payload: { title: string; message: string; targetRole: UserRole | 'all' }) =>
    apiFetch<AppNotification>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createAmbulance: (payload: {
    ambulanceNumber: string;
    driverName: string;
    driverContact: string;
    ambulanceType: Ambulance['ambulanceType'];
    hospitalLocation: string;
  }) =>
    apiFetch<Ambulance>('/api/ambulances', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAmbulance: (id: string, payload: { availability: Ambulance['availability']; hospitalLocation?: string }) =>
    apiFetch<Ambulance>(`/api/ambulances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
