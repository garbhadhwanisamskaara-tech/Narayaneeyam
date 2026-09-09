export type AppPlatform = 'WEB' | 'PLAY_TWA';

export function detectPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'WEB';
  const override = new URLSearchParams(window.location.search).get('platform');
  if (override === 'play_twa') return 'PLAY_TWA';
  if (override === 'web') return 'WEB';
  if (document.referrer.startsWith('android-app://')) return 'PLAY_TWA';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'PLAY_TWA';
  return 'WEB';
}
