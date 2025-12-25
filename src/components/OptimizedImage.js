'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * Optimized image component with fallback
 * Uses Next.js Image component for automatic optimization
 */
export default function OptimizedImage({
  src,
  alt = '',
  width,
  height,
  className = '',
  fill = false,
  priority = false,
  objectFit = 'cover',
  fallbackSrc = '/placeholder-book.png',
  ...props
}) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (fill) {
    return (
      <div className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-white/5 animate-pulse rounded" />
        )}
        <Image
          src={imgSrc}
          alt={alt}
          fill
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${props.className || ''}`}
          style={{ objectFit }}
          priority={priority}
          onError={handleError}
          onLoad={handleLoad}
          {...props}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-white/5 animate-pulse rounded" />
      )}
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${props.className || ''}`}
        style={{ objectFit }}
        priority={priority}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </div>
  );
}

