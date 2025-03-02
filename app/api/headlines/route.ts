import { NextResponse } from 'next/server';
import { getCountryCoordinates } from '@/services/geocode';

// Define the structure for Top Stories API articles
interface NYTimesTopStoryArticle {
  uri: string;
  title: string;
  abstract: string;
  url: string;
  published_date: string;
  geo_facet: string[];
  // Add other properties as needed
}

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NYTIMES_API_KEY;
    
    if (!apiKey) {
      console.error('API key is missing. Check your environment variables.');
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }

    console.log('Attempting to fetch from NYTimes Top Stories API...');
    const response = await fetch(
      `https://api.nytimes.com/svc/topstories/v2/world.json?api-key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`NYTimes API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `API responded with status: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`Received ${data.results?.length || 0} articles from NYTimes API`);
    
    if (!data.results || data.results.length === 0) {
      console.warn('No results returned from NYTimes API');
      return NextResponse.json({ newsItems: [] });
    }
    
    // Process and map the data for Top Stories API
    const newsItems = await Promise.all(
      data.results
        .filter((article: NYTimesTopStoryArticle) => article.geo_facet && article.geo_facet.length > 0)
        .slice(0, 50) // Increased to 50 to show more headlines
        .map(async (article: NYTimesTopStoryArticle) => {
          // Use the first location mentioned
          const location = article.geo_facet[0];
          
          console.log(`Processing article location: ${location}`);
          
          // Get coordinates for the location
          const coordinates = await getCountryCoordinates(location);
          
          return {
            id: article.uri,
            title: article.title,
            abstract: article.abstract,
            url: article.url,
            publishedDate: article.published_date,
            location: location,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          };
        })
    );

    console.log(`Processed ${newsItems.length} news items with locations`);
    return NextResponse.json({ newsItems });
  } catch (error) {
    console.error('Error fetching NYTimes headlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch headlines' },
      { status: 500 }
    );
  }
} 