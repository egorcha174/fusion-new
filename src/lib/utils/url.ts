
/**
 * Создает полный URL для заданного пути Home Assistant, автоматически определяя протокол.
 * Обрабатывает различные варианты ввода базового URL HA (например, с/без протокола, с/без порта).
 *
 * @param haUrl - Базовый URL экземпляра Home Assistant (например, "192.168.1.100:8123", "my-home.duckdns.org").
 * @param path - Путь API для добавления (например, "/api/websocket").
 * @param protocolType - Желаемый протокол ('ws' для WebSocket, 'http' для стандартного HTTP).
 * @returns {string} - Полностью сформированный URL.
 */
export const constructHaUrl = (haUrl: string, path: string, protocolType: 'ws' | 'http'): string => {
  let protocol;
  let cleanUrl = haUrl;

  // Проверяем, есть ли уже протокол в haUrl
  if (haUrl.startsWith('https://')) {
    protocol = protocolType === 'ws' ? 'wss://' : 'https://';
    cleanUrl = haUrl.substring(8);
  } else if (haUrl.startsWith('http://')) {
    protocol = protocolType === 'ws' ? 'ws://' : 'http://';
    cleanUrl = haUrl.substring(7);
  } else {
    // Резервный вариант для URL без указания протокола, основанный на протоколе текущей страницы.
    // Это важно для работы в Home Assistant Ingress.
    if (typeof window !== 'undefined') {
        const isSecure = window.location.protocol === 'https:';
        if (protocolType === 'ws') {
          protocol = isSecure ? 'wss://' : 'ws://';
        } else { // 'http'
          protocol = isSecure ? 'https://' : 'http://';
        }
    } else {
        protocol = protocolType === 'ws' ? 'ws://' : 'http://';
    }
  }

  // Очищаем URL от возможных слэшей в конце.
  cleanUrl = cleanUrl.replace(/\/$/, '');

  return `${protocol}${cleanUrl}${path}`;
};
