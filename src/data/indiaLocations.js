// Comprehensive Indian States and Prominent Cities Dataset
// Designed for Thapar Journey Connect Hometown Community Hubs
// Prevents arbitrary or erroneous state/city inputs while providing sensible transit defaults from TIET Patiala.

export const INDIA_LOCATIONS = [
  {
    state: 'Punjab',
    isPopular: true,
    cities: [
      { name: 'Patiala', distance: 5, transport: 'Local Auto / Campus E-Rickshaw', icon: '🏫' },
      { name: 'Jalandhar', distance: 145, transport: 'GT Road Cabs, Intercity Trains', icon: '🏛️' },
      { name: 'Ludhiana', distance: 95, transport: 'Direct Cabs, Passenger Trains', icon: '🏭' },
      { name: 'Amritsar', distance: 225, transport: 'Express Trains (Shan-e-Punjab), Highway Cabs', icon: '🛕' },
      { name: 'Bathinda', distance: 155, transport: 'PRTC Buses, Local Trains', icon: '⚡' },
      { name: 'Mohali (SAS Nagar)', distance: 65, transport: 'CTU Buses, Shared Cabs', icon: '🏢' },
      { name: 'Hoshiarpur', distance: 160, transport: 'Express Buses, Direct Cabs', icon: '🌳' },
      { name: 'Pathankot', distance: 250, transport: 'Express Trains, Highway Cabs', icon: '🏔️' },
      { name: 'Firozpur', distance: 185, transport: 'Direct Trains, Highway Cabs', icon: '🚂' },
      { name: 'Moga', distance: 140, transport: 'PRTC Buses, Highway Cabs', icon: '🌾' },
      { name: 'Kapurthala', distance: 140, transport: 'Intercity Trains, Direct Cabs', icon: '🏛️' },
      { name: 'Sangrur', distance: 55, transport: 'Direct Buses, Shared Cabs', icon: '🚗' },
      { name: 'Batala', distance: 210, transport: 'Express Trains, Cabs', icon: '🏭' },
      { name: 'Abohar', distance: 225, transport: 'PRTC Buses, Trains', icon: '🍊' },
      { name: 'Khanna', distance: 45, transport: 'GT Road Cabs, Direct Autos', icon: '🌾' },
      { name: 'Phagwara', distance: 130, transport: 'GT Road Cabs, Intercity Trains', icon: '🏛️' },
      { name: 'Rajpura', distance: 28, transport: 'Local Autos, Highway Cabs', icon: '🚗' },
      { name: 'Barnala', distance: 85, transport: 'PRTC Buses, Shared Cabs', icon: '🌾' },
      { name: 'Rupnagar (Ropar)', distance: 85, transport: 'Direct Cabs, Buses', icon: '🌊' },
      { name: 'Malerkotla', distance: 70, transport: 'Direct Buses, Shared Cabs', icon: '🕌' },
      { name: 'Faridkot', distance: 175, transport: 'PRTC Buses, Express Trains', icon: '🏰' },
      { name: 'Mansa', distance: 110, transport: 'PRTC Buses, Trains', icon: '🌾' }
    ]
  },
  {
    state: 'Chandigarh (UT)',
    isPopular: true,
    cities: [
      { name: 'Chandigarh (Sector 17 / 43)', distance: 65, transport: 'CTU Buses, Shared Cabs, Personal Cars', icon: '🏙️' },
      { name: 'Mohali Tri-City', distance: 60, transport: 'Shared Cabs, CTU Buses', icon: '🏢' },
      { name: 'Panchkula Tri-City', distance: 70, transport: 'Direct Cabs, CTU Buses', icon: '🌳' },
      { name: 'Zirakpur', distance: 60, transport: 'Highway Cabs, CTU Buses', icon: '🚗' },
      { name: 'Kharar', distance: 65, transport: 'Shared Cabs, CTU Buses', icon: '🏙️' }
    ]
  },
  {
    state: 'Delhi / NCR',
    isPopular: true,
    cities: [
      { name: 'Delhi (South & Central)', distance: 250, transport: 'Shatabdi Express, Long Cabs, Volvos', icon: '🚇' },
      { name: 'Delhi (West & North)', distance: 240, transport: 'Shatabdi Express, Direct Highway Cabs', icon: '🚇' },
      { name: 'Delhi (East & Shahdara)', distance: 255, transport: 'Intercity Trains, Long Cabs', icon: '🚇' },
      { name: 'Gurgaon (Gurugram)', distance: 270, transport: 'Direct Highway Cabs, Shatabdi + Metro', icon: '🏙️' },
      { name: 'Noida', distance: 265, transport: 'Direct Cabs via EPE, Shatabdi + Metro', icon: '🏢' },
      { name: 'Greater Noida', distance: 280, transport: 'Direct Cabs via Expressways', icon: '🎓' },
      { name: 'Faridabad', distance: 280, transport: 'Express Trains, Highway Cabs', icon: '🏭' },
      { name: 'Ghaziabad', distance: 255, transport: 'Intercity Trains, Highway Cabs', icon: '🚆' }
    ]
  },
  {
    state: 'Haryana',
    isPopular: true,
    cities: [
      { name: 'Ambala', distance: 50, transport: 'CTU / PRTC Buses, Express Trains', icon: '🚂' },
      { name: 'Karnal', distance: 125, transport: 'GT Road Cabs, Express Trains', icon: '🌾' },
      { name: 'Panipat', distance: 160, transport: 'GT Road Cabs, Intercity Trains', icon: '🏭' },
      { name: 'Sonipat', distance: 200, transport: 'GT Road Cabs, Shatabdi Trains', icon: '🚗' },
      { name: 'Kurukshetra', distance: 85, transport: 'Direct Cabs, Express Trains', icon: '🏹' },
      { name: 'Rohtak', distance: 195, transport: 'Interstate Buses, Direct Cabs', icon: '🏢' },
      { name: 'Hisar', distance: 175, transport: 'Haryana Roadways Buses, Cabs', icon: '🌾' },
      { name: 'Yamunanagar', distance: 110, transport: 'Direct Cabs, Intercity Buses', icon: '🪵' },
      { name: 'Rewari', distance: 290, transport: 'Express Trains, Highway Cabs', icon: '🚂' },
      { name: 'Bahadurgarh', distance: 230, transport: 'Highway Cabs, Express Buses', icon: '🏭' },
      { name: 'Sirsa', distance: 190, transport: 'Haryana Roadways Buses, Cabs', icon: '🌾' },
      { name: 'Kaithal', distance: 75, transport: 'Direct Buses, Shared Cabs', icon: '🚗' },
      { name: 'Bhiwani', distance: 215, transport: 'Direct Buses, Trains', icon: '🥊' },
      { name: 'Palwal', distance: 310, transport: 'Express Trains, Long Cabs', icon: '🌾' },
      { name: 'Jind', distance: 125, transport: 'Haryana Roadways, Shared Cabs', icon: '🚗' }
    ]
  },
  {
    state: 'Himachal Pradesh',
    isPopular: true,
    cities: [
      { name: 'Shimla', distance: 165, transport: 'HRTC Volvo, Direct Cabs, Kalka Toy Train', icon: '🏔️' },
      { name: 'Dharamshala', distance: 285, transport: 'Overnight Volvo, Private Cabs', icon: '🏔️' },
      { name: 'Solan', distance: 120, transport: 'Direct Cabs, Interstate Buses', icon: '🌲' },
      { name: 'Mandi', distance: 235, transport: 'HRTC Volvo, Highway Cabs', icon: '🌊' },
      { name: 'Kullu & Manali', distance: 325, transport: 'Overnight Volvo, Private Cabs', icon: '🏔️' },
      { name: 'Baddi', distance: 95, transport: 'Direct Cabs, Industrial Shuttle', icon: '🏭' },
      { name: 'Una', distance: 165, transport: 'Vande Bharat Express, Cabs', icon: '🚂' },
      { name: 'Hamirpur', distance: 215, transport: 'HRTC Buses, Highway Cabs', icon: '🌲' },
      { name: 'Bilaspur', distance: 185, transport: 'HRTC Buses, Private Cabs', icon: '🌊' },
      { name: 'Kangra', distance: 270, transport: 'Interstate Buses, Cabs', icon: '🛕' },
      { name: 'Chamba', distance: 360, transport: 'Overnight Buses, Cabs', icon: '🏔️' },
      { name: 'Nahan', distance: 130, transport: 'Direct Cabs, State Buses', icon: '🌲' }
    ]
  },
  {
    state: 'Jammu & Kashmir',
    isPopular: true,
    cities: [
      { name: 'Jammu', distance: 330, transport: 'Vande Bharat Express, Interstate Cabs', icon: '🛕' },
      { name: 'Srinagar', distance: 580, transport: 'Direct Flights from IXC, Highway Cabs', icon: '🏔️' },
      { name: 'Udhampur', distance: 385, transport: 'Express Trains, Highway Cabs', icon: '🚂' },
      { name: 'Kathua', distance: 260, transport: 'Express Trains, Direct Cabs', icon: '🌳' },
      { name: 'Anantnag', distance: 530, transport: 'Shared Cabs, Flights via IXC', icon: '🏔️' },
      { name: 'Baramulla', distance: 620, transport: 'Flights via IXC + Local Cab', icon: '🏔️' },
      { name: 'Sopore', distance: 605, transport: 'Flights via IXC + Local Cabs', icon: '🍎' }
    ]
  },
  {
    state: 'Uttarakhand',
    isPopular: true,
    cities: [
      { name: 'Dehradun', distance: 195, transport: 'Direct Cabs, Interstate Buses', icon: '🌲' },
      { name: 'Haridwar', distance: 210, transport: 'Direct Cabs, Express Trains', icon: '🛕' },
      { name: 'Rishikesh', distance: 225, transport: 'Direct Cabs, Express Buses', icon: '🌊' },
      { name: 'Roorkee', distance: 175, transport: 'Express Trains, Highway Cabs', icon: '🏛️' },
      { name: 'Haldwani', distance: 380, transport: 'Overnight Trains, Highway Cabs', icon: '🏔️' },
      { name: 'Nainital', distance: 410, transport: 'Overnight Buses, Private Cabs', icon: '🏔️' },
      { name: 'Rudrapur', distance: 350, transport: 'Direct Cabs, Intercity Trains', icon: '🏭' },
      { name: 'Kashipur', distance: 320, transport: 'Direct Cabs, Interstate Buses', icon: '🌾' },
      { name: 'Mussoorie', distance: 225, transport: 'Direct Cabs via Dehradun', icon: '🏔️' }
    ]
  },
  {
    state: 'Uttar Pradesh',
    isPopular: true,
    cities: [
      { name: 'Lucknow', distance: 750, transport: 'Shatabdi Express, Overnight Trains', icon: '🏛️' },
      { name: 'Kanpur', distance: 790, transport: 'Express Trains, Long Cabs', icon: '🏭' },
      { name: 'Agra', distance: 440, transport: 'Express Trains, Highway Cabs', icon: '🏰' },
      { name: 'Varanasi', distance: 1020, transport: 'Vande Bharat / Express Trains', icon: '🛕' },
      { name: 'Prayagraj (Allahabad)', distance: 930, transport: 'Overnight Express Trains', icon: '🌊' },
      { name: 'Meerut', distance: 230, transport: 'Intercity Trains, Highway Cabs', icon: '🚗' },
      { name: 'Bareilly', distance: 460, transport: 'Express Trains, Long Cabs', icon: '🌾' },
      { name: 'Aligarh', distance: 330, transport: 'Express Trains, Highway Cabs', icon: '🏛️' },
      { name: 'Moradabad', distance: 310, transport: 'Express Trains, Long Cabs', icon: '🏺' },
      { name: 'Gorakhpur', distance: 1010, transport: 'Overnight Express Trains', icon: '🛕' },
      { name: 'Saharanpur', distance: 140, transport: 'Express Trains, Direct Cabs', icon: '🪵' },
      { name: 'Jhansi', distance: 680, transport: 'Gatimaan / Shatabdi Express', icon: '🏰' },
      { name: 'Mathura', distance: 380, transport: 'Express Trains, Highway Cabs', icon: '🛕' },
      { name: 'Ayodhya', distance: 880, transport: 'Direct Express Trains, Long Cabs', icon: '🛕' },
      { name: 'Muzaffarnagar', distance: 180, transport: 'Direct Cabs, Express Trains', icon: '🌾' }
    ]
  },
  {
    state: 'Rajasthan',
    isPopular: true,
    cities: [
      { name: 'Jaipur', distance: 470, transport: 'Overnight Buses, Intercity Trains', icon: '🏰' },
      { name: 'Jodhpur', distance: 730, transport: 'Express Trains, Overnight Buses', icon: '🏰' },
      { name: 'Kota', distance: 680, transport: 'Superfast Trains, Long Cabs', icon: '🎓' },
      { name: 'Udaipur', distance: 820, transport: 'Overnight Trains, Connecting Flights', icon: '🏰' },
      { name: 'Bikaner', distance: 530, transport: 'Express Trains, Overnight Buses', icon: '🐪' },
      { name: 'Ajmer', distance: 590, transport: 'Express Trains, Interstate Buses', icon: '🕌' },
      { name: 'Alwar', distance: 390, transport: 'Direct Trains, Highway Cabs', icon: '🏰' },
      { name: 'Bhilwara', distance: 690, transport: 'Express Trains, Cabs', icon: '🏭' },
      { name: 'Sikar', distance: 450, transport: 'Interstate Buses, Trains', icon: '🏰' },
      { name: 'Sri Ganganagar', distance: 290, transport: 'Intercity Trains, PRTC Buses', icon: '🌾' },
      { name: 'Bharatpur', distance: 420, transport: 'Express Trains, Interstate Buses', icon: '🪶' }
    ]
  },
  {
    state: 'Bihar',
    isPopular: false,
    cities: [
      { name: 'Patna', distance: 1250, transport: 'Rajdhani / Express Trains', icon: '🏛️' },
      { name: 'Gaya', distance: 1320, transport: 'Superfast Express Trains', icon: '🛕' },
      { name: 'Bhagalpur', distance: 1450, transport: 'Express Trains', icon: '🌊' },
      { name: 'Muzaffarpur', distance: 1280, transport: 'Overnight Express Trains', icon: '🌾' },
      { name: 'Darbhanga', distance: 1320, transport: 'Express Trains, Flights via IXC', icon: '🏛️' },
      { name: 'Purnia', distance: 1510, transport: 'Express Trains', icon: '🌾' },
      { name: 'Bihar Sharif', distance: 1310, transport: 'Express Trains', icon: '🏛️' },
      { name: 'Arrah', distance: 1210, transport: 'Express Trains', icon: '🚆' }
    ]
  },
  {
    state: 'Madhya Pradesh',
    isPopular: false,
    cities: [
      { name: 'Bhopal', distance: 860, transport: 'Shatabdi / Express Trains', icon: '🏛️' },
      { name: 'Indore', distance: 990, transport: 'Overnight Express Trains', icon: '🍲' },
      { name: 'Gwalior', distance: 520, transport: 'Shatabdi / Gatimaan Trains', icon: '🏰' },
      { name: 'Jabalpur', distance: 1090, transport: 'Superfast Trains', icon: '🌊' },
      { name: 'Ujjain', distance: 940, transport: 'Superfast Express Trains', icon: '🛕' },
      { name: 'Sagar', distance: 850, transport: 'Express Trains', icon: '🏛️' },
      { name: 'Rewa', distance: 1020, transport: 'Express Trains', icon: '🌲' }
    ]
  },
  {
    state: 'Maharashtra',
    isPopular: false,
    cities: [
      { name: 'Mumbai', distance: 1580, transport: 'Rajdhani Express, Flights via IXC', icon: '🏙️' },
      { name: 'Pune', distance: 1650, transport: 'Direct Flights from IXC, Superfast Trains', icon: '🎓' },
      { name: 'Nagpur', distance: 1220, transport: 'Superfast Trains, Flights', icon: '🍊' },
      { name: 'Nashik', distance: 1450, transport: 'Express Trains, Connecting Cabs', icon: '🍇' },
      { name: 'Thane', distance: 1570, transport: 'Rajdhani Trains, Flights via IXC', icon: '🏙️' },
      { name: 'Navi Mumbai', distance: 1590, transport: 'Flights via IXC, Express Trains', icon: '🏙️' },
      { name: 'Aurangabad (Chhatrapati Sambhajinagar)', distance: 1470, transport: 'Connecting Flights, Trains', icon: '🏰' }
    ]
  },
  {
    state: 'Gujarat',
    isPopular: false,
    cities: [
      { name: 'Ahmedabad', distance: 1090, transport: 'Express Trains, Flights via IXC', icon: '🏛️' },
      { name: 'Surat', distance: 1320, transport: 'Superfast Trains, Flights', icon: '💎' },
      { name: 'Vadodara', distance: 1180, transport: 'Express Trains', icon: '🏰' },
      { name: 'Rajkot', distance: 1290, transport: 'Express Trains, Flights', icon: '🚗' },
      { name: 'Gandhinagar', distance: 1070, transport: 'Express Trains, Flights via IXC', icon: '🌳' },
      { name: 'Bhavnagar', distance: 1260, transport: 'Superfast Trains', icon: '⚓' }
    ]
  },
  {
    state: 'West Bengal',
    isPopular: false,
    cities: [
      { name: 'Kolkata', distance: 1680, transport: 'Rajdhani Express, Direct Flights via IXC', icon: '🏛️' },
      { name: 'Howrah', distance: 1675, transport: 'Rajdhani / Express Trains', icon: '🌉' },
      { name: 'Siliguri', distance: 1590, transport: 'Express Trains, Connecting Flights', icon: '☕' },
      { name: 'Durgapur', distance: 1520, transport: 'Express Trains', icon: '🏭' },
      { name: 'Asansol', distance: 1480, transport: 'Superfast Trains', icon: '⚡' }
    ]
  },
  {
    state: 'Jharkhand',
    isPopular: false,
    cities: [
      { name: 'Ranchi', distance: 1480, transport: 'Rajdhani / Express Trains', icon: '🌲' },
      { name: 'Jamshedpur', distance: 1600, transport: 'Express Trains', icon: '🏭' },
      { name: 'Dhanbad', distance: 1410, transport: 'Superfast Trains', icon: '⚡' },
      { name: 'Bokaro Steel City', distance: 1440, transport: 'Superfast Trains', icon: '🏭' },
      { name: 'Deoghar', distance: 1430, transport: 'Express Trains', icon: '🛕' }
    ]
  },
  {
    state: 'Telangana',
    isPopular: false,
    cities: [
      { name: 'Hyderabad', distance: 1760, transport: 'Direct Flights from IXC, Express Trains', icon: '🏢' },
      { name: 'Secunderabad', distance: 1750, transport: 'Superfast Express Trains', icon: '🚆' },
      { name: 'Warangal', distance: 1690, transport: 'Superfast Trains', icon: '🏛️' }
    ]
  },
  {
    state: 'Karnataka',
    isPopular: false,
    cities: [
      { name: 'Bengaluru', distance: 2300, transport: 'Direct Flights from IXC, Express Trains', icon: '💻' },
      { name: 'Mysuru', distance: 2420, transport: 'Connecting Flights from IXC', icon: '🏰' },
      { name: 'Mangaluru', distance: 2450, transport: 'Connecting Flights from IXC', icon: '🏖️' },
      { name: 'Hubballi-Dharwad', distance: 2050, transport: 'Superfast Trains', icon: '🎓' }
    ]
  },
  {
    state: 'Tamil Nadu',
    isPopular: false,
    cities: [
      { name: 'Chennai', distance: 2350, transport: 'Direct Flights from IXC, Express Trains', icon: '🌊' },
      { name: 'Coimbatore', distance: 2550, transport: 'Connecting Flights from IXC', icon: '🏭' },
      { name: 'Madurai', distance: 2690, transport: 'Connecting Flights from IXC', icon: '🛕' },
      { name: 'Tiruchirappalli', distance: 2580, transport: 'Flights via IXC / DEL', icon: '🏛️' }
    ]
  },
  {
    state: 'Kerala',
    isPopular: false,
    cities: [
      { name: 'Kochi', distance: 2800, transport: 'Direct Flights from IXC', icon: '🌴' },
      { name: 'Thiruvananthapuram', distance: 3000, transport: 'Connecting Flights from IXC', icon: '🌴' },
      { name: 'Kozhikode', distance: 2680, transport: 'Flights from IXC / DEL', icon: '🌊' }
    ]
  },
  {
    state: 'Assam',
    isPopular: false,
    cities: [
      { name: 'Guwahati', distance: 2080, transport: 'Direct Flights from IXC / DEL, Express Trains', icon: '🛕' },
      { name: 'Dibrugarh', distance: 2510, transport: 'Connecting Flights, Rajdhani Trains', icon: '☕' },
      { name: 'Silchar', distance: 2380, transport: 'Connecting Flights', icon: '🌲' }
    ]
  },
  {
    state: 'Odisha',
    isPopular: false,
    cities: [
      { name: 'Bhubaneswar', distance: 1850, transport: 'Direct Flights from IXC / DEL, Superfast Trains', icon: '🛕' },
      { name: 'Cuttack', distance: 1830, transport: 'Superfast Express Trains', icon: '🏛️' },
      { name: 'Rourkela', distance: 1530, transport: 'Express Trains', icon: '🏭' },
      { name: 'Puri', distance: 1910, transport: 'Express Trains', icon: '🌊' }
    ]
  },
  {
    state: 'Andhra Pradesh',
    isPopular: false,
    cities: [
      { name: 'Visakhapatnam', distance: 2050, transport: 'Flights from IXC / DEL, Express Trains', icon: '⚓' },
      { name: 'Vijayawada', distance: 1950, transport: 'Express Trains, Connecting Flights', icon: '🌊' },
      { name: 'Tirupati', distance: 2280, transport: 'Express Trains, Flights via IXC', icon: '🛕' }
    ]
  },
  {
    state: 'Chhattisgarh',
    isPopular: false,
    cities: [
      { name: 'Raipur', distance: 1320, transport: 'Direct Flights from IXC / DEL, Express Trains', icon: '🏭' },
      { name: 'Bhilai', distance: 1350, transport: 'Express Trains', icon: '🏭' },
      { name: 'Bilaspur', distance: 1260, transport: 'Superfast Trains', icon: '🚆' }
    ]
  },
  {
    state: 'Goa',
    isPopular: false,
    cities: [
      { name: 'Goa (Panaji & North)', distance: 1950, transport: 'Direct Flights from IXC / DEL', icon: '🏖️' },
      { name: 'Goa (Margao & South)', distance: 1980, transport: 'Direct Flights from IXC / DEL', icon: '🌴' }
    ]
  },
  {
    state: 'Ladakh (UT)',
    isPopular: false,
    cities: [
      { name: 'Leh', distance: 740, transport: 'Direct Flights / Manali Highway', icon: '🏔️' },
      { name: 'Kargil', distance: 840, transport: 'Highway Transport, Cabs', icon: '🏔️' }
    ]
  },
  {
    state: 'North-East & Other States',
    isPopular: false,
    cities: [
      { name: 'Shillong (Meghalaya)', distance: 2180, transport: 'Flights via Guwahati + Cabs', icon: '🌧️' },
      { name: 'Imphal (Manipur)', distance: 2540, transport: 'Flights from DEL', icon: '🌄' },
      { name: 'Aizawl (Mizoram)', distance: 2590, transport: 'Flights from DEL', icon: '🏔️' },
      { name: 'Agartala (Tripura)', distance: 2480, transport: 'Flights from DEL', icon: '🏛️' },
      { name: 'Kohima / Dimapur (Nagaland)', distance: 2360, transport: 'Connecting Flights', icon: '🌲' },
      { name: 'Gangtok (Sikkim)', distance: 1670, transport: 'Flights to Bagdogra + Cabs', icon: '🏔️' },
      { name: 'Itanagar (Arunachal Pradesh)', distance: 2390, transport: 'Flights via Donyi Polo', icon: '🏞️' },
      { name: 'Puducherry (UT)', distance: 2500, transport: 'Flights to Chennai + Cabs', icon: '🏖️' }
    ]
  }
];

export const ALL_INDIAN_STATES = INDIA_LOCATIONS.map((loc) => loc.state);

export const POPULAR_STATES = INDIA_LOCATIONS.filter((loc) => loc.isPopular).map((loc) => loc.state);

export function getCitiesByState(stateName) {
  if (!stateName) return [];
  const found = INDIA_LOCATIONS.find((loc) => loc.state.toLowerCase() === stateName.toLowerCase().trim());
  return found ? found.cities : [];
}

export function getCityDetails(stateName, cityName) {
  if (!stateName || !cityName) return null;
  const cities = getCitiesByState(stateName);
  return cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase().trim()) || null;
}
