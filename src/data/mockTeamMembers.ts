import type { TeamMember } from '../types/recruitment';

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'coord-sarah', name: 'Sarah' },
  { id: 'coord-mike', name: 'Mike' },
  { id: 'coord-elena', name: 'Elena' },
  { id: 'coord-james', name: 'James' },
];

export function teamMemberById(id: string | null): TeamMember | undefined {
  if (!id) return undefined;
  return TEAM_MEMBERS.find((m) => m.id === id);
}
