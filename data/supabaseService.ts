import { apiFetch } from '../lib/api';
import { Transaction, Machine, IniConfig, User, AppSettings, UserRole } from '../types';

/**
 * SERVICIOS DE PERFIL
 */
export const getProfile = async (userId: string) => {
  try {
    const profile = await apiFetch('/api/profile/me');
    if (profile?.id !== userId) return null;
    return profile;
  } catch {
    return null;
  }
};

/**
 * CONFIGURACIÓN GLOBAL (Identidad)
 */
export const getAppSettings = async () => {
  try {
    return await apiFetch('/api/app-settings') as AppSettings;
  } catch {
    return null;
  }
};

export const updateAppSettings = async (settings: AppSettings) => {
  await apiFetch('/api/app-settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
  return true;
};

/**
 * TRANSACCIONES (Finanzas)
 * Sincronizado con el esquema de reportes
 */
export const fetchFilteredTransactions = async (user: User, filters?: { terminalId?: string, start?: string, end?: string, limit?: number }) => {
  const params = new URLSearchParams();
  if (filters?.terminalId) params.set('terminalId', filters.terminalId);
  if (filters?.start) params.set('start', filters.start);
  if (filters?.end) params.set('end', filters.end);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return await apiFetch(`/api/transactions${qs}`) as Transaction[];
};

/**
 * CARRERAS RECIENTES (Collector Sync)
 */
export const fetchRecentRaces = async (user: User, limit = 10) => {
  const qs = `?limit=${encodeURIComponent(String(limit))}`;
  return await apiFetch(`/api/races/recent${qs}`) as any[];
};

/**
 * TERMINALES (Máquinas)
 */
export const getTerminals = async (user: User) => {
  return await apiFetch('/api/terminals') as any[];
};

export const updateIniConfig = async (terminalId: string, config: IniConfig) => {
  await apiFetch(`/api/terminals/${encodeURIComponent(terminalId)}/ini`, {
    method: 'PUT',
    body: JSON.stringify(config)
  });
  return true;
};

export const createTerminal = async (user: User, terminalData: Partial<Machine>) => {
  const defaultIni: IniConfig = {
    DOG: {
      INICIO: 48,
      MINUTOS: 5,
      PORSENTAJE: 25,
      jack: 2000.00,
      jackweb: 1000.00,
      maxjack: 20000.00,
      maxjackweb: 1000.00,
      BONO: 100,
      RCD: 5,
      MUL_A: 0,
      NUMERO_MUL: 0,
      BONUS_A: 0,
      NUMERO_BONUS: 0,
      JACKPOT: 'FALSE',
      TABLA: 2,
      RCD_CARRERA: 4,
      play: '37.webm',
      JACK_LOCAL: 300
    },
    PANTALLA: {
      MENSAJE: `BIENVENIDOS A ${user.consortiumName || 'MBRACES'}`
    }
  };

  return await apiFetch('/api/terminals', {
    method: 'POST',
    body: JSON.stringify({
      ...terminalData,
      ini_content: defaultIni
    })
  });
};

/**
 * JACKPOT (Realtime)
 */
export const getJackpotValue = async () => {
  const data = await apiFetch('/api/jackpot');
  return Number(data?.currentValue || 0);
};

export const subscribeToJackpot = (onUpdate: (val: number) => void) => {
  let active = true;
  const tick = async () => {
    try {
      const val = await getJackpotValue();
      if (active) onUpdate(val);
    } catch { }
  };
  void tick();
  const interval = setInterval(tick, 3000);
  return {
    unsubscribe: () => {
      active = false;
      clearInterval(interval);
    }
  };
};

/**
 * ANULACIÓN DE TICKETS
 * Marca el ticket como anulado en Supabase Y lo registra en voided_tickets
 * para que el collector lo sincronice con GALDOS.db (TICKETS_ELIMINADOS_P)
 */
export const voidTransaction = async (id: string, isCollector: boolean) => {
  await apiFetch(`/api/transactions/${encodeURIComponent(id)}/void`, {
    method: 'POST',
    body: JSON.stringify({ isCollector })
  });
  return true;
};

/**
 * ELIMINACIÓN PERMANENTE DE TICKETS POR NÚMERO
 * Busca y elimina todos los tickets con el número especificado
 * @param ticketNumber - El número de ticket a eliminar (ej: "TCK-12345" o "8")
 * @param confirmDelete - Si es true, ejecuta la eliminación. Si es false, solo cuenta.
 * @returns Objeto con el conteo de tickets encontrados/eliminados
 */
export const deleteTicketsByNumber = async (ticketNumber: string, confirmDelete: boolean = false) => {
  const qs = `?confirm=${confirmDelete ? 'true' : 'false'}`;
  return await apiFetch(`/api/tickets/${encodeURIComponent(ticketNumber)}${qs}`, {
    method: 'DELETE'
  });
};
