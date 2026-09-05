export type AppPlatform = 'WEB' | 'PLAY_TWA';

export function detectPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'WEB';
  const override = new URLSearchParams(window.location.search).get('platform');
  if (override === 'play_twa') return 'PLAY_TWA';
  if (override === 'web') return 'WEB';
  const referrerIsTwa = document.referrer.startsWith('android-app://');
  if (referrerIsTwa) {
    localStorage.setItem('narayaneeyam_platform', 'PLAY_TWA');
    return 'PLAY_TWA';
  }
  const stored = localStorage.getItem('narayaneeyam_platform');
  if (stored === 'PLAY_TWA') return 'PLAY_TWA';
  return 'WEB';
}
