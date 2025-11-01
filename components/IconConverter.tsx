


// FIX: Import React hooks using namespace import and destructuring to fix module resolution error.
import * as React from '../vendor/react.js';
const { useState } = React;

const IconConverter: React.FC = () => {
  const [svgInput, setSvgInput] = useState<string>('');
  const [typeName, setTypeName] = useState<string>('');
  const [output, setOutput] = useState<{
    types: string;
    iconConst: string;
    iconMap: string;
  } | null>(null);

  const camelCase = (str: string) => str.replace(/-([a-z])/g, g => g[1].toUpperCase());

  const convertSvgToJsx = (svg: string): string => {
    // A simplified conversion, might not cover all edge cases but works for most icon libraries
    let processedSvg = svg
      .replace(/<!--.*?-->/gs, '') // Remove comments
      .replace(/\n/g, ' ') // Remove newlines
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/\s{2,}/g, ' '); // Collapse whitespace

    // Process attributes
    processedSvg = processedSvg.replace(/<([a-zA-Z0-9]+)\s+(.*?)>/g, (match, tagName, attrs) => {
        const newAttrs = attrs
            .match(/([a-zA-Z0-9-]+=".*?")/g)
            ?.map((attr: string) => {
                let [key, value] = attr.split('=');
                // Handle special attributes
                if (key === 'class') key = 'className';
                // Convert kebab-case to camelCase
                key = camelCase(key);
                // Make colors dynamic
                if (key === 'fill' || key === 'stroke') {
                    if (value.toLowerCase() !== '"none"') {
                       value = '"currentColor"';
                    }
                }
                return `${key}=${value}`;
            })
            .join(' ') || '';
        return `<${tagName} ${newAttrs}>`;
    });

    return processedSvg;
  };

  const handleConvert = () => {
    if (!svgInput || !typeName.trim()) {
      alert('Пожалуйста, вставьте SVG-код и укажите имя типа.');
      return;
    }

    const cleanedTypeName = typeName.trim().replace(/\s+/g, '');
    const capitalizedTypeName = cleanedTypeName.charAt(0).toUpperCase() + cleanedTypeName.slice(1);
    const constName = cleanedTypeName.charAt(0).toLowerCase() + cleanedTypeName.slice(1) + 'Icon';

    const jsxSvg = convertSvgToJsx(svgInput);

    setOutput({
      types: `${capitalizedTypeName},`,
      iconConst: `const ${constName} = (\n  ${jsxSvg}\n);`,
      iconMap: `[DeviceType.${capitalizedTypeName}]: ${constName},`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Could not copy text: ', err);
    });
  };

  const CodeBlock: React.FC<{ title: string; content: string; language: string; fileName: string }> = ({ title, content, language, fileName }) => (
    <div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-2">Скопируйте и вставьте это в <code className="bg-gray-700 p-1 rounded-md">{fileName}</code>.</p>
      <div className="relative bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-200 ring-1 ring-white/10">
        <button onClick={() => copyToClipboard(content)} className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300" title="Скопировать код">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <pre><code className={`language-${language}`}>{content}</code></pre>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-4">Конвертер SVG иконок</h1>
      <p className="text-gray-400 mb-8 max-w-2xl">Этот инструмент поможет вам подготовить SVG-иконки для использования в проекте. Вставьте SVG-код, задайте имя и скопируйте сгенерированные фрагменты.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="typeName" className="block text-sm font-medium text-gray-300 mb-2">
              1. Название типа устройства
            </label>
            <input
              id="typeName"
              type="text"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="e.g., Vacuum, Camera"
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="svgInput" className="block text-sm font-medium text-gray-300 mb-2">
              2. SVG-код иконки
            </label>
            <textarea
              id="svgInput"
              rows={10}
              value={svgInput}
              onChange={(e) => setSvgInput(e.target.value)}
              placeholder='<svg xmlns="http://www.w3.org/2000/svg" ...>'
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleConvert}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Конвертировать
          </button>
        </div>

        <div className="space-y-6">
          {output ? (
            <>
              <CodeBlock title="Шаг 1: Обновите типы" content={output.types} language="typescript" fileName="types.ts (внутри enum DeviceType)" />
              <CodeBlock title="Шаг 2: Добавьте константу иконки" content={output.iconConst} language="jsx" fileName="components/DeviceIcon.tsx" />
              <CodeBlock title="Шаг 3: Зарегистрируйте иконку" content={output.iconMap} language="jsx" fileName="components/DeviceIcon.tsx (внутри объекта icons)" />
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg text-gray-500 p-8">
              Здесь появится сгенерированный код...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IconConverter;