import { Discover } from '@/app/discover/page';
import Link from 'next/link';
import { useState } from 'react';

const SmallNewsCard = ({ item }: { item: Discover }) => {
  const [imageError, setImageError] = useState(false);
  
  // Safely handle thumbnail URL
  let thumbnailSrc = item.thumbnail;
  try {
    const url = new URL(item.thumbnail);
    const id = url.searchParams.get('id');
    if (id) {
      thumbnailSrc = url.origin + url.pathname + `?id=${id}`;
    }
  } catch (e) {
    // Use thumbnail as-is if URL parsing fails
  }
  
  // Fallback image if thumbnail fails to load
  const fallbackImage = `https://via.placeholder.com/600x400/1e293b/64748b?text=${encodeURIComponent('AI News')}`;
  const displayImage = imageError ? fallbackImage : thumbnailSrc;

  return (
    <Link
      href={`/?q=Summary: ${item.url}`}
      className="rounded-3xl overflow-hidden bg-light-secondary dark:bg-dark-secondary shadow-sm shadow-light-200/10 dark:shadow-black/25 group flex flex-col"
      target="_blank"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-500/10 to-cyan-500/10">
        <img
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          src={displayImage}
          alt={item.title}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2 leading-tight line-clamp-2 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition duration-200">
          {item.title}
        </h3>
        <p className="text-black/60 dark:text-white/60 text-xs leading-relaxed line-clamp-2">
          {item.content}
        </p>
      </div>
    </Link>
  );
};

export default SmallNewsCard;
