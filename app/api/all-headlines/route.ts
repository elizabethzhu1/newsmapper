import { NextResponse } from 'next/server';
import { fetchTopHeadlines } from '@/services/nytimes';
import { fetchGuardianHeadlines } from '@/services/guardian';

export async function GET() {
  try {
    // Fetch from both sources in parallel
    const [nytimesItems, guardianItems] = await Promise.all([
      fetchTopHeadlines(),
      fetchGuardianHeadlines()
    ]);
    
    // Combine and return all news items
    const allNewsItems = [...nytimesItems, ...guardianItems];
    
    console.log(`Returning combined ${allNewsItems.length} news items from NYTimes and Guardian`);
    return NextResponse.json({ newsItems: allNewsItems });
  } catch (error) {
    console.error('Error fetching combined headlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch headlines' },
      { status: 500 }
    );
  }
} 