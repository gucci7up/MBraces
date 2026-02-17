
import { supabase } from '../lib/supabase';
import { Transaction, Machine, IniConfig, User, AppSettings, UserRole } from '../types';

/**
 * SERVICIOS DE PERFIL
 */
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Error obteniendo perfil:", error.message);
    return null;
  }
  return data;
};

/**
 * CONFIGURACIÓN GLOBAL (Identidad)
 */
export const getAppSettings = async () => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error("Error obteniendo ajustes:", error.message);
    return null;
  }

  return {
    appName: data.app_name,
    appLogo: data.app_logo_url,
    ticketName: data.ticket_name,
    ticketLogo: data.ticket_logo_url
  } as AppSettings;
};

export const updateAppSettings = async (settings: AppSettings) => {
  const { error } = await supabase
    .from('app_settings')
    .update({
      app_name: settings.appName,
      app_logo_url: settings.appLogo,
      ticket_name: settings.ticketName,
      ticket_logo_url: settings.ticketLogo,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1);

  if (error) {
    console.error("Error actualizando ajustes:", error.message);
    throw error;
  }
  return true;
};

/**
 * TRANSACCIONES (Finanzas)
 * Sincronizado con el esquema de reportes
 */
export const fetchFilteredTransactions = async (user: User, filters?: { terminalId?: string, start?: string, end?: string }) => {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  // Seguridad por Rol (Lógica de aplicación complementaria a RLS)
  if (user.role !== UserRole.SUPER_ADMIN) {
    query = query.eq('terminal_owner_id', user.id);
  }

  if (filters?.terminalId && filters.terminalId !== 'ALL') {
    query = query.eq('terminal_id', filters.terminalId);
  }

  if (filters?.start) query = query.gte('created_at', `${filters.start}T00:00:00`);
  if (filters?.end) query = query.lte('created_at', `${filters.end}T23:59:59`);

  const { data, error } = await query;

  if (error) {
    console.error("Error obteniendo transacciones:", error.message);
    throw error;
  }

  return data.map(t => ({
    id: t.id,
    date: new Date(t.created_at).toLocaleString('es-DO'),
    machineId: t.terminal_id,
    machineName: t.machine_name || 'Terminal Desconocida',
    type: t.type,
    amount: parseFloat(t.amount),
    ticketId: t.ticket_id
  })) as Transaction[];
};

/**
 * TERMINALES (Máquinas)
 */
export const getTerminals = async (user: User) => {
  let query = supabase.from('terminals').select('*');

  if (user.role !== UserRole.SUPER_ADMIN) {
    query = query.eq('owner_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error obteniendo terminales:", error.message);
    throw error;
  }
  return data;
};

export const updateIniConfig = async (terminalId: string, config: IniConfig) => {
  const { error } = await supabase
    .from('terminals')
    .update({
      ini_content: config,
      last_sync: new Date().toISOString()
    })
    .eq('id', terminalId);

  if (error) {
    console.error("Error actualizando INI:", error.message);
    throw error;
  }
  return true;
};

export const createTerminal = async (user: User, terminalData: Partial<Machine>) => {
  const defaultIni: IniConfig = {
    dog: {
      inicio: 0,
      minutos: 15,
      porsentaje: 20,
      jack: 100,
      jackweb: 50,
      maxjack: 5000,
      maxjackweb: 2500,
      bono: 0,
      rcd: 0
    },
    pantalla: {
      mensaje: `BIENVENIDOS A ${user.consortiumName || 'SISTEMA'}`
    }
  };

  const { data, error } = await supabase
    .from('terminals')
    .insert([{
      owner_id: user.id,
      name: terminalData.name,
      address: terminalData.address,
      phone: terminalData.phone,
      manager: terminalData.manager,
      type: terminalData.type,
      status: 'Desconectado',
      ini_content: defaultIni,
      last_sync: null,
      software_version: 'v1.0.0'
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creando terminal:", error.message);
    throw error;
  }
  return data;
};

/**
 * JACKPOT (Realtime)
 */
export const getJackpotValue = async () => {
  const { data, error } = await supabase
    .from('jackpot_values')
    .select('current_value')
    .eq('id', 1)
    .single();

  if (error) {
    console.error("Error obteniendo jackpot:", error.message);
    return 0;
  }
  return parseFloat(data.current_value);
};

export const subscribeToJackpot = (onUpdate: (val: number) => void) => {
  return supabase
    .channel('jackpot-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'jackpot_values'
    }, (payload) => {
      onUpdate(parseFloat(payload.new.current_value));
    })
    .subscribe();
};
