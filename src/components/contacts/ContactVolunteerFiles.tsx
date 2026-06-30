import VolunteerFilesSection from '../applications/VolunteerFilesSection';
import type { VolunteerFile } from '../../types/volunteer';

interface ContactVolunteerFilesProps {
  volunteerName: string;
  profilePhotoUrl?: string;
  passportFile?: VolunteerFile;
  files?: VolunteerFile[];
}

export default function ContactVolunteerFiles({
  volunteerName,
  profilePhotoUrl,
  passportFile,
  files = [],
}: ContactVolunteerFilesProps) {
  return (
    <div className="h-full">
      <VolunteerFilesSection
        volunteerName={volunteerName}
        profilePhotoUrl={profilePhotoUrl}
        passportFile={passportFile}
        files={files}
        variant="panel"
      />
    </div>
  );
}
