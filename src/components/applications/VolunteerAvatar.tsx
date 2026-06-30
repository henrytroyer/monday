import { useEffect, useState } from 'react';

interface VolunteerAvatarProps {
  name: string;
  profilePhotoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'h-11 w-11 rounded-full',
  md: 'h-16 w-16 rounded-xl',
  lg: 'h-28 w-28 rounded-2xl',
} as const;

export default function VolunteerAvatar({
  name,
  profilePhotoUrl,
  size = 'sm',
  className = '',
  onClick,
}: VolunteerAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = sizeClasses[size];
  const showImage = profilePhotoUrl && !imageFailed;
  const interactive = Boolean(onClick && showImage);

  useEffect(() => {
    setImageFailed(false);
  }, [profilePhotoUrl]);

  if (showImage) {
    const image = (
      <img
        src={profilePhotoUrl}
        alt=""
        onError={() => setImageFailed(true)}
        className={`${sizeClass} shrink-0 border-2 border-white object-cover shadow-md ring-1 ring-crm-taupe/20 ${className} ${
          interactive
            ? 'transition hover:ring-2 hover:ring-crm-indigo/30'
            : ''
        }`}
      />
    );

    if (interactive) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="shrink-0 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-indigo/40"
          aria-label={`View ${name} profile photo`}
        >
          {image}
        </button>
      );
    }

    return image;
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center bg-crm-taupe-100 ring-1 ring-crm-taupe/20 ${className}`}
      role="img"
      aria-label={`${name} (no photo)`}
    >
      <svg
        className={
          size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-8 w-8' : 'h-6 w-6'
        }
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
