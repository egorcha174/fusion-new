
import React from 'react';
import { ThemeColors } from '../types';
import { generateThemeCss } from '../utils/themeUtils';

interface ThemeInjectorProps {
    theme: ThemeColors;
}

const ThemeInjector: React.FC<ThemeInjectorProps> = ({ theme }) => {
    const css = generateThemeCss(theme);

    return (
        <style dangerouslySetInnerHTML={{ __html: css }} />
    );
};

export default React.memo(ThemeInjector);
