import type { Device } from '../../../../packages/calc/src/index.js';
import type { HomeDoc, PlanDoc, ReadingDoc, Store, UserDoc } from './types.js';

export class MemoryStore implements Store {
  users = new Map<number, UserDoc>();
  homes = new Map<number, HomeDoc>();
  devices = new Map<string, Map<string, Device>>();
  readings = new Map<string, ReadingDoc[]>();
  plans = new Map<string, PlanDoc[]>();

  async getUser(tgId: number) {
    return this.users.get(tgId) ?? null;
  }
  async saveUser(user: UserDoc) {
    this.users.set(user.tgId, { ...user });
  }
  async getHome(tgId: number) {
    return this.homes.get(tgId) ?? null;
  }
  async saveHome(tgId: number, home: HomeDoc) {
    this.homes.set(tgId, { ...home });
  }
  async listDevices(homeId: string) {
    return [...(this.devices.get(homeId)?.values() ?? [])].map((d) => ({ ...d }));
  }
  async saveDevice(homeId: string, device: Device) {
    if (!this.devices.has(homeId)) this.devices.set(homeId, new Map());
    this.devices.get(homeId)!.set(device.id, { ...device });
  }
  async deleteDevice(homeId: string, deviceId: string) {
    this.devices.get(homeId)?.delete(deviceId);
  }
  async addReading(homeId: string, reading: ReadingDoc) {
    this.readings.set(homeId, [...(this.readings.get(homeId) ?? []), reading]);
  }
  async addPlan(homeId: string, plan: PlanDoc) {
    this.plans.set(homeId, [...(this.plans.get(homeId) ?? []), plan]);
  }
}
