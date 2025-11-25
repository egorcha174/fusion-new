
const ELEMENT_LABELS_BASE: Record<CardElementId, string> = {
  name: 'Название', icon: 'Иконка', value: 'Значение', unit: 'Единица изм.', chart: 'График',
  status: 'Статус', slider: 'Слайдер', temperature: 'Текущая темп.', 'target-temperature': 'Термостат (кольцо)',
  'hvac-modes': 'Режимы климата', 'linked-entity': 'Связанное устройство', battery: 'Уровень заряда', 'fan-speed-control': 'Скорость вентилятора',
  video: 'Видео поток'
};

// --- Sortable Layer Item Component ---
interface SortableLayerItemProps {
