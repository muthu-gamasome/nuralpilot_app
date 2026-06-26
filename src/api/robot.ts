import client from './client';
import type { Hardware } from '@/lib/types';

interface RobotRaw {
  _id?: string;
  id?: string;
  hardwareName: string;
  hardwareClass?: string;
  aliasName: string;
  position?: { lat: number; lon: number; yaw?: number };
  location?: { lat: number; lon: number; yaw?: number };
  state?: string;
  battery?: number;
  lastUpdated?: string;
  sequenceId?: string | number;
  metaData?: Record<string, unknown>;
  simulated?: boolean;
  description?: string;
}

function transformRobot(robot: RobotRaw): Hardware {
  const robotPos = robot.position ?? robot.location;
  const hasValidPos =
    robotPos &&
    typeof robotPos.lat === 'number' &&
    typeof robotPos.lon === 'number' &&
    !(robotPos.lat === 0 && robotPos.lon === 0);

  const coordinates = hasValidPos
    ? { lat: robotPos!.lat, lng: robotPos!.lon }
    : undefined;

  const position = hasValidPos
    ? { lat: robotPos!.lat, lng: robotPos!.lon, yaw: robotPos!.yaw ?? 0 }
    : undefined;

  const lastUpdated = robot.lastUpdated ? new Date(robot.lastUpdated) : new Date();
  const uptimeMins = robot.lastUpdated
    ? Math.max(0, Math.floor((Date.now() - new Date(robot.lastUpdated).getTime()) / 1000 / 60))
    : 0;

  return {
    id: robot._id ?? robot.id ?? '',
    name: robot.hardwareName,
    hardwareClass: robot.hardwareClass ?? '',
    aliasName: robot.aliasName,
    status: 'offline',
    state: robot.state ?? 'Unknown',
    battery: robot.battery ?? 0,
    lastPing: lastUpdated,
    uptime: uptimeMins,
    location: robot.description ?? (robotPos ? `${robotPos.lat}, ${robotPos.lon}` : ''),
    coordinates,
    position,
    source: undefined,
    deliveryCount: 0,
    warningCount: robot.state === 'ERROR' ? 1 : 0,
    sequenceId: robot.sequenceId ?? '',
    metaData: robot.metaData,
    yaw: robotPos?.yaw ?? 0,
    online: false,
    simulated: robot.simulated ?? false,
  };
}

export const robotApi = {
  listRobots: async (): Promise<Hardware[]> => {
    const { data } = await client.get('/user/robot/list');
    const list: RobotRaw[] = (data as { data?: RobotRaw[]; robots?: RobotRaw[] }).data ??
      (data as { robots?: RobotRaw[] }).robots ??
      (Array.isArray(data) ? data : []);
    return list.map(transformRobot);
  },

  getRobot: async (robotId: string): Promise<Hardware> => {
    try {
      const { data } = await client.get(`/admin/robot/${robotId}`);
      const raw: RobotRaw = (data as { data?: RobotRaw }).data ?? data;
      return transformRobot(raw);
    } catch {
      const { data } = await client.get(`/user/robot/${robotId}`);
      const raw: RobotRaw = (data as { data?: RobotRaw }).data ?? data;
      return transformRobot(raw);
    }
  },

  updateRobot: async (payload: {
    robotId: string;
    aliasName?: string;
    description?: string;
    hardwareClass?: string;
  }): Promise<void> => {
    await client.put('/admin/robot/edit', payload);
  },
};
