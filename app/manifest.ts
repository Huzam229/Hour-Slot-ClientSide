import type { MetadataRoute } from 'next';

/** Web app manifest — lets phones and desktops install Duemet like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Duemet — Smart booking',
    short_name: 'Duemet',
    description: 'Book trusted local services and manage your appointments and jobs.',
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#111827',
    categories: ['business', 'productivity', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'My bookings', url: '/profile/bookings', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Provider dashboard', url: '/provider/dashboard', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
