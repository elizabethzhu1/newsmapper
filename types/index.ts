export interface NewsItem {
  id: string;
  title: string;
  abstract: string;
  url: string;
  publishedDate: string;
  location: string;
  latitude: number;
  longitude: number;
  source?: string;
} 