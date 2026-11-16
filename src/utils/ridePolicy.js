export function isCabOnlyDestination(destinationId) {
  return ['chd_airport', 'del_airport'].includes(destinationId);
}
