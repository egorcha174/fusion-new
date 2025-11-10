/**
 * Constructs a full URL for a given Home Assistant path, intelligently determining the protocol.
 * Handles various user inputs for the base HA URL (e.g., with/without protocol, with/without port).
 *
 * @param haUrl The base URL of the Home Assistant instance (e.g., "192.168.1.100:8123", "my-home.duckdns.org").
 * @param path The API path to append (e.g., "/api/websocket", "/api/camera_proxy_stream/...").
 * @param protocolType The desired protocol ('ws' for WebSocket, 'http' for standard HTTP).
 * @returns A full, well-formed URL.
 */
export const constructHaUrl = (haUrl: string, path: string, protocolType: 'ws' | 'http'): string => {
  let protocol;
  let cleanUrl = haUrl;

  // Check if haUrl already has a protocol
  if (haUrl.startsWith('https://')) {
    protocol = protocolType === 'ws' ? 'wss://' : 'https://';
    cleanUrl = haUrl.substring(8);
  } else if (haUrl.startsWith('http://')) {
    protocol = protocolType === 'ws' ? 'ws://' : 'http://';
    cleanUrl = haUrl.substring(7);
  } else {
    // Fallback for URLs without a protocol specified, based on the current page's protocol
    const isSecure = window.location.protocol === 'https:';
    if (protocolType === 'ws') {
      protocol = isSecure ? 'wss://' : 'ws://';
    } else { // 'http'
      protocol = isSecure ? 'https://' : 'http://';
    }
  }

  // Sanitize the rest of the URL: remove trailing slashes
  cleanUrl = cleanUrl.replace(/\/$/, '');

  return `${protocol}${cleanUrl}${path}`;
};
