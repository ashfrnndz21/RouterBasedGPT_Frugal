import { Discover } from '@/app/discover/page';
import Link from 'next/link';
import { useState } from 'react';

const MajorNewsCard = ({
  item,
  isLeft = true,
}: {
  item: Discover;
  isLeft?: boolean;
}) => {
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
  const fallbackImage = `https://via.placeholder.com/800x600/1e293b/64748b?text=${encodeURIComponent('AI News')}`;
  const displayImage = imageError ? fallbackImage : thumbnailSrc;

  return (
    <Link
      href={`/?q=Summary: ${item.url}`}
      className="w-full group flex flex-row items-stretch gap-6 h-60 py-3"
      target="_blank"
    >
      {isLeft ? (
        <>
          <div className="relative w-80 h-full overflow-hidden rounded-2xl flex-shrink-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10">
            <img
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              src={displayImage}
              alt={item.title}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
          <div className="flex flex-col justify-center flex-1 py-4">
            <h2
              className="text-3xl font-light mb-3 leading-tight line-clamp-3 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition duration-200"
              style={{ fontFamily: 'PP Editorial, serif' }}
            >
              {item.title}
            </h2>
            <p className="text-black/60 dark:text-white/60 text-base leading-relaxed line-clamp-4">
              {item.content}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col justify-center flex-1 py-4">
            <h2
              className="text-3xl font-light mb-3 leading-tight line-clamp-3 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition duration-200"
              style={{ fontFamily: 'PP Editorial, serif' }}
            >
              {item.title}
            </h2>
            <p className="text-black/60 dark:text-white/60 text-base leading-relaxed line-clamp-4">
              {item.content}
            </p>
          </div>
          <div className="relative w-80 h-full overflow-hidden rounded-2xl flex-shrink-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10">
            <img
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              src={displayImage}
              alt={item.title}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        </>
      )}
    </Link>
  );
};

export default MajorNewsCard;
