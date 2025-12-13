
import { browser } from '$app/environment';
import { nanoid } from 'nanoid';
import CryptoJS from 'crypto-js';
import type { ServerConfig, ConnectionStatus } from './types';
import type { HassEntity } from '$types';
import { HADriver } from './driver';

// Svelte 5 runes declarations
declare function $state<T>(value: T): T;

const STORAGE_KEY = 'ha_multi_sessions_v1';
const SECRET_KEY = 'ha-local-storage-encryption-salt'; // В идеале должно быть уникально для устройства

class HAConnectionManager {
    // --- State (Runes) ---
    servers = $state<ServerConfig[]>([]);
    activeServerId = $state<string | null>(null);
    
    status = $state<ConnectionStatus>('disconnected');
    lastError = $state<string | null>(null);
    
    // Данные активной сессии
    entities = $state<Record<string, HassEntity>>({});
    
    // Внутренние
    private driver: HADriver | null = null;

    constructor() {
        if (browser) {
            this.loadSessions();
        }
    }

    // --- Session Management ---

    addServer(name: string, url: string, token: string) {
        const newServer: ServerConfig = {
            id: nanoid(),
            name,
            url,
            token // Сохраняем как есть, шифрование происходит при сохранении в LS
        };
        this.servers.push(newServer);
        this.saveSessions();
        
        // Если это первый сервер, подключаемся сразу
        if (this.servers.length === 1) {
            this.selectServer(newServer.id);
        }
    }

    removeServer(id: string) {
        if (this.activeServerId === id) {
            this.disconnect();
        }
        this.servers = this.servers.filter(s => s.id !== id);
        this.saveSessions();
    }

    selectServer(id: string) {
        const server = this.servers.find(s => s.id === id);
        if (!server) return;

        this.disconnect(); // Разрываем текущее
        this.activeServerId = id;
        this.lastError = null;
        this.entities = {}; // Очищаем данные старой сессии

        // Инициализируем драйвер
        this.driver = new HADriver(
            server.url,
            server.token,
            (status, err) => {
                this.status = status;
                if (err) this.lastError = err;
                
                if (status === 'connected') {
                    this.fetchInitialData();
                }
            },
            (msg) => this.handleMessage(msg)
        );

        this.driver.connect();
    }

    disconnect() {
        if (this.driver) {
            this.driver.disconnect();
            this.driver = null;
        }
        this.status = 'disconnected';
    }

    // --- Data Handling ---

    private async fetchInitialData() {
        if (!this.driver) return;
        try {
            const states = await this.driver.sendCommand('get_states');
            const entityMap: Record<string, HassEntity> = {};
            states.forEach((e: HassEntity) => entityMap[e.entity_id] = e);
            this.entities = entityMap;
        } catch (e) {
            console.error('Failed to fetch initial states:', e);
        }
    }

    private handleMessage(msg: any) {
        if (msg.type === 'event' && msg.event.event_type === 'state_changed') {
            const { entity_id, new_state } = msg.event.data;
            if (new_state) {
                // Реактивное обновление словаря
                this.entities[entity_id] = new_state;
            } else {
                // Удаление сущности
                const newEntities = { ...this.entities };
                delete newEntities[entity_id];
                this.entities = newEntities;
            }
        }
    }

    // --- Storage & Security ---

    private saveSessions() {
        if (!browser) return;
        const dataToSave = this.servers.map(s => ({
            ...s,
            token: CryptoJS.AES.encrypt(s.token, SECRET_KEY).toString()
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        
        // Сохраняем ID последнего активного, чтобы восстановить при перезагрузке
        if (this.activeServerId) {
            localStorage.setItem(STORAGE_KEY + '_active', this.activeServerId);
        }
    }

    private loadSessions() {
        if (!browser) return;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            this.servers = parsed.map((s: any) => ({
                ...s,
                token: CryptoJS.AES.decrypt(s.token, SECRET_KEY).toString(CryptoJS.enc.Utf8)
            })).filter((s: ServerConfig) => s.token); // Фильтруем, если не удалось расшифровать

            const savedActiveId = localStorage.getItem(STORAGE_KEY + '_active');
            if (savedActiveId && this.servers.some(s => s.id === savedActiveId)) {
                this.selectServer(savedActiveId);
            }
        } catch (e) {
            console.error('Failed to load sessions', e);
        }
    }
}

export const haManager = new HAConnectionManager();
