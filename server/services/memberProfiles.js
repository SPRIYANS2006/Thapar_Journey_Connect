import { User } from '../models/User.js';

// Resolve member details from the same account used by the profile screen.
export function memberProfiles(schema) {
  async function hydrate(result) {
    const groups = (Array.isArray(result) ? result : [result]).filter(Boolean);
    const members = groups.flatMap(group => Array.from(group.members || []));
    const ids = [...new Set(members.filter(member => !member.is_companion).map(member => member.user_id).filter(Boolean))];
    if (!ids.length) return;
    const users = await User.find({id: {$in: ids}}).select('id hostel reliability').lean();
    const byId = new Map(users.map(user => [user.id, user]));
    for (const member of members) {
      const user = byId.get(member.user_id);
      if (user && !member.is_companion) {
        member.hostel = user.hostel || '';
        member.reliability = user.reliability ?? 4.5;
      }
    }
  }
  for (const operation of ['find', 'findOne', 'findOneAndUpdate', 'save']) schema.post(operation, hydrate);
}

export const completionUpdate = [
  { $set: {
    trips_completed: { $add: [{ $ifNull: ['$trips_completed', 0] }, 1] },
    reliability: { $min: [5, { $round: [{ $add: [{ $ifNull: ['$reliability', 4.5] }, 0.1] }, 1] }] },
    active_group_id: null
  } }
];
