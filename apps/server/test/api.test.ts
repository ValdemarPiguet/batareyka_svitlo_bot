import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApi } from '../src/api';
import { signInitData } from '../src/auth';
import { setup, TG } from './helpers';

const TOKEN = '123:abc';
const initData = () =>
  signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: TG, first_name: 'V' }) }, TOKEN);

async function app() {
  const s = await setup();
  const a = express();
  a.use('/api', createApi(s.service, TOKEN));
  return { a, ...s };
}

describe('api', () => {
  it('rejects requests without valid initData', async () => {
    const { a } = await app();
    await request(a).get('/api/me').expect(401);
  });

  it('returns profile and devices', async () => {
    const { a } = await app();
    const res = await request(a).get('/api/me').set('x-telegram-init-data', initData()).expect(200);
    expect(res.body.home.batteryWh).toBe(5000);
    expect(res.body.devices).toHaveLength(7);
  });

  it('creates, updates and deletes a device', async () => {
    const { a } = await app();
    const h = { 'x-telegram-init-data': initData() };
    const created = await request(a)
      .post('/api/devices')
      .set(h)
      .send({ name: 'Ноутбук', mode: 'constant', avgW: 50, peakW: 90, priority: 2, order: 5, enabled: true })
      .expect(201);
    const id = created.body.device.id;
    await request(a).put(`/api/devices/${id}`).set(h).send({ enabled: false }).expect(200);
    await request(a).delete(`/api/devices/${id}`).set(h).expect(200);
    await request(a).post('/api/devices').set(h).send({ name: '' }).expect(400);
  });

  it('updates the home and computes a plan', async () => {
    const { a } = await app();
    const h = { 'x-telegram-init-data': initData() };
    await request(a).put('/api/home').set(h).send({ batteryWh: 5120, inverterMaxW: 6000 }).expect(200);
    const res = await request(a).post('/api/plan').set(h).send({ socPct: 80, powerOnInMin: 240 }).expect(200);
    expect(res.body.outcome.kind).toBe('ok');
    expect(res.body.outcome.result.peakWarnings).toEqual([]);
  });
});
