
import { browser } from '$app/environment';

export const constructHaUrl = (haUrl: string, path: string, protocolType: 'ws' | 'http'): string => {
  let protocol;
  let cleanUrl = haUrl;

  if (haUrl.startsWith('https://')) {
    protocol = protocolType === 'ws' ? 'wss://' : 'https://';
    cleanUrl = haUrl.substring(8);
  } else if (haUrl.startsWith('http://')) {
    protocol = protocolType === 'ws' ? 'ws://' : 'http://';
    cleanUrl = haUrl.substring(7);
  } else {
    if (browser) {
        const isSecure = window.location.protocol === 'https:';
        if (protocolType === 'ws') {
          protocol = isSecure ? 'wss://' : 'ws://';
        } else {
          protocol = isSecure ? 'https://' : 'http://';
        }
    } else {
        protocol = protocolType === 'ws' ? 'ws://' : 'http://';
    }
  }

  cleanUrl = cleanUrl.replace(/\/$/, '');
  return `${protocol}${cleanUrl}${path}`;
};
