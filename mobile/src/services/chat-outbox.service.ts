// Fila persistente de mensagens não entregues (offline). Sobrevive a reload e
// é esvaziada quando a conexão volta. Mantém o app "sem perder mensagem".
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@sync:chat-outbox';

export type OutboxItem = {
  clientId: string;
  matchId: string;
  content: string;
  createdAt: string;
};

async function readAll(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeAll(items: OutboxItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items.slice(-200))); // teto de segurança
  } catch {
    /* noop */
  }
}

export const chatOutbox = {
  async add(item: OutboxItem): Promise<void> {
    const items = await readAll();
    if (items.some((i) => i.clientId === item.clientId)) return; // evita duplicar
    items.push(item);
    await writeAll(items);
  },

  async remove(clientId: string): Promise<void> {
    const items = await readAll();
    await writeAll(items.filter((i) => i.clientId !== clientId));
  },

  async forMatch(matchId: string): Promise<OutboxItem[]> {
    return (await readAll()).filter((i) => i.matchId === matchId);
  },

  async all(): Promise<OutboxItem[]> {
    return readAll();
  },
};
