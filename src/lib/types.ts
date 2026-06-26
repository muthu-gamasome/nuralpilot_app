export interface Alert {
  title: string;
  message: string;
  level: 'LOW' | 'WARNING' | 'SEVERE';
}

export interface Hardware {
  id: string;
  name: string;
  hardwareClass: string;
  aliasName: string;
  sequenceId: number | string;
  source?: string;
  location?: string;
  coordinates?: { lat: number; lng: number; yaw?: number };
  status: 'online' | 'offline' | 'warning';
  state: string;
  battery: number;
  lastPing: Date;
  speed?: number;
  deliveryCount?: number;
  uptime?: number;
  position?: { lat: number; lng: number; yaw: number };
  metaData?: Record<string, unknown>;
  warningCount?: number;
  hasAlert?: boolean;
  alerts?: Alert[];
  online?: boolean;
  simulated?: boolean;
  yaw: number;
}

export interface FleetStats {
  total: number;
  online: number;
  offline: number;
  warning: number;
  inFleet: number;
  maintenance: number;
  totalDeliveries: number;
  averageBattery: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  statusCode: number;
  data: {
    accessToken: string;
    userId: string;
    user: User;
    roleType: string;
  };
}
