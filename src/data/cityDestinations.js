// Preset drop hubs for official student city communities

export const CITY_PRESET_DESTINATIONS = {
  del: [
    'Kashmiri Gate ISBT (Metro Hub)',
    'Dhaula Kuan / South Delhi',
    'Gurgaon Cyber Hub / IFFCO Chowk',
    'Noida Sector 18 / Botanical Garden',
    'IGI Airport (Terminal 3)',
    'Anand Vihar ISBT / East Delhi'
  ],
  chd: [
    'ISBT Sector 43 (Chandigarh)',
    'Tribune Chowk / Sector 32',
    'Elante Mall (Industrial Area Phase 1)',
    'Housing Board Chowk (Panchkula / Manimajra)',
    'Chandigarh Railway Station'
  ],
  jal: [
    'Rama Mandi Roundabout',
    'PAP Chowk (GT Road)',
    'Jalandhar Bus Stand (ISBT)',
    'Model Town Market',
    'Jalandhar City Railway Station'
  ],
  lud: [
    'Clock Tower (Ghanta Ghar)',
    'Ludhiana Bus Stand',
    'Ferozepur Road / Aarti Chowk',
    'Model Town Gol Market',
    'Ludhiana Junction Railway Station'
  ],
  asr: [
    'Amritsar Bus Stand',
    'Golden Temple Forecourt',
    'Amritsar Junction Railway Station',
    'Ranjit Avenue / Mall of Amritsar'
  ],
  bth: [
    'Bathinda Bus Stand',
    'Bathinda Junction Railway Station',
    'Mittal City Mall'
  ],
  jpr: [
    'Sindhi Camp Central Bus Stand',
    'Jaipur Junction Railway Station',
    'MI Road / Ajmeri Gate',
    'Malviya Nagar / Gaurav Tower'
  ]
};

export function getPresetDestinationsForCommunity(communityId, communityName = 'City') {
  if (communityId && CITY_PRESET_DESTINATIONS[communityId]) {
    return CITY_PRESET_DESTINATIONS[communityId];
  }
  return [
    `${communityName} City Center`,
    `${communityName} Main Bus Stand`,
    `${communityName} Railway Station`
  ];
}
