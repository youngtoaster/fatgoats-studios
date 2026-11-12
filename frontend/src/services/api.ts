import JSZip from 'jszip';
import { StudioDatabaseState, ChatMessage, AuditLog } from '../types';

const BACKEND_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';

const STORAGE_KEY = 'fatgoats_studios_local_state_v1';
const OFFLINE_BACKLOG_KEY = 'fatgoats_offline_backlog_v1';

export class ApiService {
  private static ws: WebSocket | null = null;
  private static wsListeners: Array<(event: any) => void> = [];
  private static isOnline: boolean = true;
  private static connectionStatusListeners: Array<(online: boolean) => void> = [];
  private static syncInterval: number | null = null;

  static init() {
    this.checkHealth();
    this.connectWs();
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Periodic heartbeat every 10 seconds
    setInterval(() => {
      this.checkHealth();
    }, 10000);
  }

  static onConnectionStatus(listener: (online: boolean) => void) {
    this.connectionStatusListeners.push(listener);
    listener(this.isOnline);
  }

  static onWsMessage(listener: (event: any) => void) {
    this.wsListeners.push(listener);
  }

  private static handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.connectionStatusListeners.forEach((l) => l(online));
    if (online) {
      this.flushOfflineBacklog();
      this.connectWs();
    }
  }

  private static connectWs() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.isOnline = true;
        this.connectionStatusListeners.forEach((l) => l(true));
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.wsListeners.forEach((listener) => listener(parsed));
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        // Retry after delay
        setTimeout(() => this.connectWs(), 5000);
      };

      this.ws.onerror = () => {
        // Silently close and retry
        this.ws?.close();
      };
    } catch {
      // Offline fallback
    }
  }

  static sendWsEvent(event: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      const online = res.ok;
      if (online !== this.isOnline) {
        this.isOnline = online;
        this.connectionStatusListeners.forEach((l) => l(online));
        if (online) this.flushOfflineBacklog();
      }
      return online;
    } catch {
      if (this.isOnline) {
        this.isOnline = false;
        this.connectionStatusListeners.forEach((l) => l(false));
      }
      return false;
    }
  }

  static getLocalState(): StudioDatabaseState | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  static saveLocalState(state: StudioDatabaseState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not cache to localStorage', e);
    }
  }

  static getOfflineBacklogCount(): number {
    try {
      const backlog = localStorage.getItem(OFFLINE_BACKLOG_KEY);
      return backlog ? JSON.parse(backlog).length : 0;
    } catch {
      return 0;
    }
  }

  static queueOfflineMutation(mutation: { type: string; payload: any; timestamp: string }) {
    try {
      const current = localStorage.getItem(OFFLINE_BACKLOG_KEY);
      const list = current ? JSON.parse(current) : [];
      list.push(mutation);
      localStorage.setItem(OFFLINE_BACKLOG_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving to offline backlog', e);
    }
  }

  static async flushOfflineBacklog() {
    try {
      const current = localStorage.getItem(OFFLINE_BACKLOG_KEY);
      if (!current) return;
      const list = JSON.parse(current);
      if (list.length === 0) return;

      const localState = this.getLocalState();
      if (localState) {
        await this.saveRemoteState(localState);
      }
      localStorage.removeItem(OFFLINE_BACKLOG_KEY);
    } catch (e) {
      console.error('Failed to flush offline backlog', e);
    }
  }

  static async fetchFullState(): Promise<StudioDatabaseState> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/state`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        this.saveLocalState(data);
        return data;
      }
    } catch (e) {
      console.warn('Backend unavailable, falling back to local cache or seed state', e);
    }

    const cached = this.getLocalState();
    if (cached) return cached;

    throw new Error('No state available');
  }

  static async saveRemoteState(state: StudioDatabaseState): Promise<boolean> {
    this.saveLocalState(state);

    try {
      const res = await fetch(`${BACKEND_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      this.queueOfflineMutation({
        type: 'FULL_STATE_SYNC',
        payload: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  static async postChatMessage(msg: ChatMessage): Promise<void> {
    // Send via WebSocket first for sub-millisecond local network response
    this.sendWsEvent({
      type: 'chat_message',
      payload: msg,
    });

    try {
      await fetch(`${BACKEND_URL}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
    } catch {
      this.queueOfflineMutation({
        type: 'CHAT_MESSAGE',
        payload: msg,
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async postAuditLog(log: AuditLog): Promise<void> {
    try {
      await fetch(`${BACKEND_URL}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
    } catch {
      // Ignored if offline
    }
  }

  // Workspace Portability: Full ZIP Archive Export
  static async exportProjectZip(state: StudioDatabaseState): Promise<Blob> {
    const zip = new JSZip();

    // 1. Root Database Schema State
    zip.file('fatgoats_database_state.json', JSON.stringify(state, null, 2));

    // 2. Metadata Manifest
    const manifest = {
      app: 'FatGoats Studios Creative Suite',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      projects_count: state.projects.length,
      scenes_count: state.scenes.length,
      characters_count: state.characters.length,
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 3. Screenplay Folder with raw .fountain files
    const scriptsFolder = zip.folder('screenplays');
    state.scenes.forEach((scene) => {
      const cleanSlug = scene.slugline.replace(/[^a-zA-Z0-9_-]/g, '_');
      scriptsFolder?.file(`Scene_${scene.scene_number}_${cleanSlug}.fountain`, scene.content);
    });

    // 4. Character Dossiers folder
    const charFolder = zip.folder('characters');
    state.characters.forEach((char) => {
      const cleanName = char.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      charFolder?.file(`${cleanName}_dossier.json`, JSON.stringify(char, null, 2));
    });

    // 5. Whiteboards folder
    const wbFolder = zip.folder('whiteboards');
    state.whiteboards.forEach((wb) => {
      wbFolder?.file(`${wb.id}_${wb.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`, JSON.stringify(wb, null, 2));
    });

    // 6. Lore Wiki folder
    const loreFolder = zip.folder('lore_bible');
    state.lore_articles.forEach((lore) => {
      loreFolder?.file(`${lore.category}_${lore.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`, `${lore.content_markdown}\n\n---\nProperties:\n${JSON.stringify(lore.property_cards, null, 2)}`);
    });

    return await zip.generateAsync({ type: 'blob' });
  }

  // Workspace Portability: Full ZIP Archive Import
  static async importProjectZip(file: File): Promise<StudioDatabaseState> {
    const zip = await JSZip.loadAsync(file);
    const stateFile = zip.file('fatgoats_database_state.json');
    if (!stateFile) {
      throw new Error('Invalid FatGoats project archive: missing fatgoats_database_state.json');
    }

    const stateJson = await stateFile.async('string');
    const importedState: StudioDatabaseState = JSON.parse(stateJson);
    await this.saveRemoteState(importedState);
    return importedState;
  }
}
