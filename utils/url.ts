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
  // 1. Sanitize the base URL: remove any existing protocol and trailing slashes.
  const cleanUrl = haUrl.replace(/^(https?|wss?):\/\//, '').replace(/\/$/, '');
  
  // 2. Determine the correct protocol based on the window's current protocol and the desired type.
  const isSecure = window.location.protocol === 'https:';
  let protocol: string;

  if (protocolType === 'ws') {
    protocol = isSecure ? 'wss://' : 'ws://';
  } else { // 'http'
    protocol = isSecure ? 'https://' : 'http://';
  }

  // 3. Combine the parts into a final, valid URL.
  return `${protocol}${cleanUrl}${path}`;
};
