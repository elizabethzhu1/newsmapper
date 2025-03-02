import { NewsItem } from '@/types';
import { getCountryCoordinates } from './geocode';

// Define NY Times API response types for direct API access
interface NYTimesTopStoryArticle {
  uri: string;
  title: string;
  abstract: string;
  url: string;
  published_date: string;
  geo_facet: string[];
  // Add other properties as needed
}

// Enhanced direct function to fetch from NY Times API with better location handling
export async function fetchTopHeadlines(): Promise<NewsItem[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NYTIMES_API_KEY;
    
    if (!apiKey) {
      console.error('NYTimes API key not found');
      return [];
    }
    
    console.log('Fetching from NYTimes Top Stories API...');
    const response = await fetch(
      `https://api.nytimes.com/svc/topstories/v2/world.json?api-key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) {
      throw new Error(`NYTimes API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Received ${data.results?.length || 0} articles from NYTimes API`);
    
    if (!data.results || data.results.length === 0) {
      console.warn('No results returned from NYTimes API');
      return [];
    }
    
    // Country aliases standardization
    const countryAliases: Record<string, string> = {
      'U.S.': 'United States',
      'United States': 'United States',
      'America': 'United States',
      'U.K.': 'United Kingdom',
      'Britain': 'United Kingdom',
      'England': 'United Kingdom',
      // Add more aliases as needed
    };
    
    // Process and map the data with improved location handling
    const newsItems = await Promise.all(
      data.results
        .filter((article: NYTimesTopStoryArticle) => article.geo_facet && article.geo_facet.length > 0)
        .slice(0, 50)
        .map(async (article: NYTimesTopStoryArticle) => {
          // NYTimes sometimes has multiple geo_facets, try to select the most specific country
          let selectedLocation = '';
          
          // First, look for a country name in geo_facet
          for (const location of article.geo_facet) {
            // Standardize country names using aliases
            const standardLocation = countryAliases[location] || location;
            
            // Log the location being processed for debugging
            console.log(`Considering location: ${location} (standardized: ${standardLocation})`);
            
            // Prefer country names over city names when available
            if (!selectedLocation || 
                (selectedLocation.includes(' ') && !standardLocation.includes(' '))) {
              selectedLocation = standardLocation;
            }
          }
          
          // If no location found, use the first one
          if (!selectedLocation && article.geo_facet.length > 0) {
            selectedLocation = article.geo_facet[0];
          }
          
          console.log(`Final selected location for article: ${selectedLocation}`);
          
          if (!selectedLocation) {
            console.log(`No location found for NYTimes article: ${article.title}`);
            return null;
          }
          
          try {
            console.log(`Getting coordinates for location: ${selectedLocation}`);
            const coordinates = await getCountryCoordinates(selectedLocation);
            
            return {
              id: article.uri,
              title: article.title,
              abstract: article.abstract,
              url: article.url,
              publishedDate: article.published_date,
              location: selectedLocation,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              source: 'The New York Times'
            };
          } catch (error) {
            console.error(`Error getting coordinates for ${selectedLocation}:`, error);
            return null;
          }
        })
    );
    
    // Filter out null items
    const validItems = newsItems.filter(item => item !== null) as NewsItem[];
    console.log(`Returning ${validItems.length} valid NYTimes articles with locations`);
    return validItems;
  } catch (error) {
    console.error('Error fetching NYTimes headlines:', error);
    return [];
  }
} 