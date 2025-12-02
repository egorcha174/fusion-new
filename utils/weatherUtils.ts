
// --- MAPPINGS FOR HA WEATHER ---
export const haConditionToOwmCode: Record<string, string> = {
    'clear-night': '01n', 'cloudy': '03d', 'fog': '50d',
    'hail': '13d', 'lightning': '11d', 'lightning-rainy': '11d',
    'partlycloudy': '02d', 'pouring': '09d', 'rainy': '10d',
    'snowy': '13d', 'snowy-rainy': '13d', 'sunny': '01d',
    'windy': '50d', 'windy-variant': '50d', 'exceptional': '50d'
};

// --- MAPPINGS FOR YANDEX WEATHER ---
export const yandexConditionToText: { [key: string]: string } = {
    'clear': 'Ясно', 'partly-cloudy': 'Малооблачно', 'cloudy': 'Облачно с прояснениями',
    'overcast': 'Пасмурно', 'drizzle': 'Морось', 'light-rain': 'Небольшой дождь', 'rain': 'Дождь',
    'moderate-rain': 'Умеренно сильный дождь', 'heavy-rain': 'Сильный дождь',
    'continuous-heavy-rain': 'Длительный сильный дождь', 'showers': 'Ливень',
    'wet-snow': 'Дождь со снегом', 'light-snow': 'Небольшой снег', 'snow': 'Снег',
    'snow-showers': 'Снегопад', 'hail': 'Град', 'thunderstorm': 'Гроза',
    'thunderstorm-with-rain': 'Дождь с грозой', 'thunderstorm-with-hail': 'Гроза с градом',
};

export const yandexIconToOwmCode: { [key: string]: string } = {
    'skc-d': '01d', 'skc-n': '01n', 'bkn-d': '02d', 'bkn-n': '02n',
    'cld-d': '03d', 'cld-n': '03n', 'ovc': '04d',
    'ovc-ra': '10d', 'ovc-sn': '13d', 'ovc-ts-ra': '11d',
    'fg-fog': '50d',
    // Fallbacks
    'bkn-ra-d': '10d', 'bkn-ra-n': '10n', 'bkn-sn-d': '13d', 'bkn-sn-n': '13n',
    'ovc-ra-sn': '13d', 'ovc-dr': '09d', 'ovc-sn-sh': '13d', 'ovc-sh': '09d',
};

// --- MAPPING FOR FORECA WEATHER ---
export const forecaSymbolToOwmCode = (symbol: string): string => {
    if (!symbol) return '01d';
    const symbolCode = parseInt(symbol.slice(1), 10);
    const dayNight = symbol.startsWith('d') ? 'd' : 'n';

    if (symbolCode === 100) return `01${dayNight}`; // Clear
    if (symbolCode >= 210 && symbolCode <= 212) return `02${dayNight}`; // Partly cloudy
    if (symbolCode >= 220 && symbolCode <= 222) return `03${dayNight}`; // Cloudy
    if (symbolCode === 230) return `04${dayNight}`; // Overcast
    if (symbolCode >= 311 && symbolCode <= 312) return `10${dayNight}`; // Rain
    if (symbolCode >= 320 && symbolCode <= 322) return `09${dayNight}`; // Showers
    if (symbolCode >= 411 && symbolCode <= 412) return `13${dayNight}`; // Snow
    if (symbolCode >= 420 && symbolCode <= 422) return `13${dayNight}`; // Snow showers
    if (symbolCode >= 430 && symbolCode <= 432) return `13${dayNight}`; // Sleet
    if (symbolCode >= 240 && symbolCode <= 242) return `11${dayNight}`; // Thunder
    if (symbolCode === 0) return `50${dayNight}`; // Fog

    // Default fallbacks
    if (symbol.includes('2')) return `03${dayNight}`; // Generic cloud
    if (symbol.includes('3')) return `10${dayNight}`; // Generic rain
    if (symbol.includes('4')) return `13${dayNight}`; // Generic snow

    return `01${dayNight}`; // Default to clear
};
