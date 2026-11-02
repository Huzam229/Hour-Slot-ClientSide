'use client';

import Image from 'next/image';

export type BrandLogoVariant = 'color' | 'white';
export type BrandLogoKind = 'wordmark' | 'mark';

type Props = {
  /** color = navy on transparent (light surfaces). white = knockout for dark/colored surfaces. */
  variant?: BrandLogoVariant;
  /** wordmark = compact calendar + Duemet (no tagline). mark = D monogram. */
  kind?: BrandLogoKind;
  height?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

/**
 * Compact wordmark (tagline cropped, padded so bottoms aren't clipped).
 * Full marketing lockup remains available as /duemet-logo.png if needed later.
 */
const ASPECT: Record<BrandLogoKind, number> = {
  wordmark: 878 / 271,
  mark: 566 / 593,
};

const SRC: Record<BrandLogoKind, Record<BrandLogoVariant, string>> = {
  wordmark: {
    color: '/duemet-logo-nav.png',
    white: '/duemet-logo-nav-white.png',
  },
  mark: {
    color: '/duemet-mark.png',
    white: '/duemet-mark-white.png',
  },
};

/** Default header size — compact enough for nav / explore chrome. */
const DEFAULT_HEIGHT = 28;

export default function BrandLogo({
  variant = 'color',
  kind = 'wordmark',
  height = DEFAULT_HEIGHT,
  className,
  priority = false,
  alt = 'Duemet',
}: Props) {
  const src = SRC[kind][variant];
  const renderedHeight = Math.max(1, Math.round(height));
  const width = Math.round(renderedHeight * ASPECT[kind]);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={renderedHeight}
      priority={priority}
      className={className}
      style={{ height: renderedHeight, width: 'auto', objectFit: 'contain', objectPosition: 'left center', display: 'block' }}
    />
  );
}

/** Plain <img> for layouts that avoid next/image. */
export function BrandLogoImg({
  variant = 'color',
  kind = 'wordmark',
  height = DEFAULT_HEIGHT,
  className,
  alt = 'Duemet',
}: Omit<Props, 'priority'>) {
  const src = SRC[kind][variant];
  const renderedHeight = Math.max(1, Math.round(height));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ height: renderedHeight, width: 'auto', objectFit: 'contain', objectPosition: 'left center', display: 'block' }}
    />
  );
}
