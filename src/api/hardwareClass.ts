import client from './client';

export interface HardwareClass {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export const hardwareClassApi = {
  list: async (): Promise<HardwareClass[]> => {
    const { data } = await client.get('/user/hardware-class/list');
    return (data as { data?: HardwareClass[] }).data ?? (Array.isArray(data) ? data : []);
  },
};
