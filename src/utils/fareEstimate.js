export function getFareEstimate(group, destinations = []) {
  if (!group) return null;
  let total = group.totalFare;
  if (!Number.isFinite(total) || total <= 0) {
    const destination = destinations.find(item => item.id === group.destinationId);
    const match = String(destination?.avgCabFare || '').match(/\d[\d,]*/);
    total = match ? Number(match[0].replaceAll(',', '')) : null;
  }
  if (!Number.isFinite(total) || total <= 0) return null;
  const riders = Math.max(1, group.members?.length || 0);
  if (group.transport === 'Train' || group.mode === 'Train') return { total: total * riders, perPerson: total, riders };
  return { total, perPerson: Math.ceil(total / riders), riders };
}
