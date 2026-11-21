import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  Building2,
  CheckSquare,
  HeartHandshake,
  Lock,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { api, type PublicDirectory } from '../lib/api';
import type { AuthUser, UserRole } from '../types/healthcare';

interface AuthPortalProps {
  onAuthenticated: (user: AuthUser) => void;
}

const ROLE_OPTIONS: {
  id: UserRole;
  label: string;
  summary: string;
  icon: typeof Activity;
}[] = [
  { id: 'patient', label: 'Patient', summary: 'Medicine schedule, appointments & SOS', icon: Activity },
  { id: 'doctor', label: 'Doctor', summary: 'Prescriptions, slots & patient care', icon: Stethoscope },
  { id: 'nurse', label: 'Nurse', summary: 'Dose administration & vitals logs', icon: UserCheck },
  { id: 'caregiver', label: 'Caregiver', summary: 'SOS alerts & patient room tracking', icon: HeartHandshake },
  { id: 'admin', label: 'Hospital Admin', summary: 'Staff, wards & ambulance fleet', icon: Building2 },
];

export function AuthPortal({ onAuthenticated }: AuthPortalProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [directory, setDirectory] = useState<PublicDirectory | null>(null);

  const [role, setRole] = useState<UserRole>('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [linkedProfileId, setLinkedProfileId] = useState('');
  const [age, setAge] = useState('38');
  const [contactNumber, setContactNumber] = useState('+1 (415) 555-0140');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPublicDirectory()
      .then((data) => setDirectory(data))
      .catch(() => {
        /* fallback gracefully if directory unavailable */
      });
  }, []);

  useEffect(() => {
    setLinkedProfileId('');
  }, [role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        onAuthenticated(res.user);
      } else {
        const res = await api.register({
          name,
          email,
          password,
          role,
          linkedProfileId: linkedProfileId || undefined,
          consentGiven,
          age: Number(age),
          contactNumber,
          medicalHistory,
        });
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const profileChoices =
    role === 'patient'
      ? directory?.patientProfiles.map((p) => ({ id: p.id, label: `${p.name} (${p.hospitalName})` })) || []
      : role === 'doctor'
        ? directory?.doctors.map((d) => ({ id: d.id, label: `${d.name} · ${d.department}` })) || []
        : role === 'nurse'
          ? directory?.nurses.map((n) => ({ id: n.id, label: `${n.name} · ${n.department}` })) || []
          : role === 'caregiver'
            ? directory?.caregivers.map((c) => ({ id: c.id, label: `${c.name} · ${c.relationship}` })) || []
            : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight text-blue-700 whitespace-nowrap shrink-0">
            SmartCare
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#portal-access" className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0">
              Portal Access
            </a>
            <a href="#care-modules" className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0">
              Care Modules
            </a>
            <a href="#hospital-info" className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0">
              Hospital Desk
            </a>
          </nav>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              {mode === 'login' ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      <main id="portal-access" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Hero & Hospital Overview */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="relative h-56 sm:h-64 bg-blue-900">
              <img
                src="/src/assets/images/hospital_atrium_banner_1795256795697.jpg"
                alt="SmartCare Metropolitan Medical Center sunlit clinical atrium"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/35 to-transparent flex flex-col justify-end p-6">
                <p className="text-xs font-medium text-blue-200">
                  {directory?.hospital.name || 'SmartCare Metropolitan Medical Center'}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 text-balance">
                  Coordinated Care Across Every Clinical Role
                </h1>
              </div>
            </div>

            <div id="care-modules" className="p-6 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  SmartCare connects patients, doctors, nurses, family caregivers, and hospital administrators in a
                  single role-protected clinical workspace.
                </p>

                <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                  {ROLE_OPTIONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2.5 font-medium text-slate-800">
                          <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-xs text-slate-500 text-right">{item.summary}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div id="hospital-info" className="pt-2 text-xs text-slate-500 space-y-1">
                <div className="font-medium text-slate-700">
                  {directory?.hospital.address || '420 Meridian Healthcare Blvd, Metro City'}
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                  <span>{directory?.hospital.contactNumber || '+1 (415) 555-0190'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{directory?.hospital.emergencyHours || '24/7 Emergency Care'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Auth Form */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {mode === 'register' ? 'Create Your SmartCare Account' : 'Sign In to SmartCare'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {mode === 'register'
                      ? 'Choose your role and optionally link to an existing ward profile to explore pre-populated clinical data.'
                      : 'Access your role-restricted dashboard with encrypted session protection.'}
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      mode === 'register' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      mode === 'login' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Select Your Role</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ROLE_OPTIONS.map((r) => {
                          const Icon = r.icon;
                          const active = role === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setRole(r.id)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors text-left ${
                                active
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{r.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {profileChoices.length > 0 && (
                      <div>
                        <label htmlFor="profile-link" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Link to Existing Hospital Profile (Optional)
                        </label>
                        <select
                          id="profile-link"
                          value={linkedProfileId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setLinkedProfileId(id);
                            const match = profileChoices.find((p) => p.id === id);
                            if (match && !name) {
                              setName(match.label.split(' · ')[0].split(' (')[0]);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Create a fresh {role} profile</option>
                          {profileChoices.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="full-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Full Name
                        </label>
                        <input
                          id="full-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Aarav Patel"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-num" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Contact Number
                        </label>
                        <input
                          id="contact-num"
                          type="tel"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {role === 'patient' && !linkedProfileId && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="patient-age" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Age
                          </label>
                          <input
                            id="patient-age"
                            type="number"
                            min={1}
                            max={120}
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="med-history" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Brief Medical History
                          </label>
                          <input
                            id="med-history"
                            type="text"
                            value={medicalHistory}
                            onChange={(e) => setMedicalHistory(e.target.value)}
                            placeholder="Allergies, conditions, or medications"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {mode === 'register' && (
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      I consent to SmartCare securely sharing relevant appointment, medication, and emergency alert
                      records only with my authorized care team.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {loading
                    ? 'Processing...'
                    : mode === 'register'
                      ? 'Create Account & Open Dashboard'
                      : 'Sign In to Dashboard'}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Salted scrypt hashing · Role-based API checks</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Consent enforced</span>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
