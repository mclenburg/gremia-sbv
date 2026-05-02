import type { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  text: string;
  icon: LucideIcon;
  status?: string;
  onClick?: () => void;
}

export function DashboardCard({ title, text, icon: Icon, status, onClick }: DashboardCardProps) {
  return (
    <button type="button" onClick={onClick} className="industrial-card group text-left">
      <div className="mb-4 flex items-start justify-between gap-4">
        <Icon className="h-7 w-7 text-yellow-300 transition group-hover:scale-110" />
        {status && <span className="industrial-badge">{status}</span>}
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
    </button>
  );
}
