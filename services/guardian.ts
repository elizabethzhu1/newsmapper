import { NewsItem } from '@/types';
import { getCountryCoordinates } from './geocode';

// Define Guardian API response types
interface GuardianResponse {
  response: {
    status: string;
    total: number;
    results: GuardianArticle[];
  };
}

interface GuardianArticle {
  id: string;
  sectionId: string;
  sectionName: string;
  webPublicationDate: string;
  webTitle: string;
  webUrl: string;
  apiUrl: string;
  tags: Array<{
    id: string;
    type: string;
    webTitle: string;
    sectionId: string;
    sectionName: string;
    references: any[];
  }>;
  isHosted: boolean;
  pillarId: string;
  pillarName: string;
  fields?: {
    headline?: string;
    standfirst?: string;
    trailText?: string;
    byline?: string;
    thumbnail?: string;
  };
}

// Enhanced mapping of country aliases to standardized names
const COUNTRY_ALIASES: Record<string, string> = {
  'US': 'United States',
  'USA': 'United States',
  'America': 'United States',
  'UK': 'United Kingdom',
  'Britain': 'United Kingdom',
  'England': 'United Kingdom',
  'Russia': 'Russia',
  'China': 'China',
  'India': 'India',
  'Japan': 'Japan',
  'Germany': 'Germany',
  'France': 'France',
  'Italy': 'Italy',
  'Spain': 'Spain',
  'Canada': 'Canada',
  'Australia': 'Australia',
  'Brazil': 'Brazil',
  'South Korea': 'South Korea',
  'North Korea': 'North Korea',
  'Pakistan': 'Pakistan',
  'Bangladesh': 'Bangladesh',
  'Iran': 'Iran',
  'Iraq': 'Iraq',
  'Saudi Arabia': 'Saudi Arabia',
  'Israel': 'Israel',
  'Palestine': 'Palestine',
  'Gaza': 'Gaza',
  'Syria': 'Syria',
  'Egypt': 'Egypt',
  'South Africa': 'South Africa',
  'Nigeria': 'Nigeria',
  'Kenya': 'Kenya',
  'Ethiopia': 'Ethiopia',
  'Mexico': 'Mexico',
  'Argentina': 'Argentina',
  'Colombia': 'Colombia',
  'Venezuela': 'Venezuela',
  'Turkey': 'Turkey',
  'Indonesia': 'Indonesia',
  'Malaysia': 'Malaysia',
  'Philippines': 'Philippines',
  'Vietnam': 'Vietnam',
  'Thailand': 'Thailand',
  'Myanmar': 'Myanmar',
  'Burma': 'Myanmar',
  'Afghanistan': 'Afghanistan',
  'Ukraine': 'Ukraine'
};

// Function to extract location from Guardian article with improved accuracy
function extractLocationFromGuardian(article: GuardianArticle): string | null {
  // Check if it's world news
  if (article.sectionName !== 'World news') {
    return null;
  }
  
  // Extract countries from tags first (more reliable)
  const locationTags = article.tags.filter(tag => 
    tag.type === 'keyword' && 
    Object.keys(COUNTRY_ALIASES).some(country => 
      tag.webTitle.includes(country) || country.includes(tag.webTitle)
    )
  );
  
  if (locationTags.length > 0) {
    // Find which country name from our list matches this tag
    for (const tag of locationTags) {
      for (const [alias, standardName] of Object.entries(COUNTRY_ALIASES)) {
        if (tag.webTitle.includes(alias) || alias.includes(tag.webTitle)) {
          console.log(`Found location in tag: ${standardName} (from ${tag.webTitle})`);
          return standardName;
        }
      }
    }
  }
  
  // If no location found in tags, try the title
  for (const [alias, standardName] of Object.entries(COUNTRY_ALIASES)) {
    if (article.webTitle.includes(alias)) {
      console.log(`Found location in title: ${standardName} (from ${article.webTitle})`);
      return standardName;
    }
  }
  
  // Last resort: check if title contains a city or region we can map to a country
  const cityToCountry: Record<string, string> = {
    'Beijing': 'China',
    'Shanghai': 'China',
    'Delhi': 'India',
    'Mumbai': 'India',
    'New York': 'United States',
    'Washington': 'United States',
    'London': 'United Kingdom',
    'Paris': 'France',
    'Berlin': 'Germany',
    'Tokyo': 'Japan',
    'Moscow': 'Russia',
    'Cairo': 'Egypt',
    'Dhaka': 'Bangladesh',
    'Islamabad': 'Pakistan',
    'Kyiv': 'Ukraine',
    'Kabul': 'Afghanistan',
    'Tehran': 'Iran',
    'Baghdad': 'Iraq',
    'Seoul': 'South Korea',
    'Pyongyang': 'North Korea',
    'Bangkok': 'Thailand',
    'Yangon': 'Myanmar',
    'Istanbul': 'Turkey',
    'Tel Aviv': 'Israel',
    'Jerusalem': 'Israel',
    'Gaza City': 'Gaza',
    'Nairobi': 'Kenya',
    'Lagos': 'Nigeria',
    'Johannesburg': 'South Africa'
  };
  
  for (const [city, country] of Object.entries(cityToCountry)) {
    if (article.webTitle.includes(city)) {
      console.log(`Mapped city to country: ${city} -> ${country}`);
      return country;
    }
  }
  
  // We couldn't determine a specific location
  console.log(`No location found for article: ${article.webTitle}`);
  return null;
}

// Function to fetch Guardian headlines with improved location extraction
export async function fetchGuardianHeadlines(): Promise<NewsItem[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GUARDIAN_API_KEY;
    
    if (!apiKey) {
      console.error('Guardian API key not found');
      return [];
    }
    
    const response = await fetch(
      `https://content.guardianapis.com/search?section=world&show-fields=headline,standfirst,trailText&show-tags=keyword&api-key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) {
      throw new Error(`Guardian API error: ${response.status}`);
    }
    
    const data: GuardianResponse = await response.json();
    console.log(`Received ${data.response.results.length} Guardian articles`);
    
    // Process articles with improved location extraction
    const newsItems = await Promise.all(
      data.response.results
        .filter(article => article.sectionName === 'World news')
        .map(async (article) => {
          const location = extractLocationFromGuardian(article);
          
          if (!location) {
            console.log(`Skipping article with no location: ${article.webTitle}`);
            return null; // Skip articles with no location
          }
          
          console.log(`Processing Guardian article location: ${location}`);
          
          try {
            const coordinates = await getCountryCoordinates(location);
            
            return {
              id: `guardian-${article.id}`,
              title: article.webTitle,
              abstract: article.fields?.trailText || article.fields?.standfirst || 'No description available',
              url: article.webUrl,
              publishedDate: article.webPublicationDate,
              location: location,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              source: 'The Guardian'
            };
          } catch (error) {
            console.error(`Error getting coordinates for ${location}:`, error);
            return null;
          }
        })
    );
    
    // Filter out null items (articles with no location or coordinate errors)
    const validItems = newsItems.filter(item => item !== null) as NewsItem[];
    console.log(`Returning ${validItems.length} valid Guardian articles with locations`);
    return validItems;
  } catch (error) {
    console.error('Error fetching Guardian headlines:', error);
    return [];
  }
} 