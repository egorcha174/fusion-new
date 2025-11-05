import React from "react";

interface FixedGridGroupProps {
  /** Элементы группы. Можно максимум 4. */
  children: React.ReactNode;
  /**
   * Если true и в группе один элемент, он занимает всю группу (2x2).
   * По умолчанию false — тогда одиночный элемент обычного размера (1x1).
   */
  expandSingleItem?: boolean;
  /** Дополнительные CSS-классы к контейнеру. */
  className?: string;
}

/**
 * Сетка 2x2 для групп дашбоарда:
 * — 1 элемент (expandSingleItem=false): обычный 1x1
 * — 1 элемент (expandSingleItem=true): большой (2x2)
 * — 2-4 элемента: равномерная сетка 2x2, пустые ячейки невидимы
 */
const FixedGridGroup: React.FC<FixedGridGroupProps> = ({
  children,
  expandSingleItem = false,
  className = "",
}) => {
  const childrenArray = React.Children.toArray(children).slice(0, 4);
  const count = childrenArray.length;

  if (count === 1 && expandSingleItem) {
    return (
      <div className={`grid grid-cols-2 grid-rows-2 gap-4 ${className}`}>
        <div className="col-span-2 row-span-2">{childrenArray[0]}</div>
      </div>
    );
  }

  // Генерируем ровно 4 ячейки, даже если элементов меньше
  const cells = Array.from({ length: 4 }, (_, i) => (
    <div key={i}>
      {childrenArray[i] ?? null}
    </div>
  ));

  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-4 ${className}`}>
      {cells}
    </div>
  );
};


export default FixedGridGroup;
