import type { Device } from '@batareyka/calc';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { HomeDoc, PlanDoc, ReadingDoc, Store, UserDoc } from './types';

/**
 * Структура как в спеке:
 * users/{tgId}, users/{tgId}/homes/{homeId},
 * homes/{homeId}/devices/{id}, homes/{homeId}/readings, homes/{homeId}/plans.
 */
export class FirestoreStore implements Store {
  constructor(private readonly db: Firestore) {}

  static fromServiceAccountJson(json: string): FirestoreStore {
    const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(json)) });
    const db = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });
    return new FirestoreStore(db);
  }

  private user(tgId: number) {
    return this.db.collection('users').doc(String(tgId));
  }

  async getUser(tgId: number) {
    const snap = await this.user(tgId).get();
    return snap.exists ? (snap.data() as UserDoc) : null;
  }
  async saveUser(user: UserDoc) {
    await this.user(user.tgId).set(user, { merge: true });
  }
  async getHome(tgId: number) {
    const snap = await this.user(tgId).collection('homes').limit(1).get();
    const doc = snap.docs[0];
    return doc ? ({ ...(doc.data() as HomeDoc), id: doc.id }) : null;
  }
  async saveHome(tgId: number, home: HomeDoc) {
    await this.user(tgId).collection('homes').doc(home.id).set(home, { merge: true });
  }
  private home(homeId: string) {
    return this.db.collection('homes').doc(homeId);
  }
  async listDevices(homeId: string) {
    const snap = await this.home(homeId).collection('devices').get();
    return snap.docs.map((d) => ({ ...(d.data() as Device), id: d.id }));
  }
  async saveDevice(homeId: string, device: Device) {
    await this.home(homeId).collection('devices').doc(device.id).set(device);
  }
  async deleteDevice(homeId: string, deviceId: string) {
    await this.home(homeId).collection('devices').doc(deviceId).delete();
  }
  async addReading(homeId: string, reading: ReadingDoc) {
    await this.home(homeId).collection('readings').add(reading);
  }
  async addPlan(homeId: string, plan: PlanDoc) {
    await this.home(homeId).collection('plans').add(plan);
  }
}
