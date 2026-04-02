import { PartyPopper } from 'lucide-react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <PartyPopper className="h-7 w-7 text-primary" />
      <span className="text-xl font-bold tracking-tight">
        Fest<span className="text-primary">osh</span>
      </span>
    </div>
  );
}
