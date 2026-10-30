import { getCircularMinuteDiff, normalizeDateStr } from '../utils/time.js';

export const TIET_HOSTELS = [
  { id: 'HA', name: 'Agira Hall (Previously known as Hostel-A)', gender: 'Boys', cluster: 'North Quad' },
  { id: 'HB', name: 'Amritam Hall (Previously known as Hostel-B)', gender: 'Boys', cluster: 'North Quad' },
  { id: 'HC', name: 'Prithvi Hall (Previously known as Hostel-C)', gender: 'Boys', cluster: 'North Quad' },
  { id: 'HD', name: 'Neeram Hall (Previously known as Hostel-D)', gender: 'Boys', cluster: 'Central Quad' },
  { id: 'HH', name: 'Vyan Hall (Previously known as Hostel-H)', gender: 'Boys', cluster: 'Central Quad' },
  { id: 'HJ', name: 'Tejas Hall (Previously known as Hostel-J)', gender: 'Boys', cluster: 'East Quad' },
  { id: 'HK', name: 'Ambaram Hall (Previously known as Hostel-K)', gender: 'Boys', cluster: 'East Quad' },
  { id: 'HL', name: 'Viyat Hall (Previously known as Hostel-L)', gender: 'Boys', cluster: 'East Quad' },
  { id: 'HM', name: 'Anantam Hall (Previously known as Hostel-M)', gender: 'Boys', cluster: 'West Quad' },
  { id: 'HO', name: 'Vyom Hall (Previously known as Hostel-O)', gender: 'Boys', cluster: 'West Quad' },
  { id: 'FRFG', name: 'Hostel-FRF/G', gender: 'Boys', cluster: 'West Quad' },

  { id: 'HE', name: 'Vasudha Hall - Block E (Previously known as Hostel-E)', gender: 'Girls', cluster: 'Vasudha Complex' },
  { id: 'HG', name: 'Vasudha Hall - Block G (Previously known as Hostel-G)', gender: 'Girls', cluster: 'Vasudha Complex' },
  { id: 'HI', name: 'Ira Hall (Previously known as Hostel-I)', gender: 'Girls', cluster: 'Girls Quad' },
  { id: 'HN', name: 'Ananta Hall (Previously known as Hostel-N)', gender: 'Girls', cluster: 'Girls Quad' },
  { id: 'Dhriti', name: 'Dhriti Hall (Hostel-PG)', gender: 'Girls', cluster: 'Girls Quad' },
  { id: 'HQ', name: 'Vahni Hall (Previously known as Hostel-Q)', gender: 'Girls', cluster: 'Girls Quad' },
  { id: 'Pavani', name: 'Hostel-Pavani Hall (Previously Known As PG-2)', gender: 'Girls', cluster: 'Girls Quad' }
];

export function findHostel(identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim().toLowerCase();
  return (
    TIET_HOSTELS.find(
      (h) => h.id.toLowerCase() === str || h.name.toLowerCase() === str
    ) || null
  );
}

export function getHostelProximity(hostelA, hostelB) {
  if (!hostelA || !hostelB) return { score: 10, label: 'Wider campus' };

  const objA = findHostel(hostelA);
  const objB = findHostel(hostelB);

  // Exact match
  if (hostelA === hostelB || (objA && objB && objA.id === objB.id)) {
    return { score: 40, label: 'Same hostel' };
  }

  // Same quad / cluster
  if (objA && objB && objA.cluster === objB.cluster) {
    return { score: 30, label: 'Same hostel quad' };
  }

  // Same gender / general side of campus
  if (objA && objB && objA.gender === objB.gender) {
    return { score: 20, label: 'Same side of campus' };
  }

  return { score: 10, label: 'Wider campus' };
}

export function calculateMatchScore(userReq, candidate) {
  // Destination must match
  const reqDest = userReq.destinationId || userReq.destination_id;
  const candDest = candidate.destinationId || candidate.destination_id;
  if (reqDest !== candDest) {
    return { score: 0, reasons: [] };
  }

  // Date must match
  const reqDate = normalizeDateStr(userReq.date);
  const candDate = normalizeDateStr(candidate.date);
  if (reqDate !== candDate) {
    return { score: 0, reasons: [] };
  }

  // Vehicle compatibility is a hard requirement
  const reqTransport = userReq.transport || 'Either';
  const candTransport = candidate.transport || 'Either';
  const isVehicleCompatible =
    reqTransport === 'Either' ||
    candTransport === 'Either' ||
    reqTransport === candTransport;

  if (!isVehicleCompatible) {
    return { score: 0, reasons: [] };
  }

  // Time difference with midnight wrap-around: min(|a-b|, 1440 - |a-b|)
  const reqTime = userReq.departureTime || userReq.departure_time;
  const candTime = candidate.departureTime || candidate.departure_time;
  const circularDiff = getCircularMinuteDiff(reqTime, candTime);

  // Both students' flexibility windows must agree (smaller of the two)
  const reqFlex = Number(userReq.flexibility) || 15;
  const candFlex = Number(candidate.flexibility) || 15;
  const agreedFlexibility = Math.min(reqFlex, candFlex);

  if (circularDiff > agreedFlexibility) {
    return { score: 0, reasons: [] };
  }

  const reasons = [];

  // Time score (0-50, scaled linearly by timeDiff / allowedWindow)
  // When circularDiff is 0, timeScore = 50. At allowedWindow, timeScore = 0.
  const timeScore = Math.max(0, Math.round(50 * (1 - (circularDiff / (agreedFlexibility || 1)))));
  if (circularDiff === 0) {
    reasons.push('✓ Exact same departure time');
  } else {
    reasons.push(`✓ Departure within ${circularDiff}m (±${agreedFlexibility}m)`);
  }

  // Hostel proximity score (10-40)
  const proximity = getHostelProximity(userReq.hostel, candidate.hostel);
  const hostelScore = proximity.score;
  reasons.push(`✓ ${proximity.label}`);

  // Transport score (10 if identical, 5 if Either)
  const transportScore =
    reqTransport !== 'Either' && candTransport !== 'Either' && reqTransport === candTransport
      ? 10
      : 5;
  if (reqTransport !== 'Either' && candTransport !== 'Either' && reqTransport === candTransport) {
    reasons.push(`✓ Both prefer ${reqTransport}`);
  } else {
    reasons.push('✓ Compatible ride vehicle');
  }

  // Total score = timeScore (0-50) + hostelScore (10-40) + transportBonus (5-10), capped at 100
  const totalScore = Math.min(100, Math.max(0, timeScore + hostelScore + transportScore));

  return {
    score: totalScore,
    reasons,
    timeDiff: circularDiff
  };
}

export function scoreOpenGroupForJourney(journeyReq, group) {
  const reqDest = journeyReq.destinationId || journeyReq.destination_id;
  if (reqDest !== group.destination_id) return null;

  const reqDate = normalizeDateStr(journeyReq.date);
  const grpDate = normalizeDateStr(group.date);
  if (reqDate !== grpDate) return null;

  if (group.status !== 'Open') return null;
  if ((group.members || []).length >= (group.capacity || group.max_members || 4)) return null;

  // Vehicle compatibility
  const reqTransport = journeyReq.transport || 'Either';
  const grpTransport = group.transport || 'Shared Cab';
  const isVehicleCompatible =
    reqTransport === 'Either' ||
    grpTransport === 'Either' ||
    reqTransport === grpTransport;

  if (!isVehicleCompatible) return null;

  // Circular time difference within requester flexibility
  const reqTime = journeyReq.departureTime || journeyReq.departure_time;
  const grpTime = group.departure_time;
  const circularDiff = getCircularMinuteDiff(reqTime, grpTime);
  const reqFlex = Number(journeyReq.flexibility) || 15;

  if (circularDiff > reqFlex) return null;

  // Best hostel score among existing group members
  let bestHostelScore = 10;
  let bestHostelLabel = 'Wider campus';
  for (const m of group.members || []) {
    const prox = getHostelProximity(journeyReq.hostel, m.hostel);
    if (prox.score > bestHostelScore) {
      bestHostelScore = prox.score;
      bestHostelLabel = prox.label;
    }
  }

  // Time score (0-50)
  const timeScore = Math.max(0, Math.round(50 * (1 - (circularDiff / (reqFlex || 1)))));

  // Transport bonus
  const transportScore = (reqTransport === grpTransport && reqTransport !== 'Either') ? 10 : 5;

  const score = Math.min(100, Math.max(0, timeScore + bestHostelScore + transportScore));
  return {
    group,
    matchScore: score,
    timeDiff: circularDiff,
    reasons: [
      circularDiff === 0 ? '✓ Exact departure time' : `✓ Departure within ${circularDiff}m`,
      `✓ ${bestHostelLabel}`,
      `✓ Fits ${grpTransport}`
    ]
  };
}
