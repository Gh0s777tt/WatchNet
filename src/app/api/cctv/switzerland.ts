import type { CctvCamera } from './types';

const SWITZERLAND_CAMERAS: CctvCamera[] = [
  {
    id: 'ch-lausanne-chuv-heliport',
    lat: 46.5250, lng: 6.6420,
    name: 'CHUV Heliport Webcam — Lausanne',
    city: 'Lausanne',
    country: 'Switzerland',
    external_url: 'https://wc-heli.chuv.ch/view/view.shtml',
    source: 'CHUV',
  },
  {
    id: 'ch-zurich-bahnhofstrasse',
    lat: 47.3769, lng: 8.5383,
    name: 'Zurich — Bahnhofstrasse',
    city: 'Zurich',
    country: 'Switzerland',
    stream_url: 'https://www.youtube.com/embed/_kz7YMjCbYI?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'ch-geneva-lac',
    lat: 46.2044, lng: 6.1432,
    name: 'Geneva — Lake Geneva Jet d\'Eau',
    city: 'Geneva',
    country: 'Switzerland',
    stream_url: 'https://www.youtube.com/embed/CEEiVx9m7U8?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'ch-interlaken-jungfrau',
    lat: 46.6863, lng: 7.8632,
    name: 'Interlaken — Jungfrau Panorama',
    city: 'Interlaken',
    country: 'Switzerland',
    stream_url: 'https://www.youtube.com/embed/3YqFfF4e0rY?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'ch-zermatt-matterhorn',
    lat: 46.0207, lng: 7.7491,
    name: 'Zermatt — Matterhorn Live',
    city: 'Zermatt',
    country: 'Switzerland',
    stream_url: 'https://www.youtube.com/embed/_Xr0hTtaDJM?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
];

export async function fetchSwitzerlandCameras(): Promise<CctvCamera[]> {
  return SWITZERLAND_CAMERAS;
}
