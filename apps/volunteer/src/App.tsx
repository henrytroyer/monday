import { useState } from 'react';
import type { VolunteerApplicationStatus } from './contract/volunteerApi';
import { LoginScreen } from './screens/LoginScreen';
import { StatusScreen } from './screens/StatusScreen';

export default function App() {
  const [me, setMe] = useState<VolunteerApplicationStatus | null>(null);

  if (me) {
    return <StatusScreen me={me} onSignOut={() => setMe(null)} />;
  }

  return <LoginScreen onFound={setMe} />;
}
