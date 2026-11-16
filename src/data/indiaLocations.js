import catalogue from '../../public/data/india-cities.json' with { type: 'json' };

export const INDIA_LOCATIONS = catalogue.map(location => ({
  state: location.state,
  cities: location.cities.map(name => ({ name }))
}));

export const ALL_INDIAN_STATES = INDIA_LOCATIONS.map(location => location.state);
export const POPULAR_STATES = ['Punjab', 'Chandigarh', 'Delhi', 'Haryana', 'Himachal Pradesh', 'Rajasthan'];

export function getCitiesByState(stateName) {
  if (!stateName) return [];
  return INDIA_LOCATIONS.find(location => location.state.toLowerCase() === stateName.trim().toLowerCase())?.cities || [];
}

export function getCityDetails(stateName, cityName) {
  if (!cityName) return null;
  return getCitiesByState(stateName).find(city => city.name.toLowerCase() === cityName.trim().toLowerCase()) || null;
}
