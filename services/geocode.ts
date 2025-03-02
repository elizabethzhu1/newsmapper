// Enhanced country and major city coordinates mapping
const locationCoordinates: Record<string, [number, number]> = {
  // Countries
  "United States": [-95.7129, 37.0902],
  "Russia": [37.6173, 55.7558], // Moscow as central point
  "China": [116.4074, 39.9042], // Beijing as central point
  "United Kingdom": [-0.1278, 51.5074], // London
  "France": [2.3522, 48.8566], // Paris
  "Germany": [13.4050, 52.5200], // Berlin
  "Japan": [139.6917, 35.6895], // Tokyo
  "India": [77.2090, 28.6139], // New Delhi
  "Brazil": [-47.9292, -15.7801], // Brasilia
  "Canada": [-75.6972, 45.4215], // Ottawa
  "Australia": [149.1300, -35.2809], // Canberra
  "South Africa": [28.0473, -26.2041], // Johannesburg
  "Mexico": [-99.1332, 19.4326], // Mexico City
  "Italy": [12.4964, 41.9028], // Rome
  "Spain": [-3.7038, 40.4168], // Madrid
  "Ukraine": [30.5234, 50.4501], // Kyiv
  
  // Major cities
  "New York": [-74.0060, 40.7128],
  "Los Angeles": [-118.2437, 34.0522],
  "Chicago": [-87.6298, 41.8781],
  "London": [-0.1278, 51.5074],
  "Paris": [2.3522, 48.8566],
  "Tokyo": [139.6917, 35.6895],
  "Beijing": [116.4074, 39.9042],
  "Moscow": [37.6173, 55.7558],
  "Sydney": [151.2093, -33.8688],
  "Toronto": [-79.3832, 43.6532],
  "Berlin": [13.4050, 52.5200],
  "Istanbul": [28.9784, 41.0082],
  "Dubai": [55.2708, 25.2048],
  "Hong Kong": [114.1694, 22.3193],
  "Singapore": [103.8198, 1.3521],

  // Regions
  "Middle East": [44.0150, 33.0000],
  "Europe": [9.1900, 48.6900],
  "Asia": [100.0000, 34.0000],
  "Africa": [20.0000, 5.0000],
  "North America": [-100.0000, 40.0000],
  "South America": [-60.0000, -20.0000],
  "Central America": [-85.0000, 15.0000],
  "Caribbean": [-75.0000, 18.0000],
  "Eastern Europe": [25.0000, 52.0000],
  "Western Europe": [5.0000, 48.0000],
  "Southeast Asia": [107.0000, 13.0000],
  "East Asia": [115.0000, 35.0000],
  "South Asia": [80.0000, 20.0000],
  "Central Asia": [65.0000, 43.0000],
  "North Africa": [20.0000, 28.0000],
  "Sub-Saharan Africa": [20.0000, 0.0000],
  "Scandinavia": [15.0000, 62.0000],
  "Balkans": [21.0000, 42.0000],
  "Latin America": [-80.0000, -10.0000],
  
  // Add more specific locations as needed
};

// Fallback coordinates for continental regions
const continentalFallbacks: Record<string, [number, number]> = {
  "North America": [-100.0000, 40.0000],
  "South America": [-60.0000, -20.0000],
  "Europe": [9.1900, 48.6900],
  "Asia": [100.0000, 34.0000],
  "Africa": [20.0000, 5.0000],
  "Australia": [134.0000, -26.0000],
  "Antarctica": [0.0000, -90.0000],
};

// Function to find the best match for a location
function findBestLocationMatch(searchLocation: string): string | null {
  // Exact match
  if (locationCoordinates[searchLocation]) {
    return searchLocation;
  }
  
  // Case-insensitive match
  const locations = Object.keys(locationCoordinates);
  const lowerSearchLocation = searchLocation.toLowerCase();
  
  for (const location of locations) {
    if (location.toLowerCase() === lowerSearchLocation) {
      return location;
    }
  }
  
  // Partial match (if location contains the search term)
  for (const location of locations) {
    if (location.toLowerCase().includes(lowerSearchLocation) || 
        lowerSearchLocation.includes(location.toLowerCase())) {
      return location;
    }
  }
  
  return null;
}

// Function to determine which continental region a location might be in
function determineContinent(location: string): string {
  const lowerLocation = location.toLowerCase();
  
  if (/europe|france|germany|italy|spain|uk|england|britain|portugal|greece|netherlands|belgium|switzerland|austria|poland|ukraine|russia/i.test(lowerLocation)) {
    return "Europe";
  }
  if (/asia|china|japan|india|korea|thailand|vietnam|philippines|indonesia|malaysia|singapore|pakistan|bangladesh/i.test(lowerLocation)) {
    return "Asia";
  }
  if (/africa|egypt|nigeria|kenya|south africa|morocco|algeria|tunisia|ghana|ethiopia|somalia|sudan/i.test(lowerLocation)) {
    return "Africa";
  }
  if (/north america|united states|usa|u\.s\.|canada|mexico/i.test(lowerLocation)) {
    return "North America";
  }
  if (/south america|brazil|argentina|chile|peru|colombia|venezuela|ecuador|bolivia/i.test(lowerLocation)) {
    return "South America";
  }
  if (/australia|new zealand|pacific|oceania/i.test(lowerLocation)) {
    return "Australia";
  }
  
  return "Europe"; // Default fallback
}

// Function to get coordinates for a country
export async function getCountryCoordinates(location: string): Promise<{ latitude: number; longitude: number }> {
  // Try to find the best match for the location
  const bestMatch = findBestLocationMatch(location);
  
  if (bestMatch && locationCoordinates[bestMatch]) {
    console.log(`Found coordinates for ${location} -> ${bestMatch}`);
    const [longitude, latitude] = locationCoordinates[bestMatch];
    return { latitude, longitude };
  }
  
  // If no direct match, try to determine the continent and use that
  const continent = determineContinent(location);
  if (continentalFallbacks[continent]) {
    console.log(`Using continental fallback for ${location} -> ${continent}`);
    const [longitude, latitude] = continentalFallbacks[continent];
    return { latitude, longitude };
  }
  
  // Last resort fallback - but don't use completely random coordinates
  console.log(`No coordinates found for ${location}, using default Europe coordinates`);
  const [longitude, latitude] = continentalFallbacks["Europe"];
  return { latitude, longitude };
}

// Function to get the center coordinates of a country
export async function getCountryCenterCoordinates(country: string): Promise<{latitude: number, longitude: number}> {
  // Map of common country names to their center coordinates
  const countryCenters: Record<string, [number, number]> = {
    // Format: [longitude, latitude]
    'United States': [-95.7129, 37.0902],
    'US': [-95.7129, 37.0902],
    'USA': [-95.7129, 37.0902],
    'United Kingdom': [-3.4360, 55.3781],
    'UK': [-3.4360, 55.3781],
    'Russia': [105.3188, 61.5240],
    'China': [104.1954, 35.8617],
    'India': [78.9629, 20.5937],
    'Japan': [138.2529, 36.2048],
    'Germany': [10.4515, 51.1657],
    'France': [2.2137, 46.2276],
    'Brazil': [-51.9253, -14.2350],
    'Canada': [-106.3468, 56.1304],
    'Australia': [133.7751, -25.2744],
    'Italy': [12.5674, 41.8719],
    'Spain': [-3.7492, 40.4637],
    'Mexico': [-102.5528, 23.6345],
    'Indonesia': [113.9213, -0.7893],
    'South Korea': [127.7669, 35.9078],
    'Turkey': [35.2433, 38.9637],
    'Israel': [34.8516, 31.0461],
    'Ukraine': [31.1656, 48.3794],
    'South Africa': [22.9375, -30.5595],
    'Egypt': [30.8025, 26.8206],
    'Pakistan': [69.3451, 30.3753],
    'Iran': [53.6880, 32.4279],
    'Saudi Arabia': [45.0792, 23.8859],
    // Add more countries as needed
  };
  
  // If we have pre-defined coordinates, use them
  if (countryCenters[country]) {
    const [longitude, latitude] = countryCenters[country];
    return { latitude, longitude };
  }
  
  // Otherwise, fall back to the geocoding API
  try {
    const coordinates = await getCountryCoordinates(country);
    return coordinates;
  } catch (error) {
    console.error(`Failed to get center coordinates for ${country}:`, error);
    
    // Default to a reasonable position if all else fails
    return { latitude: 0, longitude: 0 };
  }
} 