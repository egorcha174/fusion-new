
import { useEffect, useRef } from 'react';

export const useHomeAssistant = () => {
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Автоматическое подключение удалено.
    // Теперь подключение инициируется только вручную через интерфейс (кнопка "Подключиться").
};
