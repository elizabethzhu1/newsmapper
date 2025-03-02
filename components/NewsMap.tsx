'use client';

import { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { NewsItem } from '@/types';
import { getCountryCenterCoordinates } from '@/services/geocode';

// Use a different TopoJSON source that's more reliable
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// List of common country names for detecting country-level locations
const COUNTRY_NAMES = [
  'United States', 'US', 'USA', 'China', 'Russia', 'India', 'Brazil', 
  'United Kingdom', 'UK', 'France', 'Germany', 'Japan', 'Canada', 'Italy', 
  'Spain', 'Australia', 'South Korea', 'Mexico', 'Indonesia', 'Netherlands',
  'Saudi Arabia', 'Turkey', 'Switzerland', 'Israel', 'Poland', 'Sweden',
  'Belgium', 'Norway', 'Austria', 'Ukraine', 'South Africa', 'Egypt',
  'Denmark', 'Singapore', 'Hong Kong', 'Finland', 'Ireland', 'Portugal',
  'Greece', 'New Zealand', 'Czech Republic', 'Romania', 'Chile', 'Peru',
  'Pakistan', 'Vietnam', 'Bangladesh', 'Nigeria', 'Kenya', 'Ghana'
];

interface NewsMapProps {
  newsItems: NewsItem[];
  onMarkerClick: (news: NewsItem, markerPosition: {x: number, y: number}) => void;
}

type SourceFilter = {
  'The New York Times': boolean;
  'The Guardian': boolean;
};

const NewsMap: React.FC<NewsMapProps> = ({ newsItems, onMarkerClick }) => {
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>({
    'The New York Times': true,
    'The Guardian': true
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  const [countryCenters, setCountryCenters] = useState<Record<string, [number, number]>>({});
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    // Check if the map data loads
    fetch(geoUrl)
      .then(response => {
        if (response.ok) {
          console.log("Map data loaded successfully");
          setIsMapLoaded(true);
        } else {
          console.error("Failed to load map data");
        }
      })
      .catch(error => console.error("Error loading map:", error));
      
    // Update clustering based on zoom level
    if (position.zoom >= 2.5) {
      setShowClusters(false);
    } else {
      setShowClusters(true);
    }
  }, [position.zoom]);

  // Pre-load country centers when component mounts
  useEffect(() => {
    const loadCountryCenters = async () => {
      const centers: Record<string, [number, number]> = {};
      for (const country of COUNTRY_NAMES) {
        try {
          const coords = await getCountryCenterCoordinates(country);
          centers[country] = [coords.longitude, coords.latitude];
        } catch (error) {
          console.warn(`Could not get center for ${country}:`, error);
        }
      }
      setCountryCenters(centers);
    };
    
    loadCountryCenters();
  }, []);

  // Helper function to determine if a location is just a country name
  const isCountryLevelLocation = (location: string): boolean => {
    return COUNTRY_NAMES.includes(location) || 
           COUNTRY_NAMES.some(country => location === country);
  };

  // Filter news items based on selected sources
  const filteredNewsItems = useMemo(() => {
    return newsItems.filter(item => {
      return item.source && sourceFilter[item.source as keyof SourceFilter];
    });
  }, [newsItems, sourceFilter]);

  // Process and position news items on the map
  const processedNewsItems = useMemo(() => {
    // Add location specificity and adjust coordinates
    const processedItems = filteredNewsItems.map(item => {
      const isCountryLevel = isCountryLevelLocation(item.location);
      
      // Use center coordinates for country-level locations if available
      let longitude = item.longitude;
      let latitude = item.latitude;
      
      if (isCountryLevel && countryCenters[item.location]) {
        [longitude, latitude] = countryCenters[item.location];
      }
      
      return {
        ...item,
        longitude,
        latitude,
        isCountryLevel
      };
    });
    
    // Group by country first
    const countryGroups: Record<string, any[]> = {};
    
    processedItems.forEach(item => {
      if (!countryGroups[item.location]) {
        countryGroups[item.location] = [];
      }
      countryGroups[item.location].push(item);
    });
    
    // If we're showing clusters, return country clusters
    if (showClusters) {
      return Object.entries(countryGroups).map(([location, articles]) => {
        // Use the first article's coordinates as the cluster position
        const baseArticle = articles[0];
        return {
          location,
          latitude: baseArticle.latitude,
          longitude: baseArticle.longitude,
          count: articles.length,
          articles,
          isCluster: true,
          isCountryLevel: baseArticle.isCountryLevel
        };
      });
    }
    
    // If we're showing individual pins, calculate offsets for pins in the same location
    const locationGroups: Record<string, any[]> = {};
    
    processedItems.forEach(item => {
      const locationKey = `${item.latitude.toFixed(3)},${item.longitude.toFixed(3)}`;
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = [];
      }
      locationGroups[locationKey].push(item);
    });
    
    // Add offset to articles in the same location
    const results: Array<any> = [];
    
    Object.values(locationGroups).forEach(group => {
      if (group.length === 1) {
        // No offset needed for single items
        results.push({
          ...group[0],
          offsetLat: 0,
          offsetLng: 0,
          isCluster: false
        });
      } else {
        // Calculate offsets in a circle pattern
        // Use larger offset for country-level locations to differentiate them better
        const baseOffsetAmount = 0.7 / (position.zoom || 1);
        const isCountryLevel = group[0].isCountryLevel;
        const offsetAmount = isCountryLevel ? baseOffsetAmount * 1.5 : baseOffsetAmount;
        
        group.forEach((item, index) => {
          // Place items in a circular pattern around the actual point
          const angle = (index * (2 * Math.PI / group.length));
          const offsetLng = Math.cos(angle) * offsetAmount;
          const offsetLat = Math.sin(angle) * offsetAmount;
          
          results.push({
            ...item,
            offsetLat,
            offsetLng,
            isCluster: false
          });
        });
      }
    });
    
    return results;
  }, [filteredNewsItems, showClusters, position.zoom, countryCenters]);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleMoveEnd = (position: any) => {
    setPosition(position);
  };

  const toggleSource = (source: keyof SourceFilter) => {
    setSourceFilter(prev => ({
      ...prev,
      [source]: !prev[source]
    }));
  };
  
  // Handle cluster click - show all articles from the cluster
  const handleClusterClick = (cluster: any, markerPosition: {x: number, y: number}) => {
    // If there's only one article, treat it normally
    if (cluster.articles.length === 1) {
      onMarkerClick(cluster.articles[0], markerPosition);
      return;
    }
    
    // Create a special article with all the cluster info
    const clusterInfo = {
      id: `cluster-${cluster.location}`,
      title: `${cluster.articles.length} articles about ${cluster.location}`,
      abstract: `This cluster contains ${cluster.articles.length} news items about ${cluster.location} from different sources.`,
      url: '',
      publishedDate: '',
      location: cluster.location,
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      source: 'Multiple Sources',
      clusterArticles: cluster.articles
    };
    
    onMarkerClick(clusterInfo as any, markerPosition);
  };

  console.log('NewsMap rendering with', filteredNewsItems.length, 'filtered items');

  return (
    <div className="flex justify-center items-start h-[calc(100vh-4rem)] py-4">
      <div className="relative w-11/12 md:w-10/12 h-[calc(100vh-8rem)] bg-black rounded-lg border border-gray-700 overflow-hidden">
        {/* Source Filter Menu Button */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            className="bg-gray-800 text-white px-3 py-2 rounded-lg flex items-center shadow-md hover:bg-gray-700"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
          >
            <span className="mr-2">Filter</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </button>
          
          {showFilterMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3">
              <h3 className="text-white text-sm font-medium mb-2">News Sources</h3>
              <div className="space-y-2">
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={sourceFilter['The New York Times']}
                    onChange={() => toggleSource('The New York Times')}
                    className="mr-2"
                  />
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full inline-block mr-2"></span>
                    The New York Times
                  </span>
                </label>
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={sourceFilter['The Guardian']}
                    onChange={() => toggleSource('The Guardian')}
                    className="mr-2"
                  />
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-blue-700 rounded-full inline-block mr-2"></span>
                    The Guardian
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
        
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            Loading map data...
          </div>
        )}
        
        <div ref={setMapRef} className="w-full h-full">
          <ComposableMap
            projection="geoMercator"
            style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
            projectionConfig={{ scale: 120 }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates as [number, number]}
              onMoveEnd={handleMoveEnd}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) => {
                  console.log(`Rendering ${geographies.length} geographies`);
                  return geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#444444"
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: "#666666", outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ));
                }}
              </Geographies>
              
              {processedNewsItems.map((news, index) => {
                // Use consistent marker sizes regardless of cluster status
                const outerRadius = 10; // Fixed outer radius (larger)
                const innerRadius = 7; // Fixed inner radius (larger)
                  
                // Determine marker coordinates
                const coords = news.isCluster ? 
                  [news.longitude, news.latitude] : 
                  [news.longitude + (news.offsetLng || 0), news.latitude + (news.offsetLat || 0)];
                  
                // Determine colors
                let fill = "#ff4444"; // Default NY Times red
                
                if (news.isCluster) {
                  // For clusters with mixed sources, use purple
                  const hasNYT = news.articles.some((a: NewsItem) => a.source === 'The New York Times');
                  const hasGuardian = news.articles.some((a: NewsItem) => a.source === 'The Guardian');
                  
                  if (hasNYT && hasGuardian) {
                    fill = "#8a2be2"; // Purple for mixed sources
                  } else if (hasGuardian) {
                    fill = "#005689"; // Guardian blue
                  }
                } else {
                  // For individual pins
                  fill = news.source === 'The Guardian' ? '#005689' : '#ff4444';
                }
                
                return (
                  <Marker 
                    key={index} 
                    coordinates={coords as [number, number]}
                    onClick={(event) => {
                      // Get the mouse position for popup placement
                      const bounds = mapRef?.getBoundingClientRect();
                      if (bounds) {
                        const x = event.clientX - bounds.left;
                        const y = event.clientY - bounds.top;
                        news.isCluster ? 
                          handleClusterClick(news, {x, y}) : 
                          onMarkerClick(news, {x, y});
                      } else {
                        news.isCluster ? 
                          handleClusterClick(news, {x: 0, y: 0}) : 
                          onMarkerClick(news, {x: 0, y: 0});
                      }
                    }}
                  >
                    <circle
                      r={outerRadius}
                      fill="rgba(255, 255, 255, 0.3)"
                      stroke="#fff"
                      strokeWidth={0.5}
                    />
                    <circle
                      r={innerRadius}
                      fill={fill}
                      stroke="#fff"
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                    />
                    {news.isCluster && news.count > 1 && (
                      <text
                        textAnchor="middle"
                        y={1}
                        style={{
                          fontFamily: "Arial",
                          fontSize: 8,
                          fill: "#fff",
                          fontWeight: "bold",
                          pointerEvents: "none"
                        }}
                      >
                        {news.count}
                      </text>
                    )}
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>
        
        {/* Info text about zooming */}
        <div className="absolute bottom-20 left-4 text-white text-sm bg-gray-800 bg-opacity-70 p-2 rounded">
          {showClusters ? 
            "Zoom in to see individual articles" : 
            "Zoom out to see clustered articles"}
        </div>
        
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            className="bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-md"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 7V3H9V7H13V9H9V13H7V9H3V7H7Z" fill="black"/>
              <circle cx="8" cy="8" r="7" stroke="black" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
          <button
            className="bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-md"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7H13V9H3V7Z" fill="black"/>
              <circle cx="8" cy="8" r="7" stroke="black" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsMap; 