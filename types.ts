export type ItemStatus = 'to-buy' | 'in-stock' | 'low';

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  file?: File;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  price: number | null;
  store: string | null;
  status: ItemStatus;
  notes: string;
  media: MediaItem[];
  createdAt: number;
}

export interface GeminiAnalysisResult {
  name: string;
  category: string;
  price: number | null;
  notes: string;
}
