import VolunteerAvatar from './VolunteerAvatar';

interface CoupleAvatarStackProps {
  primaryName: string;
  partnerName: string;
  primaryPhotoUrl?: string;
  partnerPhotoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CoupleAvatarStack({
  primaryName,
  partnerName,
  primaryPhotoUrl,
  partnerPhotoUrl,
  size = 'sm',
}: CoupleAvatarStackProps) {
  const overlap = size === 'lg' ? '-ml-8' : size === 'md' ? '-ml-6' : '-ml-4';

  return (
    <div className="flex shrink-0 items-center">
      <VolunteerAvatar
        name={primaryName}
        profilePhotoUrl={primaryPhotoUrl}
        size={size}
        className="relative z-10"
      />
      <VolunteerAvatar
        name={partnerName}
        profilePhotoUrl={partnerPhotoUrl}
        size={size}
        className={`relative z-0 ${overlap} ring-2 ring-crm-surface`}
      />
    </div>
  );
}
