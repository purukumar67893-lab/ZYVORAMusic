import { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface ArtworkProps {
  src?: string;
  alt: string;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Artwork({ src, alt, className = 'w-12 h-12', rounded = 'md' }: ArtworkProps) {
  const [failed, setFailed] = useState(false);

  const radiusClass =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === 'lg'
        ? 'rounded-xl'
        : rounded === 'md'
          ? 'rounded-lg'
          : 'rounded';

  if (!src || failed) {
    return (
      <div
        className={`${className} ${radiusClass} bg-[#1C1C22] border border-white/[0.08] flex items-center justify-center shrink-0 select-none overflow-hidden`}
        aria-label={alt}
      >
        <Disc3 className="w-1/2 h-1/2 text-zinc-500" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} ${radiusClass} object-cover bg-[#18181D] shrink-0 select-none`}
    />
  );
}
