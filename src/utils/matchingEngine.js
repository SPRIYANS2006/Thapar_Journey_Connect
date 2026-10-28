import { HOSTELS } from '../data/mockData';

// Helper to convert HH:MM string to total minutes from midnight
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format time from minutes back to HH:MM AM/PM
export function formatMinutesToTime(totalMinutes) {
  let hrs = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  hrs = hrs % 12;
  hrs = hrs ? hrs : 12;
  const minsStr = mins < 10 ? `0${mins}` : mins;
  return `${hrs}:${minsStr} ${ampm}`;
}

// Format HH:MM 24hr string to 12hr AM/PM string
export function formatTime24to12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = m < 10 ? `0${m}` : m;
  return `${displayH}:${displayM} ${ampm}`;
}

// Helper to compute hostel proximity relationship
export function getHostelProximity(hostelA, hostelB) {
  if (!hostelA || !hostelB) return { score: 10, label: 'Wider campus' };

  // Strip 'Hostel ' prefix if present for clean comparison
  const hA = hostelA.replace('Hostel ', '');
  const hB = hostelB.replace('Hostel ', '');

  if (hA === hB) {
    return { score: 40, label: 'Same hostel' };
  }

  const objA = HOSTELS.find(h => h.id === hA || h.name === hostelA);
  const objB = HOSTELS.find(h => h.id === hB || h.name === hostelB);

  if (objA && objB && objA.cluster === objB.cluster) {
    return { score: 30, label: 'Nearby hostel block' };
  }

  if (objA && objB && objA.gender === objB.gender) {
    return { score: 20, label: 'Same hostel quad' };
  }

  return { score: 15, label: 'Wider campus' };
}

// Compute match score and reason badges between user request and candidate student
export function calculateMatchScore(userReq, candidate) {
  // Check destination match
  if (userReq.destinationId !== candidate.destinationId) {
    return { score: 0, reasons: [] };
  }

  const userTimeMins = timeToMinutes(userReq.departureTime);
  const candidateTimeMins = timeToMinutes(candidate.departureTime);
  const timeDiff = Math.abs(userTimeMins - candidateTimeMins);

  const flexibility = userReq.flexibility || 15;

  // If time difference exceeds flexibility, non-compatible
  if (timeDiff > flexibility + 15) {
    return { score: 0, reasons: [] };
  }

  const reasons = [];

  // Time Compatibility Score (max 45)
  let timeScore = 0;
  if (timeDiff === 0) {
    timeScore = 45;
    reasons.push('✓ Exact same departure time');
  } else if (timeDiff <= 5) {
    timeScore = 42;
    reasons.push(`✓ Departure within ${timeDiff} mins`);
  } else if (timeDiff <= 15) {
    timeScore = 35;
    reasons.push(`✓ Departure within ${timeDiff} mins`);
  } else {
    timeScore = 25;
    reasons.push(`✓ Compatible time range (±${flexibility}m)`);
  }

  // Hostel Proximity Score (max 40)
  const proximity = getHostelProximity(userReq.hostel, candidate.hostel);
  const hostelScore = proximity.score;
  reasons.push(`✓ ${proximity.label}`);

  // Destination reason
  reasons.push('✓ Same destination');

  // Transport preference (max 15)
  let transportScore = 15;
  if (
    userReq.transport === 'Either' ||
    candidate.transport === 'Either' ||
    userReq.transport === candidate.transport
  ) {
    transportScore = 15;
    if (userReq.transport !== 'Either' && candidate.transport !== 'Either') {
      reasons.push(`✓ Both prefer ${userReq.transport}`);
    }
  } else {
    transportScore = 5;
  }

  const totalScore = Math.min(99, Math.max(60, timeScore + hostelScore + transportScore));

  return {
    score: totalScore,
    reasons,
    timeDiff
  };
}
