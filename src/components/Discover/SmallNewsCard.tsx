import { Discover } from '@/app/discover/page';
import Link from 'next/link';

const SmallNewsCard = ({ item }: { item: Discover }) => {
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

  return (
    <Link
      href={`/?q=Summary: ${item.url}`}
      className="rounded-3xl overflow-hidden bg-light-secondary dark:bg-dark-secondary shadow-sm shadow-light-200/10 dark:shadow-black/25 group flex flex-col"
      target="_blank"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          src={thumbnailSrc}
          alt={item.title}
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
