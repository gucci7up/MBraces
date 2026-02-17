
export enum MachineType {
  BANCA = 'Banca',
  COLMADO = 'Colmado',
  SPORT_BAR = 'Sport Bar'
}

export enum MachineStatus {
  ONLINE = 'En Línea',
  OFFLINE = 'Desconectado',
  MAINTENANCE = 'Mantenimiento'
}

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  MODERATOR = 'Moderador'
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  consortiumName?: string;
  isApproved: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'connection' | 'disconnection' | 'alert';
  timestamp: string;
  read: boolean;
}

export interface AppSettings {
  appName: string;
  appLogo: string | null;
  ticketName: string;
  ticketLogo: string | null;
}

export interface JackpotConfig {
  enabled: boolean;
  currentValue: number;
  baseAmount: number;
  maxAmount: number;
  contributionPercent: number;
  lastHit: string;
}

export interface Machine {
  id: string;
  owner_id: string; // Snake case para coincidir con SQL
  name: string;
  address: string;
  phone: string;
  manager: string;
  type: string;
  status: string;
  last_sync: string;
  ip_address?: string;
  auth_token?: string;
  software_version?: string;
  ini_content: IniConfig;
}

export interface Transaction {
  id: string;
  date: string;
  machineId: string;
  machineName: string;
  type: 'BET' | 'PAYOUT';
  amount: number;
  ticketId: string;
}

export interface DashboardStats {
  totalMachines: number;
  onlineMachines: number;
  totalSales: number;
  totalPayouts: number;
  netIncome: number;
  lastSync: string;
}

export interface IniConfig {
  dog: {
    inicio: number;
    minutos: number;
    porsentaje: number;
    jack: number;
    jackweb: number;
    maxjack: number;
    maxjackweb: number;
    bono: number;
    rcd: number;
  };
  pantalla: {
    mensaje: string;
  };
}

export interface PrintData {
  bancaName: string;
  date: string;
  totalBet: number;
  totalPaid: number;
  profit: number;
}
