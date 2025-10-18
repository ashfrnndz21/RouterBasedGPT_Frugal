import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FrugalAIGpt - AI-Powered Search & Chat',
    short_name: 'FrugalAIGpt',
    description:
      'FrugalAIGpt is an intelligent AI assistant that searches the web and provides accurate, real-time answers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#FF3366',
    screenshots: [
      {
        src: '/screenshots/p1.png',
        form_factor: 'wide',
        sizes: '2560x1600',
      },
      {
        src: '/screenshots/p2.png',
        form_factor: 'wide',
        sizes: '2560x1600',
      },
      {
        src: '/screenshots/p1_small.png',
        form_factor: 'narrow',
        sizes: '828x1792',
      },
      {
        src: '/screenshots/p2_small.png',
        form_factor: 'narrow',
        sizes: '828x1792',
      },
    ],
    icons: [
      {
        src: '/icon-50.png',
        sizes: '50x50',
        type: 'image/png' as const,
      },
      {
        src: '/icon-100.png',
        sizes: '100x100',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '440x440',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
