export type UserRole = 'patient' | 'doctor' | 'nurse' | 'caregiver' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  linkedProfileId: string;
  hospitalId: string;
  consentGiven: boolean;
  createdAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  logoUrl: string;
  address: string;
  location: string;
  googleMapsUrl: string;
  contactNumber: string;
  email: string;
  openingHours: string;
  emergencyHours: string;
}

export interface Doctor {
  id: string;
  name: string;
  photoUrl: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  contact: string;
  hospitalId: string;
  hospitalName: string;
  department: string;
  roomNumber: string;
  availableDays: string[];
  availableTimings: string;
  consultationHours: string;
  unavailableDates: string[];
  appointmentSlots: string[];
}

export interface Nurse {
  id: string;
  name: string;
  department: string;
  contact: string;
  shiftSchedule: string;
  hospitalId: string;
  assignedPatientIds: string[];
}

export interface Caregiver {
  id: string;
  name: string;
  relationship: string;
  contactNumber: string;
  email: string;
  assignedPatientIds: string[];
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  contactNumber: string;
  medicalHistory: string;
  hospitalId: string;
  hospitalName: string;
  roomNumber: string;
  bedNumber: string;
  assignedDoctorId: string;
  assignedNurseId: string;
  assignedCaregiverId: string;
  conditionStatus: 'Stable' | 'Observation' | 'Critical' | 'Recovering';
  consentGiven: boolean;
  updatedAt: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  hospitalName: string;
  roomNumber: string;
  date: string;
  timeSlot: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  treatmentInstructions: string;
  careInstructions: string;
  createdAt: string;
  updatedByUserId: string;
}

export type DoseStatus = 'scheduled' | 'taken' | 'administered' | 'missed' | 'postponed' | 'delayed';

export interface MedicineSchedule {
  id: string;
  prescriptionId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medicineName: string;
  dosage: string;
  scheduledDate: string;
  scheduledTime: string;
  frequency: string;
  instructions: string;
  status: DoseStatus;
  statusReason?: string;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByRole?: UserRole;
}

export interface NursingTask {
  id: string;
  patientId: string;
  patientName: string;
  roomNumber: string;
  bedNumber: string;
  nurseId: string;
  assignedByDoctorId: string;
  assignedByDoctorName: string;
  title: string;
  description: string;
  dueTime: string;
  priority: 'routine' | 'priority' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface PatientReport {
  id: string;
  patientId: string;
  patientName: string;
  recordedByUserId: string;
  recordedByName: string;
  recordedByRole: UserRole;
  condition: string;
  temperature: string;
  bloodPressure: string;
  pulseRate: string;
  oxygenSaturation: string;
  generalObservations: string;
  nursingNotes: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  targetUserId?: string;
  targetRole?: UserRole | 'all';
  category: 'medicine' | 'appointment' | 'doctor_update' | 'nurse_update' | 'announcement' | 'sos';
  title: string;
  message: string;
  readByUserIds: string[];
  createdAt: string;
}

export type EmergencyStatus = 'active' | 'acknowledged' | 'en_route' | 'resolved';

export interface EmergencyAlert {
  id: string;
  patientId: string;
  patientName: string;
  hospitalName: string;
  roomNumber: string;
  bedNumber: string;
  caregiverId: string;
  caregiverName: string;
  caregiverPhone: string;
  locationText: string;
  coordinates?: { lat: number; lng: number } | null;
  status: EmergencyStatus;
  deliveryConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  respondedByUserId?: string;
}

export interface Ambulance {
  id: string;
  ambulanceNumber: string;
  driverName: string;
  driverContact: string;
  availability: 'available' | 'dispatched' | 'maintenance';
  ambulanceType: 'Basic Life Support' | 'Advanced Cardiac Life Support' | 'Neonatal ICU';
  hospitalLocation: string;
}

export interface DashboardPayload {
  user: AuthUser;
  hospital: Hospital;
  doctors: Doctor[];
  nurses: Nurse[];
  caregivers: Caregiver[];
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  medicineSchedules: MedicineSchedule[];
  nursingTasks: NursingTask[];
  patientReports: PatientReport[];
  notifications: AppNotification[];
  emergencyAlerts: EmergencyAlert[];
  ambulances: Ambulance[];
}
