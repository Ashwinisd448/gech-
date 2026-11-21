import { useState, type ReactNode } from 'react';
import { Bell, Check, LogOut, Menu, RefreshCw, ShieldAlert, X } from 'lucide-react';
import type { AppNotification, AuthUser } from '../types/healthcare';

export interface NavItem {
  id: string;
  label: string;
  icon: typeof Bell;
}

interface LayoutShellProps {
  user: AuthUser;
  hospitalName: string;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onOpenSos?: () => void;
  children: ReactNode;
}

const ROLE_TITLES: Record<AuthUser['role'], string> = {
  patient: 'Patient Care Portal',
  doctor: 'Doctor Clinical Workspace',
  nurse: 'Nursing Station',
  caregiver: 'Caregiver Support Desk',
  admin: 'Hospital Administration',
};

export function LayoutShell({
  user,
  hospitalName,
  navItems,
  activeTab,
  onTabChange,
  notifications,
  onMarkNotificationRead,
  onRefresh,
  onLogout,
  onOpenSos,
  children,
}: LayoutShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const unreadCount = notifications.filter((n) => !n.readByUserIds.includes(user.id)).length;

  const requestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPerm('unsupported');
      return;
    }
    const result = await Notification.requestPermission();
    setBrowserPerm(result);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar Contract: Brand wordmark — Nav/Breadcrumbs — Primary action */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-lg font-bold tracking-tight text-blue-700 whitespace-nowrap shrink-0">
              SmartCare
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 truncate">
            <span className="font-medium text-slate-700">{ROLE_TITLES[user.role]}</span>
            <span aria-hidden="true">/</span>
            <span className="truncate">{hospitalName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800">{user.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenSos && (
              <button
                type="button"
                onClick={onOpenSos}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>SOS Emergency</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Refresh clinical data"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded bg-blue-600 text-white text-[10px] font-mono font-semibold tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-slate-200 p-4 justify-between">
          <div className="space-y-1">
            <div className="px-3 py-2 mb-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize truncate">
                {user.role} · {user.email}
              </p>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 px-2 text-[11px] text-slate-500 leading-relaxed">
            Reminders are scheduling aids and do not substitute clinical supervision.
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <span className="font-bold text-blue-700">SmartCare Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg text-left ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex-1 bg-slate-900/30" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Notification Slide-Over */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/25" onClick={() => setNotifOpen(false)} />
          <div className="relative w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Notifications</h2>
                <p className="text-xs text-slate-500">
                  {unreadCount} unread · Server-scheduled & clinical alerts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                <p className="font-medium">Browser Alert Permission: {browserPerm}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  On Android Chrome/PWAs, push alerts require granted permission and a registered Service Worker when the
                  tab is closed.
                </p>
              </div>
              {browserPerm !== 'granted' && browserPerm !== 'unsupported' && (
                <button
                  type="button"
                  onClick={requestBrowserNotifications}
                  className="px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 shrink-0"
                >
                  Enable
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No notifications yet.</div>
              ) : (
                notifications.map((n) => {
                  const isRead = n.readByUserIds.includes(user.id);
                  return (
                    <div key={n.id} className={`p-4 ${isRead ? 'bg-white' : 'bg-blue-50/40'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-medium text-blue-700 capitalize">
                          {n.category.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{n.title}</p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                      {!isRead && (
                        <button
                          type="button"
                          onClick={() => onMarkNotificationRead(n.id)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark as read</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
