
            {/* Other Settings - Only show when connected */}
            {!isLoginMode && (
                <>
                    <Section title="Тема оформления" description="Выберите тему из списка. Используйте кнопку копирования для создания своей версии.">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {themes.map(theme => (
                                <div key={theme.id} className="text-center group relative">
                                    <button
                                        onClick={() => selectTheme(theme.id)}
                                        className="w-full aspect-video rounded-lg border-2 dark:border-gray-600 transition-all flex items-center justify-center text-xs font-semibold"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, ${theme.scheme.light.dashboardBackgroundColor1} 50%, ${theme.scheme.dark.dashboardBackgroundColor1} 50%)`,
                                            borderColor: activeThemeId === theme.id ? '#3b82f6' : 'transparent'
                                        }}
                                    >
                                        <span className="bg-white/50 dark:bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">{theme.name}</span>
                                    </button>
                                    <div className="absolute top-1 right-1 z-10 flex gap-1">
                                        {theme.isCustom && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditTheme(theme); }}
                                                className="p-1 bg-gray-800/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/80"
                                                title="Редактировать тему"
                                            >
                                                <Icon icon="mdi:pencil" className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDuplicateTheme(theme); }}
                                            className="p-1 bg-gray-800/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-500/80"
                                            title="Создать копию"
                                        >
                                            <Icon icon="mdi:content-copy" className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleExportTheme(theme); }}
                                            className="p-1 bg-gray-800/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/80"
                                            title="Экспортировать тему"
                                        >
                                            <Icon icon="mdi:export-variant" className="w-4 h-4" />
                                        </button>
                                        {theme.isCustom && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setConfirmingDeleteTheme(theme); }}
                                                className="p-1 bg-gray-800/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                                title="Удалить тему"
                                            >
                                                <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="text-center">
                                <button
                                    onClick={handleCreateNewTheme}
                                    className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 transition-all flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                                >
                                    <Icon icon="mdi:plus" className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                                </button>
                            </div>
                        </div>
                    </Section>

                    {editingTheme && (
                        <Section key={editingTheme.id} title={themes.some(t => t.id === editingTheme.id) ? `Редактирование "${editingTheme.name}"` : `Создание копии "${editingTheme.name}"`} description="Настройте цвета и сохраните тему." defaultOpen={true}>
                            {editingTheme.isCustom && (
                                <LabeledInput label="Название темы">
                                    <input
                                        type="text"
                                        value={editingTheme.name}
                                        onChange={e => setEditingTheme(t => t ? { ...t, name: e.target.value } : null)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </LabeledInput>
                            )}
                            <div className="flex border-b border-gray-200 dark:border-gray-700 mt-4">
                                <button onClick={() => setActiveEditorTab('light')} className={`px-4 py-2 text-sm font-medium ${activeEditorTab === 'light' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Светлая</button>
                                <button onClick={() => setActiveEditorTab('dark')} className={`px-4 py-2 text-sm font-medium ${activeEditorTab === 'dark' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Темная</button>
                            </div>
                            <div className="pt-4">
                                {activeEditorTab === 'light' && <ThemeEditor themeType="light" colorScheme={editingTheme.scheme} onUpdate={handleUpdateEditingThemeValue} />}
                                {activeEditorTab === 'dark' && <ThemeEditor themeType="dark" colorScheme={editingTheme.scheme} onUpdate={handleUpdateEditingThemeValue} />}
                            </div>
                            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button onClick={() => setEditingTheme(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
                                <button onClick={handleSaveTheme} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                    {!themes.some(t => t.id === editingTheme.id) ? 'Сохранить копию' : 'Сохранить'}
                                </button>
                            </div>
                        </Section>
                    )}
                    
                    <Section title="Анимация фона" defaultOpen={false}>
                        <LabeledInput label="Эффект">
                            <select value={backgroundEffect} onChange={e => setBackgroundEffect(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                                <option value="none">Нет</option>
                                <option value="snow">Снег</option>
                                <option value="rain">Дождь</option>
                                <option value="strong-cloudy">Сильная облачность</option>
                                <option value="rain-clouds">Облака и дождь</option>
                                <option value="leaves">Листопад</option>
                                <option value="river">Речные волны</option>
                                <option value="aurora">Полярное сияние</option>
                            </select>
                        </LabeledInput>
                        
                        {backgroundEffect === 'aurora' && (
                            <div className="mt-4 space-y-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Настройки сияния</h4>
                                    <div className="flex gap-2">
                                        {Object.entries(AURORA_PRESETS).map(([name, preset]) => (
                                            <button 
                                                key={name}
                                                onClick={() => setAuroraSettings(preset)}
                                                className="px-2 py-1 text-xs rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
                                            >
                                                {name === 'classic' ? 'Классика' : name === 'green' ? 'Зеленый' : 'Фиолет'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1">Цвет 1</label>
                                        <input type="color" value={auroraSettings.color1} onChange={e => handleAuroraChange('color1', e.target.value)} className="w-8 h-8 p-0 border-none rounded bg-transparent cursor-pointer"/>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1">Цвет 2</label>
                                        <input type="color" value={auroraSettings.color2} onChange={e => handleAuroraChange('color2', e.target.value)} className="w-8 h-8 p-0 border-none rounded bg-transparent cursor-pointer"/>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1">Цвет 3</label>
                                        <input type="color" value={auroraSettings.color3} onChange={e => handleAuroraChange('color3', e.target.value)} className="w-8 h-8 p-0 border-none rounded bg-transparent cursor-pointer"/>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <LabeledInput label="Скорость">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="6" max="40" value={auroraSettings.speed} onChange={e => handleAuroraChange('speed', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right">{auroraSettings.speed}s</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Интенсивность">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="30" max="120" value={auroraSettings.intensity} onChange={e => handleAuroraChange('intensity', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right">{auroraSettings.intensity}%</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Размытие">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="4" max="40" value={auroraSettings.blur} onChange={e => handleAuroraChange('blur', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right">{auroraSettings.blur}px</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Насыщенность">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="80" max="220" value={auroraSettings.saturate} onChange={e => handleAuroraChange('saturate', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right">{auroraSettings.saturate}%</span>
                                        </div>
                                    </LabeledInput>
                                </div>
                                
                                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                                    <LabeledInput label="Звезды">
                                        <input type="checkbox" checked={auroraSettings.starsEnabled} onChange={e => handleAuroraChange('starsEnabled', e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"/>
                                    </LabeledInput>
                                    {auroraSettings.starsEnabled && (
                                        <div className="mt-2">
                                            <LabeledInput label="Скорость мерцания">
                                                <div className="flex items-center gap-2">
                                                    <input type="range" min="2" max="12" value={auroraSettings.starsSpeed} onChange={e => handleAuroraChange('starsSpeed', Number(e.target.value))} className="w-full accent-blue-500"/>
                                                    <span className="text-xs w-8 text-right">{auroraSettings.starsSpeed}s</span>
                                                </div>
                                            </LabeledInput>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section title="Режим день/ночь" description="Автоматически переключает светлую и темную тему.">
                        <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="auto">Как в системе</option>
                            <option value="day">Всегда светлая</option>
                            <option value="night">Всегда темная</option>
                            <option value="schedule">По расписанию</option>
                        </select>
                        {themeMode === 'schedule' && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400">Начало ночи</label>
                                    <input type="time" value={scheduleStartTime} onChange={e => setScheduleStartTime(e.target.value)} className="w-full bg-gray-200 dark:bg-gray-800 p-2 rounded-md"/>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400">Конец ночи</label>
                                    <input type="time" value={scheduleEndTime} onChange={e => setScheduleEndTime(e.target.value)} className="w-full bg-gray-200 dark:bg-gray-800 p-2 rounded-md"/>
                                </div>
                            </div>
                        )}
                    </Section>

                    <div className="pt-4 mt-4 text-center">
                        <button
                            onClick={handleResetAppearance}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:underline"
                        >
                            Сбросить настройки внешнего вида
                        </button>
                    </div>
                </>
            )}
    