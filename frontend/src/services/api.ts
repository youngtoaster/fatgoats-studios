import JSZip from 'jszip';
import { StudioDatabaseState, ChatMessage, AuditLog } from '../types';
import { globalConnectionMachine, ConnectionState } from '../machines/connectionMachine';

const BACKEND_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';

const STORAGE_KEY = 'fatgoats_studios_local_state_v1';
const OFFLINE_BACKLOG_KEY = 'fatgoats_offline_backlog_v1';

export class ApiService {
  private static ws: WebSocket | null = null;
  private static wsListeners: Array<(event: any) => void> = [];
  private static connectionStatusListeners: Array<(state: ConnectionState, online: boolean) => void> = [];

  static init() {
    this.checkHealth();
    this.connectWs();
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Periodic heartbeat every 10 seconds
    setInterval(() => {
      this.checkHealth();
    }, 10000);

    // Sync connection machine changes
    globalConnectionMachine.subscribe((state) => {
      const isOnline = state === 'CONNECTED_IDLE' || state === 'SYNCING_BATCH';
      this.connectionStatusListeners.forEach((l) => l(state, isOnline));
    });
  }

  static getConnectionState(): ConnectionState {
    return globalConnectionMachine.getState();
  }

  static onConnectionStatus(listener: (state: ConnectionState, online: boolean) => void) {
    this.connectionStatusListeners.push(listener);
    const curr = globalConnectionMachine.getState();
    listener(curr, curr === 'CONNECTED_IDLE' || curr === 'SYNCING_BATCH');
  }

  static onWsMessage(listener: (event: any) => void) {
    this.wsListeners.push(listener);
  }

  private static handleNetworkChange(online: boolean) {
    if (online) {
      globalConnectionMachine.send({ type: 'START_CONNECT' });
      this.flushOfflineBacklog();
      this.connectWs();
    } else {
      globalConnectionMachine.send({ type: 'DISCONNECT' });
    }
  }

  private static connectWs() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        globalConnectionMachine.send({ type: 'CONNECTION_SUCCESS' });
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
        globalConnectionMachine.send({ type: 'DISCONNECT' });
        setTimeout(() => this.connectWs(), 5000);
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      globalConnectionMachine.send({ type: 'CONNECTION_FAILURE', error: 'WebSocket initialization failed' });
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
      if (online) {
        if (globalConnectionMachine.getState() !== 'CONNECTED_IDLE' && globalConnectionMachine.getState() !== 'SYNCING_BATCH') {
          globalConnectionMachine.send({ type: 'CONNECTION_SUCCESS' });
          this.flushOfflineBacklog();
        }
      } else {
        globalConnectionMachine.send({ type: 'CONNECTION_FAILURE' });
      }
      return online;
    } catch {
      globalConnectionMachine.send({ type: 'CONNECTION_FAILURE' });
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
      globalConnectionMachine.send({ type: 'QUEUE_MUTATION', mutation });
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

      globalConnectionMachine.send({ type: 'START_SYNC' });
      const localState = this.getLocalState();
      if (localState) {
        const success = await this.saveRemoteState(localState);
        if (success) {
          localStorage.removeItem(OFFLINE_BACKLOG_KEY);
          globalConnectionMachine.send({ type: 'SYNC_SUCCESS' });
          return;
        }
      }
      globalConnectionMachine.send({ type: 'SYNC_FAILURE', error: 'Server rejected batch' });
    } catch (e) {
      globalConnectionMachine.send({ type: 'SYNC_FAILURE', error: String(e) });
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

  static async exportProjectZip(state: StudioDatabaseState): Promise<Blob> {
    const zip = new JSZip();

    zip.file('fatgoats_database_state.json', JSON.stringify(state, null, 2));

    const manifest = {
      app: 'FatGoats Studios Creative Suite',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      projects_count: state.projects.length,
      scenes_count: state.scenes.length,
      characters_count: state.characters.length,
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    const scriptsFolder = zip.folder('screenplays');
    state.scenes.forEach((scene) => {
      const cleanSlug = scene.slugline.replace(/[^a-zA-Z0-9_-]/g, '_');
      scriptsFolder?.file(`Scene_${scene.scene_number}_${cleanSlug}.fountain`, scene.content);
    });

    const charFolder = zip.folder('characters');
    state.characters.forEach((char) => {
      const cleanName = char.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      charFolder?.file(`${cleanName}_dossier.json`, JSON.stringify(char, null, 2));
    });

    const wbFolder = zip.folder('whiteboards');
    state.whiteboards.forEach((wb) => {
      wbFolder?.file(`${wb.id}_${wb.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`, JSON.stringify(wb, null, 2));
    });

    const loreFolder = zip.folder('lore_bible');
    state.lore_articles.forEach((lore) => {
      loreFolder?.file(`${lore.category}_${lore.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`, `${lore.content_markdown}\n\n---\nProperties:\n${JSON.stringify(lore.property_cards, null, 2)}`);
    });

    return await zip.generateAsync({ type: 'blob' });
  }

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
