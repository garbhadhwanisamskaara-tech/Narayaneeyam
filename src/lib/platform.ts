export type AppPlatform = 'WEB' | 'PLAY_TWA';

export function detectPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'WEB';
  const override = new URLSearchParams(window.location.search).get('platform');
  if (override === 'play_twa') return 'PLAY_TWA';
  if (override === 'web') return 'WEB';
  return document.referrer.startsWith('android-app://') ? 'PLAY_TWA' : 'WEB';
}
