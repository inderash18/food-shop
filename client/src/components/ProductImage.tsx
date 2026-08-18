import { useState } from 'react';

const defaultFallbacks: Record<string, string> = {
  beverage: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=500&q=60',
  fastfood: 'https://images.unsplash.com/photo-1626229652216-e5bb7f511917?auto=format&fit=crop&w=500&q=60',
  dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=500&q=60',
  indian: 'https://images.unsplash.com/photo-1589302168068-964664d93cb0?auto=format&fit=crop&w=500&q=60',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60'
};

function getFallbackImage(categoryName: string = ''): string {
  const normalizedCategory = categoryName.toLowerCase();
  if (normalizedCategory.includes('drink') || normalizedCategory.includes('beverage') || normalizedCategory.includes('tea') || normalizedCategory.includes('coffee')) return defaultFallbacks.beverage;
  if (normalizedCategory.includes('fast') || normalizedCategory.includes('snack')) return defaultFallbacks.fastfood;
  if (normalizedCategory.includes('dessert') || normalizedCategory.includes('sweet')) return defaultFallbacks.dessert;
  if (normalizedCategory.includes('meal') || normalizedCategory.includes('indian')) return defaultFallbacks.indian;
  return defaultFallbacks.default;
}

interface ProductImageProps {
  src?: string;
  alt: string;
  categoryName?: string;
  className?: string;
}

export function ProductImage({ src, alt, categoryName, className = '' }: ProductImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fallbackSrc = getFallbackImage(categoryName);
  const finalSrc = !src || error ? fallbackSrc : src;

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}
      <img
        src={finalSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!error) setError(true);
          setLoaded(true);
        }}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105 transition-transform duration-500`}
      />
    </div>
  );
}
