export const DESTINATIONS = [
  {
    id: 'railway',
    name: 'Patiala Railway Station',
    icon: '🚆',
    description: 'Find students travelling from campus to Patiala Railway Station.',
    popularTime: 'Peak: 4:00 PM - 8:00 PM',
    distance: '8.5 km from Main Gate',
    avgCabFare: '₹150 - ₹200 total'
  },
  {
    id: 'bus_stand',
    name: 'Patiala Bus Stand',
    icon: '🚌',
    description: 'Find students travelling from campus to Patiala Bus Stand for intercity buses.',
    popularTime: 'Peak: 6:00 AM - 10:00 AM',
    distance: '6.2 km from Main Gate',
    avgCabFare: '₹120 - ₹160 total'
  },
  {
    id: 'chd_airport',
    name: 'Chandigarh Airport',
    icon: '✈️',
    description: 'Coordinate rides for flights departing from Shaheed Bhagat Singh Airport.',
    popularTime: 'Peak: Morning & Evening Flights',
    distance: '62 km from Main Gate',
    avgCabFare: '₹1,200 - ₹1,500 total'
  },
  {
    id: 'del_airport',
    name: 'Delhi Airport',
    icon: '✈️',
    description: 'Connect with students taking long-distance cabs or trains to IGI Airport.',
    popularTime: 'Peak: Overnight & Early Morning',
    distance: '250 km from Main Gate',
    avgCabFare: '₹4,500 - ₹5,500 total'
  }
];

export const HOSTELS = [
  // Boys Hostels (Official TIET Campus Halls)
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

  // Girls Hostels (Official TIET Halls)
  { id: 'HE', name: 'Vasudha Hall - Block E (Previously known as Hostel-E)', gender: 'Girls', cluster: 'Vasudha Complex' },
  { id: 'HG', name: 'Vasudha Hall - Block G (Previously known as Hostel-G)', gender: 'Girls', cluster: 'Vasudha Complex' },
  { id: 'HI', name: 'Ira Hall (Previously known as Hostel-I)', gender: 'Girls', cluster: 'Girls Quad' },
  { id: 'HN', name: 'Ananta Hall (Previously known as Hostel-N)', gender: 'Girls', cluster: 'Girls Quad' },
  { id: 'Dhriti', name: 'Dhriti Hall (Hostel-PG)', gender: 'Girls', cluster: 'Girls Quad' },
  { id: 'HQ', name: 'Vahni Hall (Previously known as Hostel-Q)', gender: 'Girls', cluster: 'Girls Quad' },
  { id: 'Pavani', name: 'Hostel-Pavani Hall (Previously Known As PG-2)', gender: 'Girls', cluster: 'Girls Quad' }
];

export const MOCK_STUDENTS = [];

export const INITIAL_GROUPS = [];

export const INITIAL_COMMUNITIES = [
  {
    id: 'jal',
    name: 'Jalandhar',
    state: 'Punjab',
    membersCount: 0,
    icon: '🏛️',
    distanceFromThapar: '145 km',
    popularTransport: 'GT Road Cabs, Intercity Trains',
    description: 'Active hub for students from Jalandhar, Phagwara & Doaba region. Regular carpools.',
    tags: ['Weekly Commuters', 'Cab Sharing', 'GT Road']
  },
  {
    id: 'del',
    name: 'Delhi NCR',
    state: 'National Capital Region',
    membersCount: 0,
    icon: '🚇',
    distanceFromThapar: '250 km',
    popularTransport: 'Rajpura Volvo, Shatabdi Express, Airport Cabs',
    description: 'Student community for South Delhi, Noida, Gurgaon, West Delhi & IGI Airport transit.',
    tags: ['Volvo Buses', 'Shatabdi', 'Long Weekends']
  },
  {
    id: 'ldh',
    name: 'Ludhiana',
    state: 'Punjab',
    membersCount: 0,
    icon: '🏭',
    distanceFromThapar: '95 km',
    popularTransport: 'Shared Cabs, PRTC Buses',
    description: 'Commuters sharing cabs from TIET Main Gate via GT Road corridor.',
    tags: ['Daily/Weekly', 'Car Pooling', 'PRTC']
  },
  {
    id: 'chd',
    name: 'Chandigarh & Tri-City',
    state: 'Punjab / Haryana',
    membersCount: 0,
    icon: '🌳',
    distanceFromThapar: '65 km',
    popularTransport: 'Direct Cabs, Sector 43 Buses, Airport Rides',
    description: 'Chandigarh, Mohali & Panchkula students network for campus transit and weekend trips.',
    tags: ['Tri-City', 'Airport Transit', 'Frequent']
  },
  {
    id: 'asr',
    name: 'Amritsar',
    state: 'Punjab',
    membersCount: 0,
    icon: '✨',
    distanceFromThapar: '225 km',
    popularTransport: 'Shan-e-Punjab, Vande Bharat, Shared Cabs',
    description: 'Students connecting for travel back home to Amritsar, Beas & Majha belt.',
    tags: ['Train Groups', 'Festivals', 'Long Distance']
  },
  {
    id: 'bth',
    name: 'Bathinda',
    state: 'Punjab',
    membersCount: 0,
    icon: '🏰',
    distanceFromThapar: '155 km',
    popularTransport: 'PRTC Fast Buses, Intercity',
    description: 'Malwa region student network for shared rides across Rampura, Barnala and Bathinda.',
    tags: ['Malwa Belt', 'PRTC Bus', 'Weekend Rides']
  },
  {
    id: 'jpr',
    name: 'Jaipur',
    state: 'Rajasthan',
    membersCount: 0,
    icon: '🦚',
    distanceFromThapar: '470 km',
    popularTransport: 'Overnight Trains, Delhi Intercity Flights',
    description: 'Students traveling together during semester holidays, Diwali and exam breaks.',
    tags: ['Vacation Cohort', 'Direct Trains', 'Holiday Travel']
  }
];

export const INITIAL_COMMUNITY_POSTS = [];

export const INITIAL_USER_PROFILE = {
  id: '',
  name: '',
  email: '',
  college: 'Thapar Institute of Engineering & Technology (TIET)',
  branch: '',
  year: '',
  hostel: '',
  hometown: '',
  joinedCommunity: null,
  phone: '',
  tripsCompleted: 0,
  reliability: 5.0,
  preferredTransport: 'Shared Cab'
};
