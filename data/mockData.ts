
import { Machine, MachineStatus, MachineType, Transaction, DashboardStats, JackpotConfig, User, UserRole, IniConfig, AppSettings } from '../types';

// ==========================================
// MOCK USERS & AUTH
// ==========================================

export const MOCK_USERS: User[] = [
  {
    id: 'admin_01',
    name: 'Administrador General',
    role: UserRole.SUPER_ADMIN,
    isApproved: true
  },
  {
    id: 'mod_01',
    name: 'Juan Pérez',
    role: UserRole.MODERATOR,
    consortiumName: 'Consorcio La Suerte',
    isApproved: true
  },
  {
    id: 'mod_02',
    name: 'Maria González',
    role: UserRole.MODERATOR,
    consortiumName: 'Bancas El Cibao',
    isApproved: true
  }
];

// ==========================================
// MOCK DATA
// ==========================================

export const MOCK_APP_SETTINGS: AppSettings = {
  appName: 'GalgoTrack',
  appLogo: null,
  ticketName: 'CONSORCIO EJEMPLO',
  ticketLogo: null
};

export const MOCK_JACKPOT: JackpotConfig = {
  enabled: true,
  currentValue: 15420.50,
  baseAmount: 5000,
  maxAmount: 50000,
  contributionPercent: 2.5,
  lastHit: '2023-10-20 14:30'
};

// Default Config (e.g. for Juan)
export const MOCK_INI_CONFIG: IniConfig = {
  DOG: {
    INICIO: 299,
    MINUTOS: 5,
    PORSENTAJE: 25,
    JACK: 2512.12,
    JACKWEB: 1000.00,
    MAXJACK: 20000.00,
    MAXJACKWEB: 1000.00,
    BONO: 100,
    RCD: 4,
    MUL_A: 0,
    NUMERO_MUL: 0,
    BONUS_A: 0,
    NUMERO_BONUS: 0,
    JACKPOT: 'FALSE',
    TABLA: 2,
    RCD_CARRERA: 4,
    PLAY: '37.webm',
    JACK_LOCAL: 300
  },
  PANTALLA: {
    MENSAJE: "BIENVENIDOS A CONSORCIO LA SUERTE"
  }
};

// Alt Config (e.g. for Maria - Different values to show change)
export const MOCK_INI_CONFIG_ALT: IniConfig = {
  DOG: {
    INICIO: 150,
    MINUTOS: 3,
    PORSENTAJE: 30,
    JACK: 5000.00,
    JACKWEB: 2500.00,
    MAXJACK: 50000.00,
    MAXJACKWEB: 5000.00,
    BONO: 200,
    RCD: 2,
    MUL_A: 0,
    NUMERO_MUL: 0,
    BONUS_A: 0,
    NUMERO_BONUS: 0,
    JACKPOT: 'FALSE',
    TABLA: 2,
    RCD_CARRERA: 4,
    PLAY: '37.webm',
    JACK_LOCAL: 300
  },
  PANTALLA: {
    MENSAJE: "BANCAS EL CIBAO - PAGANDO AL INSTANTE"
  }
};

// Machines assigned to specific owners
export const MOCK_MACHINES: Machine[] = [
  {
    id: 'm1',
    owner_id: 'mod_01', // Fixed property name
    name: 'Banca La Suerte Central',
    address: 'Av. 27 de Febrero #102, SD',
    phone: '809-555-0101',
    manager: 'Carlos Pérez',
    type: MachineType.BANCA,
    status: MachineStatus.ONLINE,
    last_sync: 'Hace 30 seg', // Fixed property name
    ip_address: '192.168.1.101', // Fixed property name
    software_version: 'v2.1.0', // Fixed property name
    ini_content: MOCK_INI_CONFIG // Added required property
  },
  {
    id: 'm2',
    owner_id: 'mod_01', // Fixed property name
    name: 'Colmado El Primo',
    address: 'Calle Sol #45, Santiago',
    phone: '829-555-0202',
    manager: 'Juan Rodriguez',
    type: MachineType.COLMADO,
    status: MachineStatus.ONLINE,
    last_sync: 'Hace 2 min', // Fixed property name
    ip_address: '192.168.1.105', // Fixed property name
    software_version: 'v2.0.9', // Fixed property name
    ini_content: MOCK_INI_CONFIG // Added required property
  },
  {
    id: 'm3',
    owner_id: 'mod_02', // Fixed property name
    name: 'Sport Bar Donde Jose',
    address: 'Calle 1ra #10, La Romana',
    phone: '809-555-0303',
    manager: 'Jose Martinez',
    type: MachineType.SPORT_BAR,
    status: MachineStatus.OFFLINE,
    last_sync: 'Hace 4 horas', // Fixed property name
    ip_address: '192.168.1.120', // Fixed property name
    software_version: 'v2.1.0', // Fixed property name
    ini_content: MOCK_INI_CONFIG_ALT // Added required property
  },
  {
    id: 'm4',
    owner_id: 'mod_02', // Fixed property name
    name: 'Banca Los Prados',
    address: 'Av. Winston Churchill, SD',
    phone: '809-555-0404',
    manager: 'Maria Diaz',
    type: MachineType.BANCA,
    status: MachineStatus.MAINTENANCE,
    last_sync: 'Hace 1 día', // Fixed property name
    ip_address: '10.0.0.5', // Fixed property name
    software_version: 'v2.1.0', // Fixed property name
    ini_content: MOCK_INI_CONFIG_ALT // Added required property
  }
];

const today = new Date();
const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
const lastWeek = new Date(today); lastWeek.setDate(lastWeek.getDate() - 6);
const formatDate = (date: Date, time: string) => `${date.toISOString().split('T')[0]} ${time}`;

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: formatDate(today, '10:30'), machineId: 'm1', machineName: 'Banca La Suerte Central', type: 'BET', amount: 500, ticketId: 'TCK-901' },
  { id: 't2', date: formatDate(today, '10:35'), machineId: 'm1', machineName: 'Banca La Suerte Central', type: 'PAYOUT', amount: 200, ticketId: 'TCK-901' },
  { id: 't3', date: formatDate(today, '11:00'), machineId: 'm2', machineName: 'Colmado El Primo', type: 'BET', amount: 1200, ticketId: 'TCK-902' },
  { id: 't4', date: formatDate(yesterday, '15:15'), machineId: 'm2', machineName: 'Colmado El Primo', type: 'BET', amount: 300, ticketId: 'TCK-850' },
  { id: 't5', date: formatDate(yesterday, '18:00'), machineId: 'm1', machineName: 'Banca La Suerte Central', type: 'BET', amount: 2000, ticketId: 'TCK-855' },
  // Transactions for Machine 3 (Maria)
  { id: 't6', date: formatDate(lastWeek, '09:00'), machineId: 'm3', machineName: 'Sport Bar Donde Jose', type: 'BET', amount: 5000, ticketId: 'TCK-700' },
  { id: 't7', date: formatDate(today, '12:00'), machineId: 'm3', machineName: 'Sport Bar Donde Jose', type: 'PAYOUT', amount: 1500, ticketId: 'TCK-705' },
];

// Helper to filter machines by user
const getMachinesForUser = (user: User) => {
  if (user.role === UserRole.SUPER_ADMIN) return MOCK_MACHINES;
  return MOCK_MACHINES.filter(m => m.owner_id === user.id); // Fixed owner_id access
};

// Helper to filter transactions by user
const getTransactionsForUser = (user: User) => {
  const userMachines = getMachinesForUser(user);
  const userMachineIds = userMachines.map(m => m.id);

  if (user.role === UserRole.SUPER_ADMIN) return MOCK_TRANSACTIONS;
  return MOCK_TRANSACTIONS.filter(t => userMachineIds.includes(t.machineId));
};

export const getDashboardStats = (user: User): DashboardStats => {
  const userMachines = getMachinesForUser(user);
  const userTransactions = getTransactionsForUser(user);

  const totalSales = userTransactions.filter(t => t.type === 'BET').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPayouts = userTransactions.filter(t => t.type === 'PAYOUT').reduce((acc, curr) => acc + curr.amount, 0);
  const onlineCount = userMachines.filter(m => m.status === MachineStatus.ONLINE).length;

  return {
    totalMachines: userMachines.length,
    onlineMachines: onlineCount,
    totalSales,
    totalPayouts,
    netIncome: totalSales - totalPayouts,
    lastSync: new Date().toLocaleString('es-DO')
  };
};

export const fetchMachines = async (user: User): Promise<Machine[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getMachinesForUser(user));
    }, 500);
  });
};

export const fetchTransactions = async (user: User): Promise<Transaction[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getTransactionsForUser(user));
    }, 500);
  });
};

export const fetchJackpotConfig = async (): Promise<JackpotConfig> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_JACKPOT), 400);
  });
};

export const fetchIniConfig = async (userId?: string): Promise<IniConfig> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Return different config based on simulated user selection
      // In real app, this queries the DB for the specific user's INI string
      if (userId === 'mod_02') {
        resolve(MOCK_INI_CONFIG_ALT);
      } else {
        resolve(MOCK_INI_CONFIG);
      }
    }, 400);
  });
};
