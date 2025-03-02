'use client';

import { useState, useEffect } from 'react';
import NewsMap from '@/components/NewsMap';
import NewsHeadline from '@/components/NewsHeadline';
import { NewsItem } from '@/types';

export default function Home() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    const getHeadlines = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/all-headlines');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Headlines loaded:', data.newsItems.length);
        setNewsItems(data.newsItems);
      } catch (err) {
        setError('Failed to fetch headlines. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    getHeadlines();
  }, []);

  const handleMarkerClick = (news: NewsItem, position: {x: number, y: number}) => {
    setSelectedNews(news);
    setMarkerPosition(position);
  };

  const closeHeadline = () => {
    setSelectedNews(null);
    setMarkerPosition(null);
  };

  return (
    <main className="flex flex-col h-screen bg-black text-white">
      <header className="p-4 bg-black text-white">
        <h1 className="text-6xl font-bold text-center mt-8 mb-2">NewsMapper</h1>
        <p className="text-lg text-center">Visualize top headlines from around the world.</p>
      </header>

      <div className="flex-grow relative overflow-hidden bg-black mb-10">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-600">
            {error}
          </div>
        ) : (
          <NewsMap newsItems={newsItems} onMarkerClick={handleMarkerClick} />
        )}

        {selectedNews && markerPosition && (
          <NewsHeadline news={selectedNews} onClose={closeHeadline} position={markerPosition} />
        )}
      </div>
    </main>
  );
}
