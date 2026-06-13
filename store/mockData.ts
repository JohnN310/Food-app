export type Deal = {
  id: number;
  title: string;
  category: string;
  rating: string;
  store: string;
  price: string;
  oldPrice: string;
  discount: string;
  distance: string;
  time: string;
  badges: { text: string; type: 'green' | 'red' }[];
  description?: string;
  quantity?: number;
};

export const MOCK_DEALS: Deal[] = [];

export const CATEGORIES = [
  { label: 'All', icon: '🌟' },
  { label: 'Bakery', icon: '🍞' },
  { label: 'Produce', icon: '🥬' },
  { label: 'Fruits', icon: '🍎' },
  { label: 'Meals', icon: '🍱' },
  { label: 'Dairy', icon: '🧀' },
];
