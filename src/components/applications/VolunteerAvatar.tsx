interface VolunteerAvatarProps {
  name: string;
  profilePhotoUrl?: string;
  size?: 'sm' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-11 w-11 rounded-full',
  lg: 'h-28 w-28 rounded-2xl',
} as const;

export default function VolunteerAvatar({
  name,
  profilePhotoUrl,
  size = 'sm',
  className = '',
}: VolunteerAvatarProps) {
  const sizeClass = sizeClasses[size];

  if (profilePhotoUrl) {
    return (
      <img
        src={profilePhotoUrl}
        alt=""
        className={`${sizeClass} shrink-0 border-2 border-white object-cover shadow-md ring-1 ring-slate-200 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center bg-slate-200 ring-1 ring-slate-200 ${className}`}
      role="img"
      aria-label={`${name} (no photo)`}
    >
      <svg
        className={size === 'lg' ? 'h-12 w-12' : 'h-6 w-6'}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    </div>
  );
}
