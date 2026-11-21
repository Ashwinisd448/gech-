import { AlertCircle, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';

interface StatusLabelProps {
  status: string;
}

export function StatusLabel({ status }: StatusLabelProps) {
  const normalized = status.toLowerCase();

  if (
    normalized === 'confirmed' ||
    normalized === 'completed' ||
    normalized === 'taken' ||
    normalized === 'administered' ||
    normalized === 'available' ||
    normalized === 'resolved' ||
    normalized === 'stable' ||
    normalized === 'recovering'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </span>
    );
  }

  if (
    normalized === 'pending' ||
    normalized === 'scheduled' ||
    normalized === 'in_progress' ||
    normalized === 'postponed' ||
    normalized === 'delayed' ||
    normalized === 'observation' ||
    normalized === 'acknowledged' ||
    normalized === 'en_route' ||
    normalized === 'dispatched' ||
    normalized === 'priority'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        {normalized === 'postponed' || normalized === 'delayed' ? (
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Clock className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </span>
    );
  }

  if (
    normalized === 'cancelled' ||
    normalized === 'missed' ||
    normalized === 'active' ||
    normalized === 'critical' ||
    normalized === 'urgent' ||
    normalized === 'maintenance'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        {normalized === 'cancelled' ? (
          <XCircle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </span>
  );
}
