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

export const MOCK_STUDENTS = [
  {
    id: 's1',
    name: 'Rahul Sharma',
    avatar: 'RS',
    email: 'rsharma_be22@thapar.edu',
    hostel: 'Agira Hall (Previously known as Hostel-A)',
    destinationId: 'railway',
    departureTime: '17:05', // 5:05 PM
    flexibility: 15,
    transport: 'Shared Cab',
    reliability: 4.9,
    trips: 14,
    phone: '+91 98765 43210'
  },
  {
    id: 's2',
    name: 'Aman Verma',
    avatar: 'AV',
    email: 'averma_be22@thapar.edu',
    hostel: 'Amritam Hall (Previously known as Hostel-B)',
    destinationId: 'railway',
    departureTime: '17:10', // 5:10 PM
    flexibility: 15,
    transport: 'Shared Auto',
    reliability: 4.8,
    trips: 9,
    phone: '+91 98123 45678'
  },
  {
    id: 's3',
    name: 'Simran Kaur',
    avatar: 'SK',
    email: 'skaur_be23@thapar.edu',
    hostel: 'Vasudha Hall - Block E (Previously known as Hostel-E)',
    destinationId: 'railway',
    departureTime: '17:15', // 5:15 PM
    flexibility: 20,
    transport: 'Either',
    reliability: 4.7,
    trips: 11,
    phone: '+91 97654 32109'
  },
  {
    id: 's4',
    name: 'Arjun Gupta',
    avatar: 'AG',
    email: 'agupta_be22@thapar.edu',
    hostel: 'Prithvi Hall (Previously known as Hostel-C)',
    destinationId: 'railway',
    departureTime: '17:20', // 5:20 PM
    flexibility: 15,
    transport: 'Shared Cab',
    reliability: 4.9,
    trips: 18,
    phone: '+91 99887 76655'
  },
  {
    id: 's5',
    name: 'Neha Patel',
    avatar: 'NP',
    email: 'npatel_be23@thapar.edu',
    hostel: 'Vasudha Hall - Block G (Previously known as Hostel-G)',
    destinationId: 'railway',
    departureTime: '17:25', // 5:25 PM
    flexibility: 30,
    transport: 'Either',
    reliability: 4.6,
    trips: 5,
    phone: '+91 98712 34567'
  },
  {
    id: 's6',
    name: 'Priya Sundaram',
    avatar: 'PS',
    email: 'psundaram_be21@thapar.edu',
    hostel: 'Vasudha Hall - Block E (Previously known as Hostel-E)',
    destinationId: 'chd_airport',
    departureTime: '18:00', // 6:00 PM
    flexibility: 30,
    transport: 'Shared Cab',
    reliability: 5.0,
    trips: 22,
    phone: '+91 91234 56789'
  },
  {
    id: 's7',
    name: 'Tanmay Joshi',
    avatar: 'TJ',
    email: 'tjoshi_be22@thapar.edu',
    hostel: 'Neeram Hall (Previously known as Hostel-D)',
    destinationId: 'chd_airport',
    departureTime: '18:15', // 6:15 PM
    flexibility: 20,
    transport: 'Shared Cab',
    reliability: 4.8,
    trips: 8,
    phone: '+91 93456 78901'
  },
  {
    id: 's8',
    name: 'Dev Malhotra',
    avatar: 'DM',
    email: 'dmalhotra_be23@thapar.edu',
    hostel: 'Vyan Hall (Previously known as Hostel-H)',
    destinationId: 'bus_stand',
    departureTime: '07:30', // 7:30 AM
    flexibility: 15,
    transport: 'Shared Auto',
    reliability: 4.7,
    trips: 6,
    phone: '+91 94567 89012'
  },
  {
    id: 's9',
    name: 'Ananya Roy',
    avatar: 'AR',
    email: 'aroy_be22@thapar.edu',
    hostel: 'Ira Hall (Previously known as Hostel-I)',
    destinationId: 'bus_stand',
    departureTime: '07:40', // 7:40 AM
    flexibility: 20,
    transport: 'Either',
    reliability: 4.9,
    trips: 15,
    phone: '+91 95678 90123'
  },
  {
    id: 's10',
    name: 'Ishan Bhasin',
    avatar: 'IB',
    email: 'ibhasin_be21@thapar.edu',
    hostel: 'Tejas Hall (Previously known as Hostel-J)',
    destinationId: 'del_airport',
    departureTime: '23:00', // 11:00 PM
    flexibility: 30,
    transport: 'Shared Cab',
    reliability: 4.8,
    trips: 13,
    phone: '+91 96789 01234'
  }
];

export const INITIAL_GROUPS = [];

export const INITIAL_COMMUNITIES = [
  {
    id: 'jal',
    name: 'Jalandhar',
    state: 'Punjab',
    membersCount: 142,
    icon: '🏛️',
    distanceFromThapar: '145 km',
    popularTransport: 'GT Road Cabs, Intercity Trains',
    description: 'Active hub for students from Jalandhar, Phagwara & Doaba region. Regular Friday/Sunday carpools.',
    whatsappGroupLink: 'https://chat.whatsapp.com/demo-jalandhar',
    tags: ['Weekly Commuters', 'Cab Sharing', 'GT Road']
  },
  {
    id: 'del',
    name: 'Delhi NCR',
    state: 'National Capital Region',
    membersCount: 310,
    icon: '🚇',
    distanceFromThapar: '250 km',
    popularTransport: 'Rajpura Volvo, Shatabdi Express, Airport Cabs',
    description: 'Largest hometown community. Frequent weekend travel to Kashmiri Gate, ISBT, Gurgaon & Noida.',
    whatsappGroupLink: 'https://chat.whatsapp.com/demo-delhi-ncr',
    tags: ['Volvo Buses', 'Shatabdi', 'Long Weekends']
  },
  {
    id: 'ldh',
    name: 'Ludhiana',
    state: 'Punjab',
    membersCount: 185,
    icon: '🏭',
    distanceFromThapar: '95 km',
    popularTransport: 'Shared Cabs, PRTC Buses',
    description: 'Brisk weekend and day commuters sharing Innova/Ertiga cabs from TIET Main Gate.',
    whatsappGroupLink: 'https://chat.whatsapp.com/demo-ludhiana',
    tags: ['Daily/Weekly', 'Car Pooling', 'PRTC']
  },
  {
    id: 'chd',
    name: 'Chandigarh & Tri-City',
    state: 'Punjab / Haryana',
    membersCount: 240,
    icon: '🌳',
    distanceFromThapar: '65 km',
    popularTransport: 'Direct Cabs, Sector 43 Buses, Airport Rides',
    description: 'Chandigarh, Mohali & Panchkula students network. Daily commuters & weekend home trips.',
    whatsappGroupLink: 'https://chat.whatsapp.com/demo-chandigarh',
    tags: ['Tri-City', 'Airport Transit', 'Frequent']
  },
  {
    id: 'asr',
    name: 'Amritsar',
    state: 'Punjab',
    membersCount: 98,
    icon: '✨',
    distanceFromThapar: '225 km',
    popularTransport: 'Shan-e-Punjab, Vande Bharat, Shared Cabs',
    description: 'Students connecting for travel back home to Amritsar, Beas & Majha belt.',
    whatsappGroupLink: 'https://chat.whatsapp.com/demo-amritsar',
    tags: ['Train Groups', 'Festivals', 'Long Distance']
  },
  {
    id: 'bht',
    name: 'Bathinda',
    state: 'Punjab',
    membersCount: 64,
    icon: '🏰',
    distanceFromThapar: '155 km',
    popularTransport: 'PRTC Fast Buses, Intercity',
    description: 'Malwa region student network for shared rides across Rampura, Barnala and Bathinda.',
    whatsappGroupLink: 'https://chat.whatsapp.com/demo-bathinda',
    tags: ['Malwa Belt', 'PRTC Bus', 'Weekend Rides']
  },
  {
    id: 'jpr',
    name: 'Jaipur',
    state: 'Rajasthan',
    membersCount: 48,
    icon: '🦚',
    distanceFromThapar: '470 km',
    popularTransport: 'Overnight Trains, Delhi Intercity Flights',
    description: 'Students traveling together during semester holidays, Diwali and exam breaks.',
    whatsappGroupLink: 'https://chat.whatsapp.com/demo-jaipur',
    tags: ['Vacation Cohort', 'Direct Trains', 'Holiday Travel']
  },
  {
    id: 'pkl',
    name: 'Panchkula & Yamunanagar',
    state: 'Haryana',
    membersCount: 72,
    icon: '⛰️',
    distanceFromThapar: '80 km',
    popularTransport: 'Private Shared Cabs, Express Buses',
    description: 'Haryana border student community coordinating shared cabs via Zirakpur highway.',
    whatsappGroupLink: 'https://chat.whatsapp.com/demo-haryana',
    tags: ['Highway Cabs', 'Weekend Travel', 'Carpool']
  }
];

export const INITIAL_COMMUNITY_POSTS = [
  {
    id: 'post-1',
    communityId: 'jal',
    author: 'Aarav Sharma',
    authorAvatar: 'AS',
    authorHostel: 'H3',
    timeAgo: '2 hours ago',
    category: 'Ride Sharing',
    title: 'Booking Ertiga to Jalandhar Cantt this Friday 5 PM (2 seats open)',
    content: 'Leaving right after Friday afternoon labs from Gate 2. Total cost ~₹400 per person. Drop-off at Rama Mandi or Cantt station.',
    likes: 8,
    repliesCount: 3
  },
  {
    id: 'post-2',
    communityId: 'jal',
    author: 'Simran Kaur',
    authorAvatar: 'SK',
    authorHostel: 'Hostel D',
    timeAgo: '5 hours ago',
    category: 'Travel Tip',
    title: 'PRTC direct AC bus timings updated from Patiala Bus Stand',
    content: 'For everyone heading to Jalandhar, the 5:30 PM PRTC counter has started online reservation. Best for avoiding rush on long weekends!',
    likes: 14,
    repliesCount: 5
  },
  {
    id: 'post-3',
    communityId: 'del',
    author: 'Kabir Singla',
    authorAvatar: 'KS',
    authorHostel: 'H7',
    timeAgo: '1 hour ago',
    category: 'Cab Carpool',
    title: 'Overnight cab to Delhi IGI Airport for early morning flight',
    content: 'Leaving Thursday midnight around 12:30 AM from Executive Mess. Have 2 seats available in Innova Crysta.',
    likes: 11,
    repliesCount: 4
  },
  {
    id: 'post-4',
    communityId: 'chd',
    author: 'Priya Sundaram',
    authorAvatar: 'PS',
    authorHostel: 'Vasudha Hall - Block E (Previously known as Hostel-E)',
    timeAgo: '3 hours ago',
    category: 'Tri-City Commute',
    title: 'Uber XL split to Sector 43 Bus Stand / Airport on Saturday morning',
    content: 'Looking for 2 co-passengers at 7:30 AM. ₹350 each. Leaving from Gate 1.',
    likes: 6,
    repliesCount: 2
  }
];

export const INITIAL_USER_PROFILE = {
  id: 'user_main',
  name: 'Kartik Arora',
  email: 'student@thapar.edu',
  college: 'Thapar Institute of Engineering & Technology (TIET)',
  branch: 'Computer Engineering (CoE)',
  year: '3rd Year',
  hostel: 'HA',
  hometown: 'Jalandhar',
  joinedCommunity: 'jal',
  phone: '+91 98765 00000',
  tripsCompleted: 0,
  reliability: 5.0,
  preferredTransport: 'Shared Cab'
};

