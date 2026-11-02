'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { ApiCategory, DiscoverBranch, LandingCategory, LiveListing } from './types';
import { categoryIconClass, firstMediaUrl } from './utils';

export function useMarketplace() {
  const [liveListings, setLiveListings] = useState<LiveListing[]>([]);
  const [categories, setCategories] = useState<LandingCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiFetch<DiscoverBranch[]>('/api/discover/search?q=', { skipAuth: true }).catch(() => []),
      apiFetch<ApiCategory[]>('/api/discover/categories', { skipAuth: true }).catch(() => []),
    ])
      .then(([rows, roots]) => {
        if (cancelled) return;

        const seen = new Set<number>();
        const listings: LiveListing[] = [];
        for (const row of rows || []) {
          const businessId = row.business?.id;
          const name = row.business?.name;
          if (!businessId || !name || seen.has(businessId)) continue;
          seen.add(businessId);
          const loc = row.city || row.address || row.name || '';
          listings.push({
            businessId,
            slug: row.business?.slug,
            name,
            category: row.business?.primaryCategory?.name || 'Service',
            categoryId: row.business?.primaryCategory?.id,
            rating: typeof row.business?.rating === 'number' ? row.business.rating : 0,
            location: loc,
            verified: Boolean(row.business?.verified),
            imageUrl: firstMediaUrl(row.business?.galleryUrls, row.business?.logoUrl),
          });
        }
        listings.sort((a, b) => b.rating - a.rating);
        setLiveListings(listings);

        const counts = new Map<number, number>();
        const coverByCategory = new Map<number, string>();
        for (const listing of listings) {
          if (!listing.categoryId) continue;
          counts.set(listing.categoryId, (counts.get(listing.categoryId) || 0) + 1);
          if (listing.imageUrl && !coverByCategory.has(listing.categoryId)) {
            coverByCategory.set(listing.categoryId, listing.imageUrl);
          }
        }

        const flat: LandingCategory[] = [];
        for (const root of roots || []) {
          let childListings = 0;
          for (const child of root.subcategories || []) {
            childListings += counts.get(child.id) || 0;
          }
          const listingCount = (counts.get(root.id) || 0) + childListings;
          flat.push({
            id: root.id,
            name: root.name,
            slug: root.slug,
            icon: categoryIconClass(root.name, root.icon),
            imageUrl: root.imageUrl || coverByCategory.get(root.id) || null,
            listingCount,
          });
        }
        // Prefer categories that have a cover image, then by listing activity.
        flat.sort((a, b) => {
          const img = Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl));
          if (img !== 0) return img;
          return b.listingCount - a.listingCount || a.name.localeCompare(b.name);
        });
        setCategories(flat.slice(0, 8));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredListings = useMemo(() => liveListings.slice(0, 8), [liveListings]);

  return { liveListings, featuredListings, categories, loading };
}
