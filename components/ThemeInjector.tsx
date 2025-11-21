
import React from 'react';
import { ColorThemeSet } from '../types';
import { generateThemeCss } from '../utils/themeUtils';

interface ThemeInjectorProps {
    theme: ColorThemeSet;
}

const ThemeInjector: React.FC<ThemeInjectorProps> = ({ theme }) => {
    const css = generateThemeCss(theme);

    return (
        <style dangerouslySetInnerHTML={{ __html: css }} />
    );
};

export default React.memo(ThemeInjector);
