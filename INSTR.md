# Руководство по миграции: React -> SvelteKit (Svelte 5)

## 1. Цель и Философия
Перенести текущий функционал Home Assistant Dashboard с **React 18** на **SvelteKit 2** c использованием **Svelte 5 (Runes)**.
**Главные приоритеты:**
1.  **Zero-runtime overhead:** Максимальное использование компилятора Svelte.
2.  **Минимальный размер бандла:** Отказ от тяжелых библиотек (`framer-motion`, `recharts`, `zustand`) в пользу нативных возможностей Svelte.
3.  **SSR & Performance:** Использование `@sveltejs/adapter-node` для эффективной работы внутри HA Ingress.

---

## 2. Анализ текущего проекта (React)

### 2.1. Стек и Зависимости
| Область | Текущее решение (React) | Целевое решение (SvelteKit) | Причина замены |
| :--- | :--- | :--- | :--- |
| **State** | `zustand` (глобальные сторы `haStore`, `appStore`) | **Svelte 5 Runes** (`.svelte.ts` классы) | Нативная реактивность без лишних абстракций. |
| **Routing** | Conditional rendering (`currentPage` state) | **SvelteKit File-system Routing** | Стандартный роутинг, code-splitting, SSR. |
| **DnD** | `@dnd-kit` (Grid + Sortable) | **`svelte-dnd-action`** или нативный HTML5 API | Легковесность, простота интеграции с DOM. |
| **Charts** | `recharts` (тяжелая библиотека) | **SVG + Svelte logic** | Svelte идеально генерирует SVG. Экономия ~300-500KB. |
| **Anim** | `framer-motion` | **Svelte Transitions/Animations** | Встроено в ядро (`transition:fade`, `animate:flip`). |
| **Icons** | `@iconify/react` | `@iconify/svelte` | Аналогичный API, нативная поддержка. |

### 2.2. Ключевой функционал для переноса
1.  **WebSocket Client (`haStore`):** Управление соединением, auth flow, подписки на события, кэширование сущностей.
2.  **Entity Mapping (`utils/ha-data-mapper`):** Преобразование сырых данных HA в удобные объекты `Device`.
3.  **Dashboard Grid:** Сетка с поддержкой Drag-and-Drop, коллизий и ресайза карточек.
4.  **Template Engine:** Система рендеринга карточек на основе JSON-шаблонов (`DeviceCard`).
5.  **Theme Engine:** Динамическая генерация CSS переменных.
6.  **Complex Widgets:** Термостат (SVG Dial), Таймеры, Погода.

---

## 3. Архитектура SvelteKit (Runes)

### 3.1. Структура проекта
```text
src/
├── lib/
│   ├── components/       # UI компоненты
│   │   ├── cards/        # DeviceCard, элементы шаблонов
│   │   ├── controls/     # ThermostatDial, Sliders
│   │   ├── effects/      # BackgroundEffects (Snow, Rain, etc.)
│   │   └── ui/           # Modal, Button, Input (shadcn-like)
│   ├── state/            # Глобальное состояние (Runes)
│   │   ├── ha.svelte.ts  # Логика Home Assistant (Singleton)
│   │   └── app.svelte.ts # Настройки приложения (Singleton)
│   ├── utils/            # Хелперы (мапперы, grid-calc)
│   └── types.ts          # Типы (скопировать из React)
├── routes/
│   ├── +layout.svelte    # Глобальный лейаут (ThemeInjector, Background)
│   ├── +page.svelte      # Редирект на /dashboard
│   ├── dashboard/
│   │   └── +page.svelte  # Основная сетка
│   ├── all-devices/
│   │   └── +page.svelte  # Список всех устройств
│   └── settings/
│       └── +page.svelte  # Страница настроек
└── app.html
```

### 3.2. Управление состоянием (Svelte 5 Runes)

Вместо хуков Zustand используем глобальные реактивные классы.

**`src/lib/state/ha.svelte.ts`:**
```typescript
import { mapEntitiesToRooms } from '$lib/utils/ha-data-mapper';

class HomeAssistant {
    // $state поля заменяют useState/useStore
    connectionStatus = $state<ConnectionStatus>('idle');
    rawEntities = $state<Record<string, HassEntity>>({});
    
    // $derived поля автоматически пересчитываются при изменении зависимостей
    // Это заменяет сложные селекторы Zustand
    allKnownDevices = $derived.by(() => {
        // Логика маппинга
        return mapEntitiesToRooms(Object.values(this.rawEntities), ...);
    });

    constructor() {
        // Инициализация
    }

    connect(url: string, token: string) {
        // WebSocket логика
        // Обновление this.rawEntities[id] = newState
    }
}

// Экспортируем синглтон
export const ha = new HomeAssistant();
```

---

## 4. План реализации (Step-by-Step)

### Этап 1: Фундамент (Setup & Core)
1.  **Инициализация:** `npm create svelte@latest` -> Skeleton project -> TypeScript.
2.  **Стили:** Установка TailwindCSS. Копирование цветовой палитры из `defaults.ts`.
3.  **Типы:** Копирование `types.ts` без изменений.
4.  **HA Client:** Создание `lib/state/ha.svelte.ts`.
    *   Реализовать подключение WebSocket.
    *   Реализовать Auth flow.
    *   Проверить получение данных в консоли.

### Этап 2: Базовый UI и Темы
1.  **App State:** Создание `lib/state/app.svelte.ts` для хранения настроек (тема, вкладки).
    *   Использовать `$effect` для сохранения в `localStorage`. **Важно:** Проверять `if (browser)` перед доступом к `localStorage`.
2.  **Theme Injector:** В `+layout.svelte` подписаться на `app.colorScheme` и выставлять CSS Variables в style тег (или `:root`).
3.  **Background Effects:** Портирование `BackgroundEffects.tsx`.
    *   Svelte справляется с DOM-нодами (снег/дождь) эффективнее React.
    *   Для Canvas эффектов (Tron) использовать `$effect` (аналог `useEffect`) внутри компонента.

### Этап 3: Карточки устройств (Card Engine)
Это сердце UI.
1.  **DeviceCard.svelte:**
    *   Вместо функции `renderElement` и `switch-case`, использовать Svelte Snippets или динамические компоненты.
    *   Пример:
        ```svelte
        {#each template.elements as element}
            {#if element.id === 'icon'}
                <CardIcon {element} {device} />
            {:else if element.id === 'name'}
                <CardName {element} {device} />
            {/if}
        {/each}
        ```
2.  **ThermostatDial:** Портировать логику SVG путей. Svelte позволяет писать SVG прямо в разметке, что упрощает код.
    *   `onPointerDown` события перенести на svelte-синтаксис `on:pointerdown`.

### Этап 4: Сетка и Drag-and-Drop
Самая сложная часть миграции. `@dnd-kit` заменяем на `svelte-dnd-action` или кастомную реализацию, если нужна жесткая сетка.

**Стратегия:**
1.  Использовать CSS Grid для отображения.
2.  Для DND использовать нативные HTML5 события или библиотеку `svelte-dnd-action`.
3.  **Анимация:** Использовать встроенную директиву `animate:flip`. Она автоматически анимирует перемещение элементов в сетке при изменении их порядка — *zero-code animation*.

### Этап 5: Графики (Оптимизация)
Отказываемся от `recharts` (экономим размер бандла).
1.  **Sparkline:** Портировать существующий `SparklineChart.tsx` (он уже на SVG) в `.svelte`.
2.  **HistoryChart:** Написать простой компонент на SVG:
    *   Использовать `scaleLinear`, `scaleTime` из `d3-scale` (только эти модули, не весь d3).
    *   Генерировать `path d="..."` динамически.

### Этап 6: Настройки и Модальные окна
1.  Использовать HTML `<dialog>` для модалок или простой `fixed` div (как сейчас).
2.  Портировать формы настроек. Svelte `bind:value` сократит код форм в 3-4 раза.

---

## 5. Важные технические нюансы

1.  **Circular Dependencies:** В React коде есть инъекция `initAppStore` в `haStore`. В Svelte модули инициализируются при импорте.
    *   *Решение:* `ha.svelte.ts` и `app.svelte.ts` должны быть независимы. Если нужна связь, создавать третий управляющий класс или импортировать их друг в друга аккуратно (синглтоны позволяют).
2.  **SSR Compatibility:**
    *   Весь код, работающий с `window` (размеры окна, localStorage, WebSocket), должен быть обернут в проверку `if (browser)`.
    *   В `hooks/useIsLg.ts` -> использовать `svelte:window` биндинги: `<svelte:window bind:innerWidth />`.
3.  **Анимации иконок:**
    *   Вместо CSS классов из React (`animate-spin`), можно использовать Svelte Transitions или те же Tailwind классы.

## 6. Пример кода (Сравнение)

**React (DeviceCard element):**
```tsx
case 'name':
  return (
    <div style={commonStyle}>
      {device.name}
    </div>
  );
```

**Svelte 5 (DeviceCard.svelte):**
```svelte
<script>
  let { element, device } = $props();
</script>

{#if element.id === 'name'}
  <div style={getStyle(element)}>
    {device.name}
  </div>
{/if}
```

## 7. Файлы конфигурации (Создать в корне)

**svelte.config.js**
```javascript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
        alias: {
            $state: 'src/lib/state',
            $components: 'src/lib/components',
            $utils: 'src/lib/utils'
        }
	}
};
export default config;
```

**metadata.json** (Перенести из текущего проекта)
```json
{
  "name": "Home Assistant UI (Svelte)",
  "description": "High performance dashboard",
  "requestFramePermissions": []
}
```
