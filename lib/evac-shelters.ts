import type { EvacShelter } from '@/app/dashboard/caregiver/map/LeafletMap'
export const EVAC_SHELTERS: EvacShelter[] = [
  // California
  { id: 1, name: 'Pomona Fairplex', lat: 34.0564, lng: -117.7503, type: 'evacuation', county: 'Los Angeles, CA', capacity: 2000 },
  { id: 2, name: 'Del Mar Fairgrounds', lat: 32.9595, lng: -117.2653, type: 'evacuation', county: 'San Diego, CA', capacity: 1500 },
  { id: 3, name: 'Sonoma County Fairgrounds', lat: 38.4346, lng: -122.7249, type: 'evacuation', county: 'Sonoma, CA', capacity: 1200 },
  { id: 4, name: 'Cal Expo (Pet-Friendly)', lat: 38.5961, lng: -121.4143, type: 'evacuation', county: 'Sacramento, CA', capacity: 800 },
  { id: 5, name: 'Ventura County Fairgrounds', lat: 34.2766, lng: -119.2953, type: 'evacuation', county: 'Ventura, CA', capacity: 900 },
  { id: 6, name: 'Santa Barbara County Shelter', lat: 34.4208, lng: -119.6982, type: 'evacuation', county: 'Santa Barbara, CA', capacity: 600 },
  { id: 7, name: 'Butte County Fairgrounds', lat: 39.7285, lng: -121.8375, type: 'evacuation', county: 'Butte, CA', capacity: 700 },
  { id: 8, name: 'Shasta District Fairgrounds', lat: 40.5865, lng: -122.3917, type: 'evacuation', county: 'Shasta, CA', capacity: 500 },
  { id: 9, name: 'Fresno Convention Center', lat: 36.7378, lng: -119.7871, type: 'evacuation', county: 'Fresno, CA', capacity: 1100 },
  { id: 10, name: 'San Bernardino Nat\'l Orange Show', lat: 34.0922, lng: -117.2944, type: 'evacuation', county: 'San Bernardino, CA', capacity: 1300 },
  { id: 11, name: 'Riverside County Fairgrounds', lat: 33.9806, lng: -117.3756, type: 'evacuation', county: 'Riverside, CA', capacity: 900 },
  { id: 12, name: 'Napa Valley Expo', lat: 38.2975, lng: -122.2869, type: 'evacuation', county: 'Napa, CA', capacity: 400 },
  // Arizona
  { id: 13, name: 'Tucson Convention Center', lat: 32.2228, lng: -110.9747, type: 'evacuation', county: 'Pima, AZ', capacity: 1100 },
  { id: 14, name: 'Phoenix Veteran Memorial Coliseum', lat: 33.5007, lng: -112.0709, type: 'evacuation', county: 'Maricopa, AZ', capacity: 1800 },
  { id: 15, name: 'Yavapai College Prescott', lat: 34.5400, lng: -112.4685, type: 'evacuation', county: 'Yavapai, AZ', capacity: 400 },
  { id: 16, name: 'Flagstaff Coconino Center for the Arts', lat: 35.1983, lng: -111.6513, type: 'evacuation', county: 'Coconino, AZ', capacity: 350 },
  // Oregon & Washington
  { id: 17, name: 'Klamath Falls Expo Center', lat: 42.2249, lng: -121.7753, type: 'evacuation', county: 'Klamath, OR', capacity: 400 },
  { id: 18, name: 'Oregon Convention Center', lat: 45.5279, lng: -122.6625, type: 'evacuation', county: 'Multnomah, OR', capacity: 2000 },
  { id: 19, name: 'Jackson County Expo', lat: 42.3265, lng: -122.8756, type: 'evacuation', county: 'Jackson, OR', capacity: 600 },
  { id: 20, name: 'Spokane Arena Shelter', lat: 47.6587, lng: -117.4260, type: 'evacuation', county: 'Spokane, WA', capacity: 1300 },
  { id: 21, name: 'Yakima SunDome', lat: 46.5952, lng: -120.5309, type: 'evacuation', county: 'Yakima, WA', capacity: 800 },
  { id: 22, name: 'Wenatchee Convention Center', lat: 47.4235, lng: -120.3103, type: 'evacuation', county: 'Chelan, WA', capacity: 400 },
  { id: 23, name: 'Tacoma Convention Center', lat: 47.2529, lng: -122.4443, type: 'evacuation', county: 'Pierce, WA', capacity: 900 },
  // Nevada, Idaho, Montana
  { id: 24, name: 'Reno-Sparks Convention Center', lat: 39.5279, lng: -119.8143, type: 'evacuation', county: 'Washoe, NV', capacity: 900 },
  { id: 25, name: 'Las Vegas Convention Center', lat: 36.1317, lng: -115.1519, type: 'evacuation', county: 'Clark, NV', capacity: 3000 },
  { id: 26, name: 'Boise State Pavilion', lat: 43.6028, lng: -116.2003, type: 'evacuation', county: 'Ada, ID', capacity: 1100 },
  { id: 27, name: 'Idaho Falls Civic Auditorium', lat: 43.4927, lng: -112.0408, type: 'evacuation', county: 'Bonneville, ID', capacity: 400 },
  { id: 28, name: 'Missoula County Fairgrounds', lat: 46.8679, lng: -114.0121, type: 'evacuation', county: 'Missoula, MT', capacity: 500 },
  { id: 29, name: 'Billings MetraPark', lat: 45.7779, lng: -108.5007, type: 'evacuation', county: 'Yellowstone, MT', capacity: 700 },
  // New Mexico, Colorado, Utah
  { id: 30, name: 'Albuquerque Convention Center', lat: 35.0853, lng: -106.6505, type: 'evacuation', county: 'Bernalillo, NM', capacity: 700 },
  { id: 31, name: 'Taos County Fairgrounds', lat: 36.4072, lng: -105.5730, type: 'evacuation', county: 'Taos, NM', capacity: 250 },
  { id: 32, name: 'Santa Fe Convention Center', lat: 35.6870, lng: -105.9378, type: 'evacuation', county: 'Santa Fe, NM', capacity: 400 },
  { id: 33, name: 'Denver Coliseum', lat: 39.7758, lng: -104.9742, type: 'evacuation', county: 'Denver, CO', capacity: 1600 },
  { id: 34, name: 'Colorado Springs City Auditorium', lat: 38.8339, lng: -104.8214, type: 'evacuation', county: 'El Paso, CO', capacity: 700 },
  { id: 35, name: 'Salt Palace Convention Center', lat: 40.7608, lng: -111.8910, type: 'evacuation', county: 'Salt Lake, UT', capacity: 1500 },
  { id: 36, name: 'Utah County Fairgrounds', lat: 40.2969, lng: -111.6946, type: 'evacuation', county: 'Utah, UT', capacity: 600 },
  // Texas
  { id: 37, name: 'George R. Brown Convention Ctr', lat: 29.7533, lng: -95.3596, type: 'evacuation', county: 'Harris, TX', capacity: 4000 },
  { id: 38, name: 'Fort Worth Convention Center', lat: 32.7484, lng: -97.3286, type: 'evacuation', county: 'Tarrant, TX', capacity: 1800 },
  { id: 39, name: 'Austin Convention Center', lat: 30.2626, lng: -97.7404, type: 'evacuation', county: 'Travis, TX', capacity: 1200 },
  { id: 40, name: 'San Antonio Freeman Coliseum', lat: 29.4241, lng: -98.4936, type: 'evacuation', county: 'Bexar, TX', capacity: 1500 },
  { id: 41, name: 'Lubbock Civic Center', lat: 33.5779, lng: -101.8552, type: 'evacuation', county: 'Lubbock, TX', capacity: 600 },
  { id: 42, name: 'Amarillo Civic Center', lat: 35.2220, lng: -101.8313, type: 'evacuation', county: 'Potter, TX', capacity: 700 },
  // Southeast / Carolinas
  { id: 43, name: 'Charlotte Convention Center', lat: 35.2271, lng: -80.8431, type: 'evacuation', county: 'Mecklenburg, NC', capacity: 3000 },
  { id: 44, name: 'Cabarrus County Fairgrounds', lat: 35.3882, lng: -80.5496, type: 'evacuation', county: 'Cabarrus, NC', capacity: 800 },
  { id: 45, name: 'NC State Fairgrounds (Wake Co.)', lat: 35.7885, lng: -78.7026, type: 'evacuation', county: 'Wake, NC', capacity: 1200 },
  { id: 46, name: 'WNC Ag Center (Buncombe)', lat: 35.5951, lng: -82.5515, type: 'evacuation', county: 'Buncombe, NC', capacity: 700 },
  { id: 47, name: 'Greensboro Coliseum Complex', lat: 36.0726, lng: -79.7920, type: 'evacuation', county: 'Guilford, NC', capacity: 1500 },
  { id: 48, name: 'Forsyth County Shelter', lat: 36.0998, lng: -80.2442, type: 'evacuation', county: 'Forsyth, NC', capacity: 800 },
  { id: 49, name: 'Columbia Metropolitan Conv Ctr', lat: 34.0007, lng: -81.0348, type: 'evacuation', county: 'Richland, SC', capacity: 1400 },
  { id: 50, name: 'Spartanburg Memorial Auditorium', lat: 34.9496, lng: -81.9320, type: 'evacuation', county: 'Spartanburg, SC', capacity: 600 },
  { id: 51, name: 'Georgia World Congress Center', lat: 33.7573, lng: -84.3963, type: 'evacuation', county: 'Fulton, GA', capacity: 2500 },
  { id: 52, name: 'Floyd County Emergency Shelter', lat: 34.2579, lng: -85.1647, type: 'evacuation', county: 'Floyd, GA', capacity: 500 },
  { id: 53, name: 'Nashville Municipal Auditorium', lat: 36.1687, lng: -86.7816, type: 'evacuation', county: 'Davidson, TN', capacity: 1100 },
  { id: 54, name: 'Knoxville Convention Center', lat: 35.9606, lng: -83.9207, type: 'evacuation', county: 'Knox, TN', capacity: 800 },
  { id: 55, name: 'Huntsville Von Braun Center', lat: 34.7304, lng: -86.5861, type: 'evacuation', county: 'Madison, AL', capacity: 900 },
  { id: 56, name: 'Birmingham-Jefferson Convention', lat: 33.5186, lng: -86.8104, type: 'evacuation', county: 'Jefferson, AL', capacity: 1200 },
  { id: 57, name: 'Virginia Beach Convention Center', lat: 36.8354, lng: -75.9777, type: 'evacuation', county: 'Virginia Beach, VA', capacity: 1100 },
  { id: 58, name: 'Richmond Convention Center', lat: 37.5330, lng: -77.4352, type: 'evacuation', county: 'Richmond, VA', capacity: 900 },
  // Florida
  { id: 59, name: 'Orange County Convention Center', lat: 28.4254, lng: -81.4719, type: 'evacuation', county: 'Orange, FL', capacity: 3000 },
  { id: 60, name: 'Broward Convention Center', lat: 26.1099, lng: -80.1253, type: 'evacuation', county: 'Broward, FL', capacity: 1800 },
  { id: 61, name: 'Tampa Convention Center', lat: 27.9422, lng: -82.4589, type: 'evacuation', county: 'Hillsborough, FL', capacity: 1500 },
  { id: 62, name: 'Leon County Civic Center', lat: 30.4383, lng: -84.2807, type: 'evacuation', county: 'Leon, FL', capacity: 700 },
  // Midwest
  { id: 63, name: 'McCormick Place Chicago', lat: 41.8525, lng: -87.6156, type: 'evacuation', county: 'Cook, IL', capacity: 5000 },
  { id: 64, name: 'Kansas City Convention Center', lat: 39.0997, lng: -94.5786, type: 'evacuation', county: 'Jackson, MO', capacity: 1500 },
  { id: 65, name: 'Minneapolis Convention Center', lat: 44.9737, lng: -93.2732, type: 'evacuation', county: 'Hennepin, MN', capacity: 1800 },
  { id: 66, name: 'Sioux Falls Convention Center', lat: 43.5473, lng: -96.7283, type: 'evacuation', county: 'Minnehaha, SD', capacity: 600 },
  { id: 67, name: 'Bismarck Civic Center', lat: 46.8083, lng: -100.7837, type: 'evacuation', county: 'Burleigh, ND', capacity: 400 },
  // Northeast
  { id: 68, name: 'Boston Convention & Exhibition', lat: 42.3455, lng: -71.0444, type: 'evacuation', county: 'Suffolk, MA', capacity: 2000 },
  { id: 69, name: 'Jacob K. Javits Convention Ctr', lat: 40.7579, lng: -74.0027, type: 'evacuation', county: 'New York, NY', capacity: 4000 },
  { id: 70, name: 'Pennsylvania Convention Center', lat: 39.9535, lng: -75.1599, type: 'evacuation', county: 'Philadelphia, PA', capacity: 2500 },
  // Hawaii & Alaska
  { id: 71, name: 'Hawaii Convention Center', lat: 21.2890, lng: -157.8388, type: 'evacuation', county: 'Honolulu, HI', capacity: 1000 },
  { id: 72, name: 'Maui War Memorial Auditorium', lat: 20.8893, lng: -156.4729, type: 'evacuation', county: 'Maui, HI', capacity: 300 },
  { id: 73, name: 'Egan Convention Center', lat: 61.2181, lng: -149.9003, type: 'evacuation', county: 'Anchorage, AK', capacity: 800 },
  // Animal shelters (nationwide)
  { id: 74, name: 'Pasadena Humane Society', lat: 34.1478, lng: -118.1445, type: 'animal', county: 'Los Angeles, CA', capacity: 200 },
  { id: 75, name: 'Sacramento SPCA', lat: 38.5815, lng: -121.4944, type: 'animal', county: 'Sacramento, CA', capacity: 150 },
  { id: 76, name: 'AZ Humane Society Phoenix', lat: 33.6751, lng: -112.1150, type: 'animal', county: 'Maricopa, AZ', capacity: 180 },
  { id: 77, name: 'Oregon Humane Society', lat: 45.5688, lng: -122.6468, type: 'animal', county: 'Multnomah, OR', capacity: 100 },
  { id: 78, name: 'Humane Society of Charlotte', lat: 35.2559, lng: -80.7993, type: 'animal', county: 'Mecklenburg, NC', capacity: 200 },
  { id: 79, name: 'Cabarrus Animal Shelter', lat: 35.3798, lng: -80.5523, type: 'animal', county: 'Cabarrus, NC', capacity: 120 },
  { id: 80, name: 'Atlanta Humane Society', lat: 33.7815, lng: -84.3791, type: 'animal', county: 'Fulton, GA', capacity: 160 },
  { id: 81, name: 'Houston SPCA', lat: 29.7365, lng: -95.4246, type: 'animal', county: 'Harris, TX', capacity: 250 },
  { id: 82, name: 'Denver Dumb Friends League', lat: 39.6914, lng: -104.9903, type: 'animal', county: 'Denver, CO', capacity: 180 },
  { id: 83, name: 'Washington Humane Society', lat: 38.9072, lng: -77.0369, type: 'animal', county: 'DC', capacity: 150 },
]

const ANIMAL_NAME_BLACKLIST =
  /\b(animal|humane society|spca|veterinary|vet\s|pet\s|dog|cat|wildlife|kennel|zoo)\b/i

export function isHumanEvacShelterName(name: string): boolean {
  return !ANIMAL_NAME_BLACKLIST.test(name)
}

export function isHumanEvacShelter(s: EvacShelter): boolean {
  if (s.type !== 'evacuation') return false
  return isHumanEvacShelterName(s.name)
}

export const HUMAN_EVAC_SHELTERS: EvacShelter[] = EVAC_SHELTERS.filter(isHumanEvacShelter)
