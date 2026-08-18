export const imageMap: Record<string, string> = {
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=60',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=60',
  dosa: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?auto=format&fit=crop&w=500&q=60',
  idli: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?auto=format&fit=crop&w=500&q=60', // Using Dosa/Idli general south indian plate
  idly: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?auto=format&fit=crop&w=500&q=60',
  pongal: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?auto=format&fit=crop&w=500&q=60',
  biryani: 'https://images.unsplash.com/photo-1589302168068-964664d93cb0?auto=format&fit=crop&w=500&q=60',
  'chicken rice': 'https://images.unsplash.com/photo-1589302168068-964664d93cb0?auto=format&fit=crop&w=500&q=60',
  'veg rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=500&q=60',
  'fried rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=500&q=60',
  samosa: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=60',
  tea: 'https://images.unsplash.com/photo-1576092768241-dec231879bfc?auto=format&fit=crop&w=500&q=60',
  chai: 'https://images.unsplash.com/photo-1576092768241-dec231879bfc?auto=format&fit=crop&w=500&q=60',
  coffee: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=500&q=60',
  juice: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=500&q=60',
  water: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=500&q=60',
  brownie: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=500&q=60',
  meal: 'https://images.unsplash.com/photo-1626779872583-b7891bb08018?auto=format&fit=crop&w=500&q=60',
  thali: 'https://images.unsplash.com/photo-1626779872583-b7891bb08018?auto=format&fit=crop&w=500&q=60',
  combo: 'https://images.unsplash.com/photo-1626779872583-b7891bb08018?auto=format&fit=crop&w=500&q=60'
};

export const defaultFallbacks: Record<string, string> = {
  beverage: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=500&q=60',
  fastfood: 'https://images.unsplash.com/photo-1626229652216-e5bb7f511917?auto=format&fit=crop&w=500&q=60',
  dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=500&q=60',
  indian: 'https://images.unsplash.com/photo-1589302168068-964664d93cb0?auto=format&fit=crop&w=500&q=60',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60'
};

export function getProductImageUrl(name: string, categoryName: string = ''): string {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const normalizedCategory = categoryName.toLowerCase();
  
  // Try exact match or substring match from our known map
  for (const [key, url] of Object.entries(imageMap)) {
    if (normalizedName.includes(key)) {
      return url;
    }
  }

  // Fallback to category based
  if (normalizedCategory.includes('drink') || normalizedCategory.includes('beverage')) {
    return defaultFallbacks.beverage;
  }
  if (normalizedCategory.includes('fast') || normalizedCategory.includes('snack')) {
    return defaultFallbacks.fastfood;
  }
  if (normalizedCategory.includes('dessert') || normalizedCategory.includes('sweet')) {
    return defaultFallbacks.dessert;
  }
  if (normalizedCategory.includes('meal') || normalizedCategory.includes('indian')) {
    return defaultFallbacks.indian;
  }

  return defaultFallbacks.default;
}
