import VolunteerFilesSection from '../applications/VolunteerFilesSection';
import type { VolunteerFile } from '../../types/volunteer';

interface ContactVolunteerFilesProps {
  volunteerName: string;
  profilePhotoUrl?: string;
  passportFile?: VolunteerFile;
  childSafeguardingFile?: VolunteerFile;
  files?: VolunteerFile[];
}

export default function ContactVolunteerFiles({
  volunteerName,
  profilePhotoUrl,
  passportFile,
  childSafeguardingFile,
  files = [],
}: ContactVolunteerFilesProps) {
  return (
    <div className="h-full">
      <VolunteerFilesSection
        volunteerName={volunteerName}
        profilePhotoUrl={profilePhotoUrl}
        passportFile={passportFile}
        childSafeguardingFile={childSafeguardingFile}
        files={files}
        variant="panel"
      />
    </div>
  );
}
