import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import type {
  Ambulance,
  AppNotification,
  Appointment,
  AuthUser,
  Caregiver,
  Doctor,
  DoseStatus,
  EmergencyAlert,
  EmergencyStatus,
  Hospital,
  MedicineSchedule,
  Nurse,
  NursingTask,
  Patient,
  PatientReport,
  Prescription,
  UserRole,
} from './src/types/healthcare.ts';

dotenv.config();

interface StoredUser extends AuthUser {
  passwordHash: string;
  passwordSalt: string;
}

interface SmartCareDatabase {
  users: StoredUser[];
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

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smartcare-db.json');
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

const revokedTokens = new Set<string>();

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

function createInitialDatabase(): SmartCareDatabase {
  const today = todayIsoDate();
  const tomorrowDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return {
    users: [],
    hospital: {
      id: 'hosp-central-01',
      name: 'SmartCare Metropolitan Medical Center',
      logoUrl: '/src/assets/images/hospital_atrium_banner_1795256795697.jpg',
      address: '420 Meridian Healthcare Blvd, Suite 100, Metro City, CA 94107',
      location: 'Downtown Medical District · Building A & East Clinical Wing',
      googleMapsUrl: 'https://maps.google.com/?q=420+Meridian+Healthcare+Blvd+San+Francisco',
      contactNumber: '+1 (415) 555-0190',
      email: 'care-desk@smartcare-medical.org',
      openingHours: 'Mon–Sun: 06:00 AM – 10:00 PM (Outpatient Clinics)',
      emergencyHours: '24/7 Emergency & Trauma Care Open',
    },
    doctors: [
      {
        id: 'doc-jenkins',
        name: 'Dr. Sarah Jenkins, MD',
        photoUrl: '/src/assets/images/doctor_avatar_elena_1795256797547.jpg',
        qualification: 'MD, FACC · Stanford School of Medicine',
        specialization: 'Cardiology & Telemetry',
        experienceYears: 14,
        contact: '+1 (415) 555-0142',
        hospitalId: 'hosp-central-01',
        hospitalName: 'SmartCare Metropolitan Medical Center',
        department: 'Cardiology',
        roomNumber: 'Room 302 · East Wing',
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        availableTimings: '09:00 AM – 04:30 PM',
        consultationHours: '09:00 AM – 01:00 PM & 02:00 PM – 04:30 PM',
        unavailableDates: [],
        appointmentSlots: ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM'],
      },
      {
        id: 'doc-reid',
        name: 'Dr. Alan Reid, MD',
        photoUrl: '/src/assets/images/doctor_avatar_marcus_1795256795133.jpg',
        qualification: 'MD, FACP · Johns Hopkins University',
        specialization: 'Internal Medicine',
        experienceYears: 19,
        contact: '+1 (415) 555-0158',
        hospitalId: 'hosp-central-01',
        hospitalName: 'SmartCare Metropolitan Medical Center',
        department: 'Internal Medicine',
        roomNumber: 'Room 210 · Main Tower',
        availableDays: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'],
        availableTimings: '08:30 AM – 03:30 PM',
        consultationHours: '08:30 AM – 12:30 PM & 01:30 PM – 03:30 PM',
        unavailableDates: [],
        appointmentSlots: ['08:30 AM', '09:30 AM', '11:00 AM', '01:30 PM', '02:30 PM'],
      },
      {
        id: 'doc-sharma',
        name: 'Dr. Priya Sharma, MD',
        photoUrl: '/src/assets/images/doctor_avatar_priya_1795256795443.jpg',
        qualification: 'MD, PhD · UCSF Neurology',
        specialization: 'Neurology & Stroke Care',
        experienceYears: 11,
        contact: '+1 (415) 555-0174',
        hospitalId: 'hosp-central-01',
        hospitalName: 'SmartCare Metropolitan Medical Center',
        department: 'Neurology',
        roomNumber: 'Room 405 · Neuro Wing',
        availableDays: ['Mon', 'Wed', 'Thu', 'Fri'],
        availableTimings: '10:00 AM – 05:00 PM',
        consultationHours: '10:00 AM – 01:00 PM & 02:30 PM – 05:00 PM',
        unavailableDates: [],
        appointmentSlots: ['10:00 AM', '11:00 AM', '02:30 PM', '03:30 PM', '04:30 PM'],
      },
    ],
    nurses: [
      {
        id: 'nurse-claire',
        name: 'Claire Bennett, RN',
        department: 'Cardiology & Telemetry',
        contact: '+1 (415) 555-0121',
        shiftSchedule: 'Day Shift · 07:00 AM – 07:00 PM',
        hospitalId: 'hosp-central-01',
        assignedPatientIds: ['pat-101', 'pat-102'],
      },
      {
        id: 'nurse-david',
        name: 'David Morales, BSN, RN',
        department: 'Internal Medicine & Neurology',
        contact: '+1 (415) 555-0136',
        shiftSchedule: 'Evening Shift · 01:00 PM – 09:00 PM',
        hospitalId: 'hosp-central-01',
        assignedPatientIds: ['pat-103'],
      },
    ],
    caregivers: [
      {
        id: 'cg-maya',
        name: 'Maya Patel',
        relationship: 'Spouse & Primary Caregiver',
        contactNumber: '+1 (415) 555-0188',
        email: 'maya.patel@familycare.example',
        assignedPatientIds: ['pat-101'],
      },
      {
        id: 'cg-robert',
        name: 'Robert Chen',
        relationship: 'Son & Emergency Contact',
        contactNumber: '+1 (415) 555-0195',
        email: 'robert.chen@familycare.example',
        assignedPatientIds: ['pat-102', 'pat-103'],
      },
    ],
    patients: [
      {
        id: 'pat-101',
        name: 'Aarav Patel',
        age: 58,
        contactNumber: '+1 (415) 555-0162',
        medicalHistory: 'Mild hypertension (managed since 2021), post-angioplasty recovery monitoring.',
        hospitalId: 'hosp-central-01',
        hospitalName: 'SmartCare Metropolitan Medical Center',
        roomNumber: 'Room 304',
        bedNumber: 'Bed B',
        assignedDoctorId: 'doc-jenkins',
        assignedNurseId: 'nurse-claire',
        assignedCaregiverId: 'cg-maya',
        conditionStatus: 'Stable',
        consentGiven: true,
        updatedAt: nowIso(),
      },
      {
        id: 'pat-102',
        name: 'Evelyn Chen',
        age: 67,
        contactNumber: '+1 (415) 555-0169',
        medicalHistory: 'Type 2 Diabetes Mellitus, atrial fibrillation observation.',
        hospitalId: 'hosp-central-01',
        hospitalName: 'SmartCare Metropolitan Medical Center',
        roomNumber: 'Room 306',
        bedNumber: 'Bed A',
        assignedDoctorId: 'doc-reid',
        assignedNurseId: 'nurse-claire',
        assignedCaregiverId: 'cg-robert',
        conditionStatus: 'Observation',
        consentGiven: true,
        updatedAt: nowIso(),
      },
      {
        id: 'pat-103',
        name: 'Samuel Okafor',
        age: 44,
        contactNumber: '+1 (415) 555-0179',
        medicalHistory: 'Migraine aura evaluation, cervical nerve compression follow-up.',
        hospitalId: 'hosp-central-01',
        hospitalName: 'SmartCare Metropolitan Medical Center',
        roomNumber: 'Room 408',
        bedNumber: 'Bed C',
        assignedDoctorId: 'doc-sharma',
        assignedNurseId: 'nurse-david',
        assignedCaregiverId: 'cg-robert',
        conditionStatus: 'Recovering',
        consentGiven: true,
        updatedAt: nowIso(),
      },
    ],
    appointments: [
      {
        id: 'apt-001',
        patientId: 'pat-101',
        patientName: 'Aarav Patel',
        doctorId: 'doc-jenkins',
        doctorName: 'Dr. Sarah Jenkins, MD',
        department: 'Cardiology',
        hospitalName: 'SmartCare Metropolitan Medical Center',
        roomNumber: 'Room 302 · East Wing',
        date: tomorrowDate,
        timeSlot: '10:00 AM',
        reason: 'Post-procedure ECG & blood pressure review',
        status: 'confirmed',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        id: 'apt-002',
        patientId: 'pat-102',
        patientName: 'Evelyn Chen',
        doctorId: 'doc-reid',
        doctorName: 'Dr. Alan Reid, MD',
        department: 'Internal Medicine',
        hospitalName: 'SmartCare Metropolitan Medical Center',
        roomNumber: 'Room 210 · Main Tower',
        date: tomorrowDate,
        timeSlot: '09:30 AM',
        reason: 'Glycemic panel & medication titration',
        status: 'pending',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    prescriptions: [
      {
        id: 'rx-001',
        patientId: 'pat-101',
        patientName: 'Aarav Patel',
        doctorId: 'doc-jenkins',
        doctorName: 'Dr. Sarah Jenkins, MD',
        medicineName: 'Lisinopril',
        dosage: '10 mg Tablet',
        frequency: 'Once daily (Morning)',
        treatmentInstructions: 'Monitor systolic blood pressure before morning dose.',
        careInstructions: 'Maintain low-sodium hydration and light hallway ambulation twice daily.',
        createdAt: nowIso(),
        updatedByUserId: 'doc-jenkins',
      },
      {
        id: 'rx-002',
        patientId: 'pat-101',
        patientName: 'Aarav Patel',
        doctorId: 'doc-jenkins',
        doctorName: 'Dr. Sarah Jenkins, MD',
        medicineName: 'Atorvastatin',
        dosage: '20 mg Tablet',
        frequency: 'Once daily (Evening)',
        treatmentInstructions: 'Administer after evening meal with full glass of water.',
        careInstructions: 'Avoid grapefruit products during course.',
        createdAt: nowIso(),
        updatedByUserId: 'doc-jenkins',
      },
      {
        id: 'rx-003',
        patientId: 'pat-102',
        patientName: 'Evelyn Chen',
        doctorId: 'doc-reid',
        doctorName: 'Dr. Alan Reid, MD',
        medicineName: 'Metformin XR',
        dosage: '500 mg Extended Release',
        frequency: 'Twice daily with meals',
        treatmentInstructions: 'Check fasting capillary glucose prior to breakfast dose.',
        careInstructions: 'Notify doctor if blood glucose drops below 70 mg/dL.',
        createdAt: nowIso(),
        updatedByUserId: 'doc-reid',
      },
    ],
    medicineSchedules: [
      {
        id: 'med-001',
        prescriptionId: 'rx-001',
        patientId: 'pat-101',
        patientName: 'Aarav Patel',
        doctorId: 'doc-jenkins',
        doctorName: 'Dr. Sarah Jenkins, MD',
        medicineName: 'Lisinopril',
        dosage: '10 mg Tablet',
        scheduledDate: today,
        scheduledTime: '08:00',
        frequency: 'Once daily (Morning)',
        instructions: 'Take with water after checking morning blood pressure.',
        status: 'administered',
        updatedAt: nowIso(),
        updatedByUserId: 'nurse-claire',
        updatedByRole: 'nurse',
      },
      {
        id: 'med-002',
        prescriptionId: 'rx-002',
        patientId: 'pat-101',
        patientName: 'Aarav Patel',
        doctorId: 'doc-jenkins',
        doctorName: 'Dr. Sarah Jenkins, MD',
        medicineName: 'Atorvastatin',
        dosage: '20 mg Tablet',
        scheduledDate: today,
        scheduledTime: '20:00',
        frequency: 'Once daily (Evening)',
        instructions: 'Take after dinner.',
        status: 'scheduled',
        updatedAt: nowIso(),
      },
      {
        id: 'med-003',
        prescriptionId: 'rx-003',
        patientId: 'pat-102',
        patientName: 'Evelyn Chen',
        doctorId: 'doc-reid',
        doctorName: 'Dr. Alan Reid, MD',
        medicineName: 'Metformin XR',
        dosage: '500 mg Extended Release',
        scheduledDate: today,
        scheduledTime: '12:30',
        frequency: 'Twice daily with meals',
        instructions: 'Administer with lunch.',
        status: 'scheduled',
        updatedAt: nowIso(),
      },
    ],
    nursingTasks: [
      {
        id: 'task-001',
        patientId: 'pat-101',
        patientName: 'Aarav Patel',
        roomNumber: 'Room 304',
        bedNumber: 'Bed B',
        nurseId: 'nurse-claire',
        assignedByDoctorId: 'doc-jenkins',
        assignedByDoctorName: 'Dr. Sarah Jenkins, MD',
        title: '12-Lead ECG & Telemetry Lead Check',
        description: 'Confirm electrode placement and record afternoon resting heart rate.',
        dueTime: '14:00',
        priority: 'priority',
        status: 'pending',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        id: 'task-002',
        patientId: 'pat-102',
        patientName: 'Evelyn Chen',
        roomNumber: 'Room 306',
        bedNumber: 'Bed A',
        nurseId: 'nurse-claire',
        assignedByDoctorId: 'doc-reid',
        assignedByDoctorName: 'Dr. Alan Reid, MD',
        title: 'Pre-Lunch Blood Glucose & BP Check',
        description: 'Document capillary glucose and supine blood pressure before Metformin XR.',
        dueTime: '12:15',
        priority: 'urgent',
        status: 'in_progress',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    patientReports: [
      {
        id: 'rep-001',
        patientId: 'pat-101',
        patientName: 'Aarav Patel',
        recordedByUserId: 'nurse-claire',
        recordedByName: 'Claire Bennett, RN',
        recordedByRole: 'nurse',
        condition: 'Stable',
        temperature: '98.4 °F',
        bloodPressure: '124/78 mmHg',
        pulseRate: '70 bpm',
        oxygenSaturation: '99%',
        generalObservations: 'Alert, oriented, resting comfortably without chest discomfort.',
        nursingNotes: 'Morning Lisinopril 10 mg administered on time. Ambulating well.',
        createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
      },
      {
        id: 'rep-002',
        patientId: 'pat-102',
        patientName: 'Evelyn Chen',
        recordedByUserId: 'nurse-claire',
        recordedByName: 'Claire Bennett, RN',
        recordedByRole: 'nurse',
        condition: 'Observation',
        temperature: '98.9 °F',
        bloodPressure: '132/82 mmHg',
        pulseRate: '84 bpm',
        oxygenSaturation: '97%',
        generalObservations: 'Mild fatigue noted earlier; hydration encouraged.',
        nursingNotes: 'Scheduled for afternoon metabolic panel review with Dr. Reid.',
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
    ],
    notifications: [
      {
        id: 'notif-001',
        targetRole: 'all',
        category: 'announcement',
        title: 'Hospital Visitor & Hygiene Protocol',
        message: 'East Wing Cardiology visiting hours are 10:00 AM – 08:00 PM daily. Hand sanitization is required upon ward entry.',
        readByUserIds: [],
        createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      },
      {
        id: 'notif-002',
        targetRole: 'patient',
        category: 'medicine',
        title: 'Upcoming Evening Dose: Atorvastatin 20 mg',
        message: 'Scheduled for 20:00 today after dinner. Reminder is a scheduling aid and does not replace medical supervision.',
        readByUserIds: [],
        createdAt: new Date(Date.now() - 1800 * 1000).toISOString(),
      },
    ],
    emergencyAlerts: [],
    ambulances: [
      {
        id: 'amb-001',
        ambulanceNumber: 'SC-AMB-104',
        driverName: 'Marcus Vance',
        driverContact: '+1 (415) 555-0911',
        availability: 'available',
        ambulanceType: 'Advanced Cardiac Life Support',
        hospitalLocation: 'Bay 1 · Emergency Entrance North',
      },
      {
        id: 'amb-002',
        ambulanceNumber: 'SC-AMB-209',
        driverName: 'Elena Gomez',
        driverContact: '+1 (415) 555-0912',
        availability: 'available',
        ambulanceType: 'Basic Life Support',
        hospitalLocation: 'Bay 3 · Main Ambulance Ramp',
      },
      {
        id: 'amb-003',
        ambulanceNumber: 'SC-AMB-315',
        driverName: 'Tariq Hassan',
        driverContact: '+1 (415) 555-0913',
        availability: 'dispatched',
        ambulanceType: 'Neonatal ICU',
        hospitalLocation: 'En Route · Downtown Sector 4',
      },
    ],
  };
}

function loadDatabase(): SmartCareDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as SmartCareDatabase;
  } catch {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

let db: SmartCareDatabase = loadDatabase();

function saveDatabase(): void {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const derived = crypto.scryptSync(password, storedSalt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (derived.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, storedBuf);
}

function signToken(user: AuthUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      exp: Date.now() + TOKEN_TTL_MS,
      jti: crypto.randomUUID(),
    }),
    'utf-8'
  ).toString('base64url');

  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): { sub: string; role: UserRole; exp: number; jti: string } | null {
  if (!token || revokedTokens.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub: string;
      role: UserRole;
      exp: number;
      jti: string;
    };
    if (!parsed.sub || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeText(value: unknown, maxLength = 300): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isValidRole(role: unknown): role is UserRole {
  return role === 'patient' || role === 'doctor' || role === 'nurse' || role === 'caregiver' || role === 'admin';
}

function toPublicUser(u: StoredUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    linkedProfileId: u.linkedProfileId,
    hospitalId: u.hospitalId,
    consentGiven: u.consentGiven,
    createdAt: u.createdAt,
  };
}

interface AuthedRequest extends Request {
  authUser?: StoredUser;
  authToken?: string;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const claims = verifyToken(token);
  if (!claims) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  const user = db.users.find((u) => u.id === claims.sub);
  if (!user) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }
  req.authUser = user;
  req.authToken = token;
  next();
}

function requireRoles(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}

function createNotification(input: Omit<AppNotification, 'id' | 'readByUserIds' | 'createdAt'>): AppNotification {
  const item: AppNotification = {
    id: `notif-${crypto.randomUUID().slice(0, 8)}`,
    readByUserIds: [],
    createdAt: nowIso(),
    ...input,
  };
  db.notifications.unshift(item);
  if (db.notifications.length > 150) {
    db.notifications = db.notifications.slice(0, 150);
  }
  return item;
}

function getScopedPayload(user: StoredUser) {
  const role = user.role;
  const profileId = user.linkedProfileId;

  let patients = db.patients;
  let appointments = db.appointments;
  let prescriptions = db.prescriptions;
  let medicineSchedules = db.medicineSchedules;
  let nursingTasks = db.nursingTasks;
  let patientReports = db.patientReports;
  let emergencyAlerts = db.emergencyAlerts;

  if (role === 'patient') {
    patients = db.patients.filter((p) => p.id === profileId);
    appointments = db.appointments.filter((a) => a.patientId === profileId);
    prescriptions = db.prescriptions.filter((rx) => rx.patientId === profileId);
    medicineSchedules = db.medicineSchedules.filter((m) => m.patientId === profileId);
    nursingTasks = db.nursingTasks.filter((t) => t.patientId === profileId);
    patientReports = db.patientReports.filter((r) => r.patientId === profileId);
    emergencyAlerts = db.emergencyAlerts.filter((e) => e.patientId === profileId);
  } else if (role === 'doctor') {
    const assignedPatientIds = new Set(
      db.patients.filter((p) => p.assignedDoctorId === profileId).map((p) => p.id)
    );
    patients = db.patients.filter((p) => assignedPatientIds.has(p.id));
    appointments = db.appointments.filter((a) => a.doctorId === profileId);
    prescriptions = db.prescriptions.filter((rx) => rx.doctorId === profileId || assignedPatientIds.has(rx.patientId));
    medicineSchedules = db.medicineSchedules.filter((m) => assignedPatientIds.has(m.patientId));
    nursingTasks = db.nursingTasks.filter((t) => t.assignedByDoctorId === profileId || assignedPatientIds.has(t.patientId));
    patientReports = db.patientReports.filter((r) => assignedPatientIds.has(r.patientId));
    emergencyAlerts = db.emergencyAlerts.filter((e) => assignedPatientIds.has(e.patientId));
  } else if (role === 'nurse') {
    const nurseRecord = db.nurses.find((n) => n.id === profileId);
    const assignedPatientIds = new Set(
      db.patients
        .filter((p) => p.assignedNurseId === profileId || nurseRecord?.assignedPatientIds.includes(p.id))
        .map((p) => p.id)
    );
    patients = db.patients.filter((p) => assignedPatientIds.has(p.id));
    appointments = [];
    prescriptions = db.prescriptions.filter((rx) => assignedPatientIds.has(rx.patientId));
    medicineSchedules = db.medicineSchedules.filter((m) => assignedPatientIds.has(m.patientId));
    nursingTasks = db.nursingTasks.filter((t) => t.nurseId === profileId || assignedPatientIds.has(t.patientId));
    patientReports = db.patientReports.filter((r) => assignedPatientIds.has(r.patientId));
    emergencyAlerts = db.emergencyAlerts.filter((e) => assignedPatientIds.has(e.patientId));
  } else if (role === 'caregiver') {
    const cgRecord = db.caregivers.find((c) => c.id === profileId);
    const assignedPatientIds = new Set(
      db.patients
        .filter((p) => p.assignedCaregiverId === profileId || cgRecord?.assignedPatientIds.includes(p.id))
        .map((p) => p.id)
    );
    patients = db.patients.filter((p) => assignedPatientIds.has(p.id));
    appointments = db.appointments.filter((a) => assignedPatientIds.has(a.patientId));
    prescriptions = [];
    medicineSchedules = [];
    nursingTasks = [];
    patientReports = [];
    emergencyAlerts = db.emergencyAlerts.filter(
      (e) => e.caregiverId === profileId || assignedPatientIds.has(e.patientId)
    );
  }

  const notifications = db.notifications.filter((n) => {
    if (n.targetUserId && n.targetUserId === user.id) return true;
    if (n.targetUserId && n.targetUserId === profileId) return true;
    if (n.targetRole === 'all' || n.targetRole === role) return true;
    return false;
  });

  return {
    user: toPublicUser(user),
    hospital: db.hospital,
    doctors: db.doctors,
    nurses: db.nurses,
    caregivers: db.caregivers,
    patients,
    appointments,
    prescriptions,
    medicineSchedules,
    nursingTasks,
    patientReports,
    notifications,
    emergencyAlerts,
    ambulances: db.ambulances,
  };
}

function runScheduledMedicationReminderCheck(): void {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let changed = false;
  for (const med of db.medicineSchedules) {
    if (med.status !== 'scheduled' || med.scheduledDate !== today) continue;
    const [hhStr, mmStr] = med.scheduledTime.split(':');
    const hh = Number(hhStr);
    const mm = Number(mmStr);
    if (Number.isNaN(hh) || Number.isNaN(mm)) continue;

    const schedMinutes = hh * 60 + mm;
    const diff = schedMinutes - currentMinutes;
    if (diff >= -5 && diff <= 15) {
      const marker = `[REMINDER:${med.id}:${today}]`;
      const alreadySent = db.notifications.some((n) => n.message.includes(marker));
      if (!alreadySent) {
        const patient = db.patients.find((p) => p.id === med.patientId);
        createNotification({
          targetUserId: med.patientId,
          targetRole: 'patient',
          category: 'medicine',
          title: `Medicine Reminder: ${med.medicineName} (${med.dosage})`,
          message: `Scheduled at ${med.scheduledTime}. ${med.instructions} ${marker}`,
        });
        if (patient?.assignedNurseId) {
          createNotification({
            targetUserId: patient.assignedNurseId,
            targetRole: 'nurse',
            category: 'medicine',
            title: `Nurse Dose Due: ${med.patientName} — ${med.medicineName}`,
            message: `${med.dosage} scheduled at ${med.scheduledTime} (${patient.roomNumber} · ${patient.bedNumber}). ${marker}`,
          });
        }
        changed = true;
      }
    }
  }
  if (changed) {
    saveDatabase();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public hospital & profile options for registration linking (no patient PII exposed)
  app.get('/api/public/directory', (_req, res) => {
    res.json({
      hospital: db.hospital,
      doctors: db.doctors.map((d) => ({
        id: d.id,
        name: d.name,
        department: d.department,
        specialization: d.specialization,
      })),
      nurses: db.nurses.map((n) => ({
        id: n.id,
        name: n.name,
        department: n.department,
      })),
      caregivers: db.caregivers.map((c) => ({
        id: c.id,
        name: c.name,
        relationship: c.relationship,
      })),
      patientProfiles: db.patients.map((p) => ({
        id: p.id,
        name: p.name,
        hospitalName: p.hospitalName,
      })),
    });
  });

  // Register account
  app.post('/api/auth/register', (req, res) => {
    const name = sanitizeText(req.body?.name, 100);
    const email = sanitizeText(req.body?.email, 150).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role;
    const requestedProfileId = sanitizeText(req.body?.linkedProfileId, 80);
    const consentGiven = Boolean(req.body?.consentGiven);
    const age = Number(req.body?.age || 35);
    const contactNumber = sanitizeText(req.body?.contactNumber, 40) || '+1 (415) 555-0100';
    const medicalHistory = sanitizeText(req.body?.medicalHistory, 600) || 'No major chronic history reported.';

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Please provide your full name (at least 2 characters).' });
      return;
    }
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
      return;
    }
    if (!isValidRole(role)) {
      res.status(400).json({ error: 'Please choose a valid SmartCare user role.' });
      return;
    }
    if (!consentGiven) {
      res.status(400).json({ error: 'Please confirm data privacy & healthcare coordination consent to register.' });
      return;
    }
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
      return;
    }

    let linkedProfileId = '';

    if (role === 'patient') {
      const existing = requestedProfileId ? db.patients.find((p) => p.id === requestedProfileId) : undefined;
      if (existing) {
        linkedProfileId = existing.id;
      } else {
        const newPatientId = `pat-${crypto.randomUUID().slice(0, 6)}`;
        const defaultDoctor = db.doctors[0];
        const defaultNurse = db.nurses[0];
        const defaultCaregiver = db.caregivers[0];
        const newPatient: Patient = {
          id: newPatientId,
          name,
          age: Number.isFinite(age) && age > 0 && age < 125 ? Math.round(age) : 35,
          contactNumber,
          medicalHistory,
          hospitalId: db.hospital.id,
          hospitalName: db.hospital.name,
          roomNumber: 'Outpatient / Ward TBD',
          bedNumber: 'Unassigned',
          assignedDoctorId: defaultDoctor?.id || '',
          assignedNurseId: defaultNurse?.id || '',
          assignedCaregiverId: defaultCaregiver?.id || '',
          conditionStatus: 'Stable',
          consentGiven: true,
          updatedAt: nowIso(),
        };
        db.patients.push(newPatient);
        if (defaultNurse && !defaultNurse.assignedPatientIds.includes(newPatientId)) {
          defaultNurse.assignedPatientIds.push(newPatientId);
        }
        if (defaultCaregiver && !defaultCaregiver.assignedPatientIds.includes(newPatientId)) {
          defaultCaregiver.assignedPatientIds.push(newPatientId);
        }
        linkedProfileId = newPatientId;
      }
    } else if (role === 'doctor') {
      const existing = requestedProfileId ? db.doctors.find((d) => d.id === requestedProfileId) : undefined;
      if (existing) {
        linkedProfileId = existing.id;
      } else {
        const newDocId = `doc-${crypto.randomUUID().slice(0, 6)}`;
        db.doctors.push({
          id: newDocId,
          name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
          photoUrl: '/src/assets/images/doctor_avatar_elena_1795256797547.jpg',
          qualification: 'MD · General Medicine',
          specialization: 'General Practice',
          experienceYears: 5,
          contact: contactNumber,
          hospitalId: db.hospital.id,
          hospitalName: db.hospital.name,
          department: 'Outpatient Clinic',
          roomNumber: 'Room 108 · Main Wing',
          availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          availableTimings: '09:00 AM – 05:00 PM',
          consultationHours: '09:00 AM – 01:00 PM & 02:00 PM – 05:00 PM',
          unavailableDates: [],
          appointmentSlots: ['09:00 AM', '10:30 AM', '02:00 PM', '03:30 PM'],
        });
        linkedProfileId = newDocId;
      }
    } else if (role === 'nurse') {
      const existing = requestedProfileId ? db.nurses.find((n) => n.id === requestedProfileId) : undefined;
      if (existing) {
        linkedProfileId = existing.id;
      } else {
        const newNurseId = `nurse-${crypto.randomUUID().slice(0, 6)}`;
        db.nurses.push({
          id: newNurseId,
          name,
          department: 'General Care',
          contact: contactNumber,
          shiftSchedule: 'Day Shift · 07:00 AM – 07:00 PM',
          hospitalId: db.hospital.id,
          assignedPatientIds: db.patients.slice(0, 1).map((p) => p.id),
        });
        linkedProfileId = newNurseId;
      }
    } else if (role === 'caregiver') {
      const existing = requestedProfileId ? db.caregivers.find((c) => c.id === requestedProfileId) : undefined;
      if (existing) {
        linkedProfileId = existing.id;
      } else {
        const newCgId = `cg-${crypto.randomUUID().slice(0, 6)}`;
        db.caregivers.push({
          id: newCgId,
          name,
          relationship: 'Family Caregiver',
          contactNumber,
          email,
          assignedPatientIds: db.patients.slice(0, 1).map((p) => p.id),
        });
        linkedProfileId = newCgId;
      }
    } else {
      linkedProfileId = 'admin-01';
    }

    const { hash, salt } = hashPassword(password);
    const newUser: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      name,
      email,
      role,
      linkedProfileId,
      hospitalId: db.hospital.id,
      consentGiven: true,
      createdAt: nowIso(),
      passwordHash: hash,
      passwordSalt: salt,
    };

    db.users.push(newUser);
    saveDatabase();

    const token = signToken(toPublicUser(newUser));
    res.status(201).json({
      token,
      user: toPublicUser(newUser),
    });
  });

  // Sign in
  app.post('/api/auth/login', (req, res) => {
    const email = sanitizeText(req.body?.email, 150).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = db.users.find((u) => u.email === email);
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken(toPublicUser(user));
    res.json({
      token,
      user: toPublicUser(user),
    });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthedRequest, res) => {
    if (req.authToken) {
      revokedTokens.add(req.authToken);
    }
    res.json({ ok: true });
  });

  app.get('/api/dashboard', requireAuth, (req: AuthedRequest, res) => {
    res.json(getScopedPayload(req.authUser!));
  });

  // Hospital management (Admin only)
  app.put('/api/hospital', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const name = sanitizeText(req.body?.name, 140);
    const address = sanitizeText(req.body?.address, 260);
    const location = sanitizeText(req.body?.location, 200);
    const googleMapsUrl = sanitizeText(req.body?.googleMapsUrl, 300);
    const contactNumber = sanitizeText(req.body?.contactNumber, 50);
    const email = sanitizeText(req.body?.email, 120);
    const openingHours = sanitizeText(req.body?.openingHours, 140);
    const emergencyHours = sanitizeText(req.body?.emergencyHours, 140);

    if (!name || !address || !contactNumber) {
      res.status(400).json({ error: 'Hospital name, address, and contact number are required.' });
      return;
    }
    if (googleMapsUrl && !/^https?:\/\//i.test(googleMapsUrl)) {
      res.status(400).json({ error: 'Google Maps link must start with https:// or http://.' });
      return;
    }

    db.hospital = {
      ...db.hospital,
      name,
      address,
      location: location || db.hospital.location,
      googleMapsUrl: googleMapsUrl || db.hospital.googleMapsUrl,
      contactNumber,
      email: email || db.hospital.email,
      openingHours: openingHours || db.hospital.openingHours,
      emergencyHours: emergencyHours || db.hospital.emergencyHours,
    };

    for (const p of db.patients) {
      p.hospitalName = name;
    }
    for (const d of db.doctors) {
      d.hospitalName = name;
    }

    saveDatabase();
    res.json(db.hospital);
  });

  // Doctors: Admin can add/edit any doctor; Doctor can update their own availability
  app.post('/api/doctors', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const name = sanitizeText(req.body?.name, 100);
    const qualification = sanitizeText(req.body?.qualification, 120);
    const specialization = sanitizeText(req.body?.specialization, 120);
    const department = sanitizeText(req.body?.department, 100);
    const roomNumber = sanitizeText(req.body?.roomNumber, 80);
    const contact = sanitizeText(req.body?.contact, 50);
    const experienceYears = Number(req.body?.experienceYears || 5);
    const availableTimings = sanitizeText(req.body?.availableTimings, 100) || '09:00 AM – 05:00 PM';
    const consultationHours = sanitizeText(req.body?.consultationHours, 140) || '09:00 AM – 01:00 PM';
    const availableDays = Array.isArray(req.body?.availableDays)
      ? req.body.availableDays.map((d: unknown) => sanitizeText(d, 20)).filter(Boolean).slice(0, 7)
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const appointmentSlots = Array.isArray(req.body?.appointmentSlots)
      ? req.body.appointmentSlots.map((s: unknown) => sanitizeText(s, 30)).filter(Boolean).slice(0, 20)
      : ['09:00 AM', '10:30 AM', '02:00 PM', '03:30 PM'];

    if (!name || !department || !roomNumber) {
      res.status(400).json({ error: 'Doctor name, department, and room number are required.' });
      return;
    }

    const doctor: Doctor = {
      id: `doc-${crypto.randomUUID().slice(0, 6)}`,
      name,
      photoUrl: '/src/assets/images/doctor_avatar_marcus_1795256795133.jpg',
      qualification: qualification || 'MD',
      specialization: specialization || department,
      experienceYears: Number.isFinite(experienceYears) && experienceYears >= 0 ? Math.min(70, experienceYears) : 5,
      contact: contact || db.hospital.contactNumber,
      hospitalId: db.hospital.id,
      hospitalName: db.hospital.name,
      department,
      roomNumber,
      availableDays,
      availableTimings,
      consultationHours,
      unavailableDates: [],
      appointmentSlots,
    };

    db.doctors.push(doctor);
    saveDatabase();
    res.status(201).json(doctor);
  });

  app.put('/api/doctors/:id', requireAuth, requireRoles('admin', 'doctor'), (req: AuthedRequest, res) => {
    const docId = sanitizeText(req.params.id, 80);
    const doctor = db.doctors.find((d) => d.id === docId);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor record not found.' });
      return;
    }
    if (req.authUser!.role === 'doctor' && req.authUser!.linkedProfileId !== docId) {
      res.status(403).json({ error: 'Doctors may only update their own availability profile.' });
      return;
    }

    if (req.authUser!.role === 'admin') {
      doctor.name = sanitizeText(req.body?.name, 100) || doctor.name;
      doctor.qualification = sanitizeText(req.body?.qualification, 120) || doctor.qualification;
      doctor.specialization = sanitizeText(req.body?.specialization, 120) || doctor.specialization;
      doctor.department = sanitizeText(req.body?.department, 100) || doctor.department;
      doctor.roomNumber = sanitizeText(req.body?.roomNumber, 80) || doctor.roomNumber;
      doctor.contact = sanitizeText(req.body?.contact, 50) || doctor.contact;
    }

    if (Array.isArray(req.body?.availableDays)) {
      doctor.availableDays = req.body.availableDays.map((d: unknown) => sanitizeText(d, 20)).filter(Boolean).slice(0, 7);
    }
    if (typeof req.body?.availableTimings === 'string') {
      doctor.availableTimings = sanitizeText(req.body.availableTimings, 100) || doctor.availableTimings;
    }
    if (typeof req.body?.consultationHours === 'string') {
      doctor.consultationHours = sanitizeText(req.body.consultationHours, 140) || doctor.consultationHours;
    }
    if (Array.isArray(req.body?.unavailableDates)) {
      doctor.unavailableDates = req.body.unavailableDates.map((d: unknown) => sanitizeText(d, 20)).filter(Boolean).slice(0, 30);
    }
    if (Array.isArray(req.body?.appointmentSlots)) {
      doctor.appointmentSlots = req.body.appointmentSlots.map((s: unknown) => sanitizeText(s, 30)).filter(Boolean).slice(0, 20);
    }

    saveDatabase();
    res.json(doctor);
  });

  // Nurses (Admin only)
  app.post('/api/nurses', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const name = sanitizeText(req.body?.name, 100);
    const department = sanitizeText(req.body?.department, 100);
    const contact = sanitizeText(req.body?.contact, 50);
    const shiftSchedule = sanitizeText(req.body?.shiftSchedule, 100) || 'Day Shift · 07:00 AM – 07:00 PM';

    if (!name || !department) {
      res.status(400).json({ error: 'Nurse name and department are required.' });
      return;
    }

    const nurse: Nurse = {
      id: `nurse-${crypto.randomUUID().slice(0, 6)}`,
      name,
      department,
      contact: contact || db.hospital.contactNumber,
      shiftSchedule,
      hospitalId: db.hospital.id,
      assignedPatientIds: [],
    };
    db.nurses.push(nurse);
    saveDatabase();
    res.status(201).json(nurse);
  });

  app.put('/api/nurses/:id', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const nurse = db.nurses.find((n) => n.id === sanitizeText(req.params.id, 80));
    if (!nurse) {
      res.status(404).json({ error: 'Nurse not found.' });
      return;
    }
    nurse.department = sanitizeText(req.body?.department, 100) || nurse.department;
    nurse.shiftSchedule = sanitizeText(req.body?.shiftSchedule, 100) || nurse.shiftSchedule;
    nurse.contact = sanitizeText(req.body?.contact, 50) || nurse.contact;
    saveDatabase();
    res.json(nurse);
  });

  // Caregivers (Admin only)
  app.post('/api/caregivers', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const name = sanitizeText(req.body?.name, 100);
    const relationship = sanitizeText(req.body?.relationship, 80) || 'Family Caregiver';
    const contactNumber = sanitizeText(req.body?.contactNumber, 50);
    const email = sanitizeText(req.body?.email, 140);

    if (!name || !contactNumber) {
      res.status(400).json({ error: 'Caregiver name and contact number are required.' });
      return;
    }

    const cg: Caregiver = {
      id: `cg-${crypto.randomUUID().slice(0, 6)}`,
      name,
      relationship,
      contactNumber,
      email,
      assignedPatientIds: [],
    };
    db.caregivers.push(cg);
    saveDatabase();
    res.status(201).json(cg);
  });

  // Patients registration & care-team assignment (Admin only)
  app.post('/api/patients', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const name = sanitizeText(req.body?.name, 100);
    const age = Number(req.body?.age || 30);
    const contactNumber = sanitizeText(req.body?.contactNumber, 50);
    const medicalHistory = sanitizeText(req.body?.medicalHistory, 600);
    const roomNumber = sanitizeText(req.body?.roomNumber, 40) || 'Room 101';
    const bedNumber = sanitizeText(req.body?.bedNumber, 30) || 'Bed A';
    const assignedDoctorId = sanitizeText(req.body?.assignedDoctorId, 80);
    const assignedNurseId = sanitizeText(req.body?.assignedNurseId, 80);
    const assignedCaregiverId = sanitizeText(req.body?.assignedCaregiverId, 80);

    if (!name || !contactNumber) {
      res.status(400).json({ error: 'Patient name and contact number are required.' });
      return;
    }

    const patient: Patient = {
      id: `pat-${crypto.randomUUID().slice(0, 6)}`,
      name,
      age: Number.isFinite(age) && age > 0 && age < 125 ? Math.round(age) : 30,
      contactNumber,
      medicalHistory: medicalHistory || 'Initial admission assessment pending.',
      hospitalId: db.hospital.id,
      hospitalName: db.hospital.name,
      roomNumber,
      bedNumber,
      assignedDoctorId,
      assignedNurseId,
      assignedCaregiverId,
      conditionStatus: 'Stable',
      consentGiven: true,
      updatedAt: nowIso(),
    };

    db.patients.push(patient);
    const nurse = db.nurses.find((n) => n.id === assignedNurseId);
    if (nurse && !nurse.assignedPatientIds.includes(patient.id)) {
      nurse.assignedPatientIds.push(patient.id);
    }
    const cg = db.caregivers.find((c) => c.id === assignedCaregiverId);
    if (cg && !cg.assignedPatientIds.includes(patient.id)) {
      cg.assignedPatientIds.push(patient.id);
    }

    saveDatabase();
    res.status(201).json(patient);
  });

  app.put('/api/patients/:id', requireAuth, requireRoles('admin', 'doctor'), (req: AuthedRequest, res) => {
    const patient = db.patients.find((p) => p.id === sanitizeText(req.params.id, 80));
    if (!patient) {
      res.status(404).json({ error: 'Patient not found.' });
      return;
    }

    if (req.authUser!.role === 'doctor') {
      if (patient.assignedDoctorId !== req.authUser!.linkedProfileId) {
        res.status(403).json({ error: 'You may only update patients assigned to you.' });
        return;
      }
      const conditionStatus = req.body?.conditionStatus;
      if (
        conditionStatus === 'Stable' ||
        conditionStatus === 'Observation' ||
        conditionStatus === 'Critical' ||
        conditionStatus === 'Recovering'
      ) {
        patient.conditionStatus = conditionStatus;
      }
      if (typeof req.body?.medicalHistory === 'string') {
        patient.medicalHistory = sanitizeText(req.body.medicalHistory, 800) || patient.medicalHistory;
      }
      patient.updatedAt = nowIso();
      saveDatabase();
      res.json(patient);
      return;
    }

    // Admin updates room, bed, and care team assignments
    patient.roomNumber = sanitizeText(req.body?.roomNumber, 40) || patient.roomNumber;
    patient.bedNumber = sanitizeText(req.body?.bedNumber, 30) || patient.bedNumber;
    if (typeof req.body?.assignedDoctorId === 'string') {
      patient.assignedDoctorId = sanitizeText(req.body.assignedDoctorId, 80);
    }
    if (typeof req.body?.assignedNurseId === 'string') {
      const nextNurseId = sanitizeText(req.body.assignedNurseId, 80);
      patient.assignedNurseId = nextNurseId;
      for (const n of db.nurses) {
        n.assignedPatientIds = n.assignedPatientIds.filter((pid) => pid !== patient.id);
        if (n.id === nextNurseId) n.assignedPatientIds.push(patient.id);
      }
    }
    if (typeof req.body?.assignedCaregiverId === 'string') {
      const nextCgId = sanitizeText(req.body.assignedCaregiverId, 80);
      patient.assignedCaregiverId = nextCgId;
      for (const c of db.caregivers) {
        c.assignedPatientIds = c.assignedPatientIds.filter((pid) => pid !== patient.id);
        if (c.id === nextCgId) c.assignedPatientIds.push(patient.id);
      }
    }
    patient.updatedAt = nowIso();
    saveDatabase();
    res.json(patient);
  });

  // Appointments with double-booking prevention
  app.post('/api/appointments', requireAuth, requireRoles('patient', 'admin'), (req: AuthedRequest, res) => {
    const doctorId = sanitizeText(req.body?.doctorId, 80);
    const date = sanitizeText(req.body?.date, 20);
    const timeSlot = sanitizeText(req.body?.timeSlot, 30);
    const reason = sanitizeText(req.body?.reason, 300);
    const patientId =
      req.authUser!.role === 'patient'
        ? req.authUser!.linkedProfileId
        : sanitizeText(req.body?.patientId, 80);

    const doctor = db.doctors.find((d) => d.id === doctorId);
    const patient = db.patients.find((p) => p.id === patientId);
    if (!doctor || !patient) {
      res.status(404).json({ error: 'Selected doctor or patient record was not found.' });
      return;
    }
    if (!date || !timeSlot || !reason) {
      res.status(400).json({ error: 'Please select a date, available time slot, and visit reason.' });
      return;
    }
    if (doctor.unavailableDates.includes(date)) {
      res.status(400).json({ error: `${doctor.name} is unavailable on ${date}. Please choose another date.` });
      return;
    }
    if (!doctor.appointmentSlots.includes(timeSlot)) {
      res.status(400).json({ error: 'Selected time slot is not in this doctor’s consultation schedule.' });
      return;
    }

    const conflict = db.appointments.some(
      (a) =>
        a.doctorId === doctorId &&
        a.date === date &&
        a.timeSlot === timeSlot &&
        (a.status === 'pending' || a.status === 'confirmed')
    );
    if (conflict) {
      res.status(409).json({
        error: `Slot ${timeSlot} on ${date} with ${doctor.name} is already booked. Please choose another slot.`,
      });
      return;
    }

    const appointment: Appointment = {
      id: `apt-${crypto.randomUUID().slice(0, 6)}`,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      department: doctor.department,
      hospitalName: doctor.hospitalName,
      roomNumber: doctor.roomNumber,
      date,
      timeSlot,
      reason,
      status: 'pending',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    db.appointments.unshift(appointment);

    createNotification({
      targetUserId: doctor.id,
      targetRole: 'doctor',
      category: 'appointment',
      title: `New Appointment Request: ${patient.name}`,
      message: `${date} at ${timeSlot} (${doctor.department} · ${doctor.roomNumber}) — ${reason}`,
    });

    saveDatabase();
    res.status(201).json(appointment);
  });

  app.patch('/api/appointments/:id', requireAuth, requireRoles('patient', 'doctor', 'admin'), (req: AuthedRequest, res) => {
    const apt = db.appointments.find((a) => a.id === sanitizeText(req.params.id, 80));
    if (!apt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }

    const role = req.authUser!.role;
    if (role === 'patient' && apt.patientId !== req.authUser!.linkedProfileId) {
      res.status(403).json({ error: 'You can only manage your own appointments.' });
      return;
    }
    if (role === 'doctor' && apt.doctorId !== req.authUser!.linkedProfileId) {
      res.status(403).json({ error: 'You can only manage appointments booked with you.' });
      return;
    }

    const nextStatus = req.body?.status;
    const nextDate = sanitizeText(req.body?.date, 20);
    const nextSlot = sanitizeText(req.body?.timeSlot, 30);

    // Rescheduling
    if (nextDate && nextSlot && (nextDate !== apt.date || nextSlot !== apt.timeSlot)) {
      const doctor = db.doctors.find((d) => d.id === apt.doctorId);
      if (!doctor) {
        res.status(404).json({ error: 'Doctor not found.' });
        return;
      }
      if (doctor.unavailableDates.includes(nextDate)) {
        res.status(400).json({ error: `${doctor.name} is unavailable on ${nextDate}.` });
        return;
      }
      const conflict = db.appointments.some(
        (other) =>
          other.id !== apt.id &&
          other.doctorId === apt.doctorId &&
          other.date === nextDate &&
          other.timeSlot === nextSlot &&
          (other.status === 'pending' || other.status === 'confirmed')
      );
      if (conflict) {
        res.status(409).json({ error: `Time slot ${nextSlot} on ${nextDate} is already reserved.` });
        return;
      }
      apt.date = nextDate;
      apt.timeSlot = nextSlot;
      apt.status = 'pending';
      apt.updatedAt = nowIso();
      createNotification({
        targetUserId: apt.doctorId,
        targetRole: 'doctor',
        category: 'appointment',
        title: `Appointment Rescheduled: ${apt.patientName}`,
        message: `Moved to ${nextDate} at ${nextSlot}. Awaiting confirmation.`,
      });
      saveDatabase();
      res.json(apt);
      return;
    }

    if (nextStatus === 'confirmed' || nextStatus === 'completed') {
      if (role !== 'doctor' && role !== 'admin') {
        res.status(403).json({ error: 'Only doctors or hospital admins can confirm or complete appointments.' });
        return;
      }
      apt.status = nextStatus;
      apt.updatedAt = nowIso();
      createNotification({
        targetUserId: apt.patientId,
        targetRole: 'patient',
        category: 'appointment',
        title: `Appointment ${nextStatus === 'confirmed' ? 'Confirmed' : 'Completed'}`,
        message: `${apt.doctorName} (${apt.department}, ${apt.roomNumber}) on ${apt.date} at ${apt.timeSlot}.`,
      });
    } else if (nextStatus === 'cancelled') {
      apt.status = 'cancelled';
      apt.updatedAt = nowIso();
      createNotification({
        targetUserId: role === 'patient' ? apt.doctorId : apt.patientId,
        targetRole: role === 'patient' ? 'doctor' : 'patient',
        category: 'appointment',
        title: `Appointment Cancelled`,
        message: `${apt.patientName} · ${apt.doctorName} on ${apt.date} at ${apt.timeSlot} was cancelled.`,
      });
    } else {
      res.status(400).json({ error: 'Invalid appointment update requested.' });
      return;
    }

    saveDatabase();
    res.json(apt);
  });

  // Prescriptions & Medicine Schedules (Doctors ONLY may create/modify prescriptions!)
  app.post('/api/prescriptions', requireAuth, (req: AuthedRequest, res) => {
    if (req.authUser!.role !== 'doctor') {
      res.status(403).json({
        error: 'Prescription changes require authorized doctor approval. Nurses and other roles cannot create or modify prescriptions.',
      });
      return;
    }

    const patientId = sanitizeText(req.body?.patientId, 80);
    const medicineName = sanitizeText(req.body?.medicineName, 120);
    const dosage = sanitizeText(req.body?.dosage, 100);
    const frequency = sanitizeText(req.body?.frequency, 100);
    const treatmentInstructions = sanitizeText(req.body?.treatmentInstructions, 400);
    const careInstructions = sanitizeText(req.body?.careInstructions, 400);
    const scheduledDate = sanitizeText(req.body?.scheduledDate, 20) || todayIsoDate();
    const scheduledTime = sanitizeText(req.body?.scheduledTime, 20) || '09:00';

    const patient = db.patients.find((p) => p.id === patientId);
    const doctor = db.doctors.find((d) => d.id === req.authUser!.linkedProfileId);
    if (!patient || !doctor) {
      res.status(404).json({ error: 'Patient or doctor record not found.' });
      return;
    }
    if (!medicineName || !dosage || !frequency) {
      res.status(400).json({ error: 'Medicine name, dosage, and frequency are required.' });
      return;
    }

    const rx: Prescription = {
      id: `rx-${crypto.randomUUID().slice(0, 6)}`,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      medicineName,
      dosage,
      frequency,
      treatmentInstructions: treatmentInstructions || 'Follow prescribed clinical protocol.',
      careInstructions: careInstructions || 'Monitor response and report adverse reactions.',
      createdAt: nowIso(),
      updatedByUserId: req.authUser!.id,
    };

    const schedule: MedicineSchedule = {
      id: `med-${crypto.randomUUID().slice(0, 6)}`,
      prescriptionId: rx.id,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      medicineName,
      dosage,
      scheduledDate,
      scheduledTime,
      frequency,
      instructions: treatmentInstructions || careInstructions || 'Take as prescribed.',
      status: 'scheduled',
      updatedAt: nowIso(),
    };

    db.prescriptions.unshift(rx);
    db.medicineSchedules.unshift(schedule);

    createNotification({
      targetUserId: patient.id,
      targetRole: 'patient',
      category: 'doctor_update',
      title: `New Prescription Added: ${medicineName} (${dosage})`,
      message: `${doctor.name} scheduled ${medicineName} for ${scheduledDate} at ${scheduledTime}.`,
    });

    if (patient.assignedNurseId) {
      createNotification({
        targetUserId: patient.assignedNurseId,
        targetRole: 'nurse',
        category: 'medicine',
        title: `New Prescribed Schedule: ${patient.name}`,
        message: `${medicineName} (${dosage}) scheduled at ${scheduledTime} by ${doctor.name}.`,
      });
    }

    saveDatabase();
    res.status(201).json({ prescription: rx, schedule });
  });

  app.patch('/api/medicine-schedules/:id/status', requireAuth, requireRoles('patient', 'nurse', 'doctor'), (req: AuthedRequest, res) => {
    const med = db.medicineSchedules.find((m) => m.id === sanitizeText(req.params.id, 80));
    if (!med) {
      res.status(404).json({ error: 'Medicine schedule not found.' });
      return;
    }

    const role = req.authUser!.role;
    const nextStatus = req.body?.status as DoseStatus;
    const statusReason = sanitizeText(req.body?.statusReason, 240);

    const validStatuses: DoseStatus[] = ['taken', 'administered', 'missed', 'postponed', 'delayed'];
    if (!validStatuses.includes(nextStatus)) {
      res.status(400).json({ error: 'Invalid dose status.' });
      return;
    }

    if (role === 'patient' && med.patientId !== req.authUser!.linkedProfileId) {
      res.status(403).json({ error: 'You may only update your own medicine schedule.' });
      return;
    }
    if (role === 'nurse') {
      const patient = db.patients.find((p) => p.id === med.patientId);
      if (!patient || patient.assignedNurseId !== req.authUser!.linkedProfileId) {
        res.status(403).json({ error: 'You may only record doses for your assigned patients.' });
        return;
      }
      if ((nextStatus === 'missed' || nextStatus === 'delayed') && !statusReason) {
        res.status(400).json({ error: 'Please provide a clinical reason when marking a dose missed or delayed.' });
        return;
      }
    }

    med.status = nextStatus;
    med.statusReason = statusReason || undefined;
    med.updatedAt = nowIso();
    med.updatedByUserId = req.authUser!.id;
    med.updatedByRole = role;

    saveDatabase();
    res.json(med);
  });

  // Nursing Tasks
  app.post('/api/nursing-tasks', requireAuth, requireRoles('doctor', 'admin'), (req: AuthedRequest, res) => {
    const patientId = sanitizeText(req.body?.patientId, 80);
    const title = sanitizeText(req.body?.title, 120);
    const description = sanitizeText(req.body?.description, 400);
    const dueTime = sanitizeText(req.body?.dueTime, 30) || '15:00';
    const priority = req.body?.priority === 'urgent' || req.body?.priority === 'priority' ? req.body.priority : 'routine';

    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found.' });
      return;
    }
    if (!title) {
      res.status(400).json({ error: 'Task title is required.' });
      return;
    }

    const task: NursingTask = {
      id: `task-${crypto.randomUUID().slice(0, 6)}`,
      patientId: patient.id,
      patientName: patient.name,
      roomNumber: patient.roomNumber,
      bedNumber: patient.bedNumber,
      nurseId: patient.assignedNurseId,
      assignedByDoctorId: req.authUser!.linkedProfileId,
      assignedByDoctorName: req.authUser!.name,
      title,
      description: description || 'Complete clinical nursing observation.',
      dueTime,
      priority,
      status: 'pending',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    db.nursingTasks.unshift(task);
    if (patient.assignedNurseId) {
      createNotification({
        targetUserId: patient.assignedNurseId,
        targetRole: 'nurse',
        category: 'nurse_update',
        title: `New Nursing Task (${priority.toUpperCase()}): ${patient.name}`,
        message: `${title} · Due ${dueTime} (${patient.roomNumber} · ${patient.bedNumber})`,
      });
    }

    saveDatabase();
    res.status(201).json(task);
  });

  app.patch('/api/nursing-tasks/:id', requireAuth, requireRoles('nurse', 'doctor', 'admin'), (req: AuthedRequest, res) => {
    const task = db.nursingTasks.find((t) => t.id === sanitizeText(req.params.id, 80));
    if (!task) {
      res.status(404).json({ error: 'Nursing task not found.' });
      return;
    }
    const status = req.body?.status;
    if (status !== 'pending' && status !== 'in_progress' && status !== 'completed') {
      res.status(400).json({ error: 'Invalid task status.' });
      return;
    }
    task.status = status;
    task.updatedAt = nowIso();
    saveDatabase();
    res.json(task);
  });

  // Patient Condition & Vitals Reports
  app.post('/api/reports', requireAuth, requireRoles('nurse', 'doctor'), (req: AuthedRequest, res) => {
    const patientId = sanitizeText(req.body?.patientId, 80);
    const condition = sanitizeText(req.body?.condition, 60);
    const temperature = sanitizeText(req.body?.temperature, 30);
    const bloodPressure = sanitizeText(req.body?.bloodPressure, 30);
    const pulseRate = sanitizeText(req.body?.pulseRate, 30);
    const oxygenSaturation = sanitizeText(req.body?.oxygenSaturation, 30);
    const generalObservations = sanitizeText(req.body?.generalObservations, 400);
    const nursingNotes = sanitizeText(req.body?.nursingNotes, 400);

    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found.' });
      return;
    }
    if (!condition || !temperature || !bloodPressure || !pulseRate || !oxygenSaturation) {
      res.status(400).json({ error: 'Condition and all four vital measurements are required.' });
      return;
    }

    const report: PatientReport = {
      id: `rep-${crypto.randomUUID().slice(0, 6)}`,
      patientId: patient.id,
      patientName: patient.name,
      recordedByUserId: req.authUser!.id,
      recordedByName: req.authUser!.name,
      recordedByRole: req.authUser!.role,
      condition,
      temperature,
      bloodPressure,
      pulseRate,
      oxygenSaturation,
      generalObservations: generalObservations || 'Vitals recorded.',
      nursingNotes: nursingNotes || 'Continued routine monitoring.',
      createdAt: nowIso(),
    };

    db.patientReports.unshift(report);
    if (condition === 'Stable' || condition === 'Observation' || condition === 'Critical' || condition === 'Recovering') {
      patient.conditionStatus = condition;
    }
    patient.updatedAt = nowIso();

    createNotification({
      targetUserId: patient.id,
      targetRole: 'patient',
      category: 'nurse_update',
      title: `Condition & Vitals Updated (${condition})`,
      message: `Temp ${temperature} · BP ${bloodPressure} · Pulse ${pulseRate} · SpO2 ${oxygenSaturation}`,
    });

    saveDatabase();
    res.status(201).json(report);
  });

  // Emergency SOS Alerts
  app.post('/api/emergency', requireAuth, requireRoles('patient'), (req: AuthedRequest, res) => {
    const patient = db.patients.find((p) => p.id === req.authUser!.linkedProfileId);
    if (!patient) {
      res.status(404).json({ error: 'Patient profile not found.' });
      return;
    }

    const caregiver = db.caregivers.find((c) => c.id === patient.assignedCaregiverId) || db.caregivers[0];
    const locationText =
      sanitizeText(req.body?.locationText, 240) ||
      `${patient.hospitalName} · ${patient.roomNumber} · ${patient.bedNumber}`;
    const rawCoords = req.body?.coordinates;
    const coordinates =
      rawCoords && typeof rawCoords.lat === 'number' && typeof rawCoords.lng === 'number'
        ? { lat: rawCoords.lat, lng: rawCoords.lng }
        : null;

    const alert: EmergencyAlert = {
      id: `sos-${crypto.randomUUID().slice(0, 6)}`,
      patientId: patient.id,
      patientName: patient.name,
      hospitalName: patient.hospitalName,
      roomNumber: patient.roomNumber,
      bedNumber: patient.bedNumber,
      caregiverId: caregiver?.id || '',
      caregiverName: caregiver?.name || 'On-Call Hospital Care Desk',
      caregiverPhone: caregiver?.contactNumber || db.hospital.contactNumber,
      locationText,
      coordinates,
      status: 'active',
      deliveryConfirmed: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    db.emergencyAlerts.unshift(alert);

    if (caregiver) {
      createNotification({
        targetUserId: caregiver.id,
        targetRole: 'caregiver',
        category: 'sos',
        title: `URGENT SOS ALERT: ${patient.name}`,
        message: `${patient.hospitalName} · ${patient.roomNumber}, ${patient.bedNumber}. Location: ${locationText}`,
      });
    }
    createNotification({
      targetRole: 'admin',
      category: 'sos',
      title: `SOS Alert Triggered: ${patient.name}`,
      message: `Room ${patient.roomNumber}, ${patient.bedNumber} — Caregiver ${caregiver?.name || 'Desk'} notified.`,
    });

    saveDatabase();
    res.status(201).json(alert);
  });

  app.patch('/api/emergency/:id', requireAuth, requireRoles('caregiver', 'admin', 'doctor', 'nurse'), (req: AuthedRequest, res) => {
    const alert = db.emergencyAlerts.find((e) => e.id === sanitizeText(req.params.id, 80));
    if (!alert) {
      res.status(404).json({ error: 'Emergency alert not found.' });
      return;
    }
    const status = req.body?.status as EmergencyStatus;
    if (status !== 'acknowledged' && status !== 'en_route' && status !== 'resolved') {
      res.status(400).json({ error: 'Invalid emergency response status.' });
      return;
    }

    alert.status = status;
    alert.updatedAt = nowIso();
    alert.respondedByUserId = req.authUser!.id;

    createNotification({
      targetUserId: alert.patientId,
      targetRole: 'patient',
      category: 'sos',
      title: `Emergency Response Update: ${status.replace('_', ' ').toUpperCase()}`,
      message: `${req.authUser!.name} updated your SOS alert status to "${status.replace('_', ' ')}".`,
    });

    saveDatabase();
    res.json(alert);
  });

  // Notifications & Hospital Announcements
  app.patch('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const notif = db.notifications.find((n) => n.id === sanitizeText(req.params.id, 80));
    if (!notif) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    if (!notif.readByUserIds.includes(req.authUser!.id)) {
      notif.readByUserIds.push(req.authUser!.id);
      saveDatabase();
    }
    res.json(notif);
  });

  app.post('/api/announcements', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const title = sanitizeText(req.body?.title, 120);
    const message = sanitizeText(req.body?.message, 500);
    const targetRole = req.body?.targetRole === 'all' || isValidRole(req.body?.targetRole) ? req.body.targetRole : 'all';

    if (!title || !message) {
      res.status(400).json({ error: 'Announcement title and message are required.' });
      return;
    }

    const notif = createNotification({
      targetRole,
      category: 'announcement',
      title,
      message,
    });
    saveDatabase();
    res.status(201).json(notif);
  });

  // Ambulance Management (Admin only for write)
  app.post('/api/ambulances', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const ambulanceNumber = sanitizeText(req.body?.ambulanceNumber, 40);
    const driverName = sanitizeText(req.body?.driverName, 100);
    const driverContact = sanitizeText(req.body?.driverContact, 50);
    const ambulanceType = req.body?.ambulanceType;
    const hospitalLocation = sanitizeText(req.body?.hospitalLocation, 140);

    if (!ambulanceNumber || !driverName || !driverContact) {
      res.status(400).json({ error: 'Ambulance number, driver name, and driver contact are required.' });
      return;
    }

    const validType =
      ambulanceType === 'Advanced Cardiac Life Support' || ambulanceType === 'Neonatal ICU'
        ? ambulanceType
        : 'Basic Life Support';

    const ambulance: Ambulance = {
      id: `amb-${crypto.randomUUID().slice(0, 6)}`,
      ambulanceNumber,
      driverName,
      driverContact,
      availability: 'available',
      ambulanceType: validType,
      hospitalLocation: hospitalLocation || 'Emergency Bay · Main Campus',
    };
    db.ambulances.push(ambulance);
    saveDatabase();
    res.status(201).json(ambulance);
  });

  app.patch('/api/ambulances/:id', requireAuth, requireRoles('admin'), (req: AuthedRequest, res) => {
    const amb = db.ambulances.find((a) => a.id === sanitizeText(req.params.id, 80));
    if (!amb) {
      res.status(404).json({ error: 'Ambulance not found.' });
      return;
    }
    const availability = req.body?.availability;
    if (availability !== 'available' && availability !== 'dispatched' && availability !== 'maintenance') {
      res.status(400).json({ error: 'Invalid ambulance availability.' });
      return;
    }
    amb.availability = availability;
    if (typeof req.body?.hospitalLocation === 'string' && req.body.hospitalLocation.trim()) {
      amb.hospitalLocation = sanitizeText(req.body.hospitalLocation, 140);
    }
    saveDatabase();
    res.json(amb);
  });

  // Server-side scheduled medication reminder checker (runs every 60 seconds)
  setInterval(runScheduledMedicationReminderCheck, 60_000);
  runScheduledMedicationReminderCheck();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartCare server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SmartCare server:', err);
  process.exit(1);
});
