# Migration Guide: React to SvelteKit (Svelte 5)

## 1. Project Goal
Migrate the existing "Home Assistant Dashboard" from React 18/Vite to **SvelteKit 2** using **Svelte 5 (Runes)** and **TailwindCSS**.
The target environment is Node.js (via `@sveltejs/adapter-node`) inside Home Assistant Ingress.

## 2. Technical Stack Analysis

### Current (React)
- **State:** Zustand (`appStore`, `haStore`).
- **Routing:** Custom state-based routing (`currentPage` state).
- **Drag & Drop:** `@dnd-kit`.
- **Charts:** `recharts`.
- **Icons:** `@iconify/react`.
- **Animations:** `framer-motion` & CSS.
- **Data Layer:** WebSocket connection to Home Assistant.

### Target (SvelteKit)
- **State:** Svelte 5 Runes (Shared `.svelte.ts` modules).
- **Routing:** SvelteKit File-system routing.
- **Drag & Drop:** `svelte-dnd-action` (lightweight) or Native HTML5 DnD.
- **Charts:** Native SVG (custom implementation) to reduce bundle size.
- **Icons:** `@iconify/svelte`.
- **Animations:** Native Svelte transitions (`transition:fade`, `animate:flip`).

---

## 3. Architecture & Structure

### 3.1 Directory Structure
```
src/
├── lib/
│   ├── components/
│   │   ├── cards/          # DeviceCard, etc.
│   │   ├── controls/       # ThermostatDial, Sliders
│   │   ├── effects/        # BackgroundEffects
│   │   ├── grid/           # DashboardGrid
│   │   └── ui/             # Generic UI components
│   ├── state/
│   │   ├── ha.svelte.ts    # Home Assistant Logic (Singleton)
│   │   └── app.svelte.ts   # App Settings & UI State (Singleton)
│   ├── utils/              # Helper functions (mappers, math)
│   └── types.ts            # Shared TypeScript interfaces
├── routes/
│   ├── +layout.svelte      # Main layout (Global providers, ThemeInjector)
│   ├── +page.svelte        # Redirect or Main Dashboard
│   ├── dashboard/
│   │   └── +page.svelte    # Main Grid
│   ├── all-devices/
│   │   └── +page.svelte
│   ├── settings/
│   │   └── +page.svelte
│   └── template-gallery/
│       └── +page.svelte
└── app.html
```

### 3.2 State Management (The "Runes" Approach)

**HomeAssistant Service (`lib/state/ha.svelte.ts`):**
Replace `useHAStore`. Create a singleton class.
- Use `$state` for `connectionStatus`, `entities`, etc.
- Use `$derived` for `allKnownDevices` (mapping logic).
- Keep the WebSocket logic but trigger state updates directly.

**App Service (`lib/state/app.svelte.ts`):**
Replace `useAppStore`.
- Use `$state` for `tabs`, `themeMode`, `customizations`.
- Use `$effect` to persist critical state to `localStorage`.

---

## 4. Migration Steps

### Phase 1: Foundation
1.  **Setup:** Initialize SvelteKit project with TypeScript and TailwindCSS.
2.  **Core Logic:** Port `types.ts` and `utils/ha-data-mapper.ts` (mostly copy-paste, adjust imports).
3.  **State:** Implement `ha.svelte.ts`. Validate WebSocket connection and data fetching.

### Phase 2: Core UI Components
1.  **Theme Engine:** Port `ThemeInjector` logic to `+layout.svelte` using CSS variables.
2.  **Icons:** Replace `DeviceIcon.tsx` with a Svelte equivalent using `@iconify/svelte`.
3.  **Basic Card:** Implement `DeviceCard.svelte`.
    - Instead of React's `renderElement` switch-case, use Svelte `{#if}` blocks or dynamic components.
    - Port `SparklineChart` (it's already SVG, easy port).

### Phase 3: Complex Widgets
1.  **Thermostat:** Port `ThermostatDial.tsx`.
    - Logic for SVG path generation (`describeArc`, `polarToCartesian`) is pure JS, keep it.
    - Event handling (`on:pointerdown`) needs adaptation to Svelte syntax.
2.  **Effects:** Port `BackgroundEffects.tsx`.
    - Use `{#each}` for particles (Snow/Rain).
    - Port Canvas logic for Tron effect to a Svelte action or `onMount`.

### Phase 4: Dashboard Grid & Drag-and-Drop
This is the most complex part.
1.  **Grid:** Use CSS Grid.
2.  **DnD:** Replace `@dnd-kit` with `svelte-dnd-action`.
    - Svelte's `animate:flip` handles the visual reordering smoothly.
    - **Logic:** When dragging ends, calculate new `col/row` and update the store.

### Phase 5: Routing & Pages
1.  Break down `App.tsx` into SvelteKit routes.
2.  `DashboardHeader` becomes a shared component in layout or page.
3.  `InfoPanel` (Sidebar) becomes part of the Layout.

### Phase 6: Optimization
1.  **Charts:** Rewrite `HistoryChart` (currently Recharts) to use native SVG paths.
    - Since we already have `SparklineChart`, extend it to support areas and axes.
    - This removes a huge dependency (`recharts`).

---

## 5. Key Syntax Changes

**React:**
```tsx
// Component
{device.state === 'on' && <div>On</div>}
<div style={{ color: 'red' }} />
```

**Svelte:**
```svelte
<!-- Component -->
{#if device.state === 'on'}
  <div>On</div>
{/if}
<div style="color: red"></div>
```

**Reactivity:**
- React: `const { tabs } = useAppStore();`
- Svelte: `import { app } from '$lib/state/app.svelte';` -> usage: `app.tabs`

---

## 6. Detailed Implementation Notes

- **Circular Dependencies:** The React code had explicit dependency injection (`initAppStore`). In Svelte, simple module imports usually resolve this, but be careful with derived state relying on other stores.
- **LocalStorage:** Use `browser` check from `$app/environment` before accessing `localStorage` to support SSR.
- **Styling:** Keep using Tailwind classes. Copy `tailwind.config.js`.
