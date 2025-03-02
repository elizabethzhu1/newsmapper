import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '@/types';

interface NewsHeadlineProps {
  news: NewsItem & { clusterArticles?: NewsItem[] };
  onClose: () => void;
  position: { x: number, y: number };
}

const NewsHeadline: React.FC<NewsHeadlineProps> = ({ news, onClose, position }) => {
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Check if this is a cluster
  const isCluster = news.clusterArticles && news.clusterArticles.length > 0;

  // If a specific article is selected from the cluster, show that
  const articleToDisplay = selectedArticle || news;
  
  const handleArticleSelect = (article: NewsItem) => {
    setSelectedArticle(article);
  };

  // Calculate optimal position for the popup when it renders
  useEffect(() => {
    if (popupRef.current && position) {
      const popup = popupRef.current;
      const popupRect = popup.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Start with marker position
      let x = position.x;
      let y = position.y;
      
      // Adjust position to ensure popup stays in viewport
      // If popup would go off the right edge, position it to the left of the marker
      if (x + popupRect.width + 20 > windowWidth) {
        x = x - popupRect.width - 20; // 20px offset from marker
      } else {
        x = x + 20; // Default position to the right of marker
      }
      
      // If popup would go off the bottom, position it above the marker
      if (y + popupRect.height > windowHeight) {
        y = windowHeight - popupRect.height - 20;
      }
      
      // If popup would go off the top, position it below
      if (y < 0) {
        y = 20;
      }
      
      setPopupPos({ x, y });
    }
  }, [position]);

  return (
    <div 
      ref={popupRef}
      className="absolute bg-gray-800 text-white shadow-lg rounded-lg p-4 border border-gray-700"
      style={{ 
        left: `${popupPos.x}px`, 
        top: `${popupPos.y}px`,
        maxHeight: '80vh',
        overflow: 'auto',
        width: '400px'
      }}
    >
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl"
      >
        ×
      </button>
      
      {isCluster && !selectedArticle && (
        <>
          <h2 className="text-xl font-bold mb-3">{news.title}</h2>
          <p className="text-gray-300 mb-3">{news.abstract}</p>
          
          <div className="max-h-64 overflow-y-auto">
            <h3 className="font-semibold text-sm mb-2 text-gray-400">Articles about {news.location}:</h3>
            <ul className="space-y-2">
              {news.clusterArticles?.map((article, index) => (
                <li 
                  key={index}
                  className="border border-gray-700 rounded p-2 hover:bg-gray-700 cursor-pointer transition"
                  onClick={() => handleArticleSelect(article)}
                >
                  <div className="flex items-center mb-1">
                    <span 
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ 
                        backgroundColor: article.source === 'The Guardian' ? '#005689' : '#ff4444'
                      }}
                    ></span>
                    <span className="text-xs text-gray-400">{article.source}</span>
                  </div>
                  <h4 className="font-semibold">{article.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(article.publishedDate).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      
      {(!isCluster || selectedArticle) && (
        <>
          {isCluster && (
            <button 
              onClick={() => setSelectedArticle(null)}
              className="mb-3 text-sm flex items-center text-gray-400 hover:text-white"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to all articles
            </button>
          )}
          
          <h2 className="text-xl font-bold mb-2">{articleToDisplay.title}</h2>
          <p className="text-gray-300 mb-2">{articleToDisplay.abstract}</p>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              <span>{articleToDisplay.location} • {new Date(articleToDisplay.publishedDate).toLocaleDateString()}</span>
              {articleToDisplay.source && (
                <span className="ml-2 px-2 py-1 bg-gray-700 rounded-full text-xs">
                  {articleToDisplay.source}
                </span>
              )}
            </div>
            <a 
              href={articleToDisplay.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Read More
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export default NewsHeadline; 