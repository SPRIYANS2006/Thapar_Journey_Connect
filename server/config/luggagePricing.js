// Configurable pricing matrix for luggage transport (Porter/Rapido Parcel style)

export const VEHICLE_CONFIG = {
  'Bike/Scooter': {
    label: 'Bike / Scooter',
    icon: 'Bike',
    description: 'Best for 1-2 backpacks, duffel bags or small parcels',
    maxItems: 2,
    baseFare: 80,
    supportedSizes: ['Small', 'Medium']
  },
  'Auto/e-rickshaw': {
    label: 'Auto / E-Rickshaw',
    icon: 'Car',
    description: 'Good for 2-4 standard trolley bags and medium boxes',
    maxItems: 4,
    baseFare: 180,
    supportedSizes: ['Small', 'Medium', 'Large']
  },
  'Tempo/Mini-truck': {
    label: 'Tempo / Mini-Truck (Tata Ace)',
    icon: 'Truck',
    description: 'Heavy luggage, iron trunks, furniture, or multiple large boxes',
    maxItems: 12,
    baseFare: 420,
    supportedSizes: ['Small', 'Medium', 'Large', 'Trunk-Box']
  }
};

export const ITEM_SIZE_RATES = {
  Small: { label: 'Small (Backpack / Duffel)', price: 30 },
  Medium: { label: 'Medium (Cabin Trolley 20"-24")', price: 60 },
  Large: { label: 'Large (Check-in Trolley 28"+)', price: 100 },
  'Trunk-Box': { label: 'Trunk / Metal Box / Heavy Crate', price: 180 }
};

export const DESTINATION_BANDS = [
  { match: /railway|station|cantt/i, name: 'Railway Stations (Patiala / Cantt)', distanceFee: 60 },
  { match: /bus|isbt|stand/i, name: 'Bus Stand / ISBT Patiala', distanceFee: 50 },
  { match: /urban estate|tripuri|model town|passi|leela/i, name: 'Patiala City Locals', distanceFee: 80 },
  { match: /rajpura|sirhind|nabha/i, name: 'Nearby Towns (Rajpura / Sirhind / Nabha)', distanceFee: 220 },
  { match: /chandigarh|mohali|panchkula|zirakpur/i, name: 'Tricity (Chandigarh / Mohali / Panchkula)', distanceFee: 420 },
  { match: /ambala/i, name: 'Ambala Cantt / City', distanceFee: 360 },
  { match: /ludhiana/i, name: 'Ludhiana', distanceFee: 520 },
  { match: /delhi|ncr|gurgaon|noida/i, name: 'Delhi / NCR Hubs', distanceFee: 950 }
];

export const DEFAULT_SLOT_CAPACITY = 4; // Max concurrent luggage bookings per 10-minute slot

/**
 * Calculate luggage fare with dynamic pooling savings
 */
export function calculateLuggageFare({
  destination = '',
  vehicleType = 'Tempo/Mini-truck',
  items = [],
  poolCount = 1
}) {
  const vehicle = VEHICLE_CONFIG[vehicleType] || VEHICLE_CONFIG['Tempo/Mini-truck'];
  let baseFare = vehicle.baseFare;

  // Find destination distance fee
  let distanceFee = 120; // default local
  for (const band of DESTINATION_BANDS) {
    if (band.match.test(destination)) {
      distanceFee = band.distanceFee;
      break;
    }
  }

  // Items total
  let itemsTotal = 0;
  let totalItemCount = 0;
  for (const item of items) {
    const count = parseInt(item.count, 10) || 1;
    const rate = ITEM_SIZE_RATES[item.size]?.price || 50;
    itemsTotal += rate * count;
    totalItemCount += count;
  }

  const combinedVehicleAndDistance = baseFare + distanceFee;

  // "Pool and Save" discount logic:
  // If poolCount >= 2, the vehicle & distance base cost is shared!
  // e.g. 2 orders = 40% discount on transport base; 3 orders = 55% discount; 4+ = 65% discount.
  let poolDiscountFactor = 0;
  if (poolCount === 2) {
    poolDiscountFactor = 0.35;
  } else if (poolCount === 3) {
    poolDiscountFactor = 0.50;
  } else if (poolCount >= 4) {
    poolDiscountFactor = 0.60;
  }

  const pooledSavings = Math.round(combinedVehicleAndDistance * poolDiscountFactor);
  const finalFare = Math.max(80, combinedVehicleAndDistance - pooledSavings + itemsTotal);

  return {
    baseFare,
    distanceFee,
    itemsTotal,
    totalItemCount,
    combinedBase: combinedVehicleAndDistance,
    pooledSavings,
    poolCount,
    estimatedFare: finalFare
  };
}
