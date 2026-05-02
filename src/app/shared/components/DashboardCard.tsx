import type { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  text: string;
  icon: LucideIcon;
  disabled?: boolean;
  statusText?: string;
  onClick?: () => void;
}

export function DashboardCard({ title, text, icon: Icon, disabled = false, statusText, onClick }: DashboardCardProps) {
  return (
    <button
      type="button"
      className={`industrial-dashboard-card ${disabled ? 'is-disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled ? statusText : title}
    >
      <Icon className="industrial-dashboard-card-icon" />
      <span className="industrial-dashboard-card-title">{title}</span>
      <span className="industrial-dashboard-card-text">{text}</span>
      {statusText && <span className="industrial-dashboard-card-status">{statusText}</span>}
    </button>
  );
}
