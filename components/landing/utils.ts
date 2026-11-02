import type { LiveListing } from './types';

export function firstMediaUrl(galleryUrls?: string, logoUrl?: string): string | null {
  const gallery = galleryUrls
    ?.split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (gallery && gallery.length > 0) return gallery[0];
  return logoUrl || null;
}

export function categoryIconClass(name: string, icon?: string): string {
  if (icon) {
    if (icon.includes('fa-')) return icon.startsWith('fa-') ? `fa-solid ${icon}` : icon;
    return `fa-solid ${icon}`;
  }
  const lower = name.toLowerCase();
  if (lower.includes('health') || lower.includes('medical') || lower.includes('dentist'))
    return 'fa-solid fa-heart-pulse';
  if (lower.includes('beauty') || lower.includes('spa') || lower.includes('wellness'))
    return 'fa-solid fa-spa';
  if (lower.includes('fitness') || lower.includes('yoga') || lower.includes('gym'))
    return 'fa-solid fa-dumbbell';
  if (lower.includes('salon') || lower.includes('hair') || lower.includes('barber'))
    return 'fa-solid fa-scissors';
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('vet')) return 'fa-solid fa-paw';
  if (lower.includes('home') || lower.includes('service') || lower.includes('repair'))
    return 'fa-solid fa-wrench';
  return 'fa-solid fa-shapes';
}

export function listingHref(listing: LiveListing) {
  if (listing.slug) return `/b/${encodeURIComponent(listing.slug)}`;
  return `/profile/business/${listing.businessId}`;
}
