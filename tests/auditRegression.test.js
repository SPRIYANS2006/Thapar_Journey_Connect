import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'audit-regression-session-secret-32-characters';
const { createApp } = await import('../server/app.js');
const { User, Group, CityRide, Destination, Counter } = await import('../server/models/index.js');
const { generateSessionToken } = await import('../server/middleware/auth.js');
const { setSocketIO } = await import('../server/services/notifications.js');
const { validateTravelDateTime } = await import('../server/utils/time.js');
const { SafetyReport } = await import('../server/routes/safety.js');
const date = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
describe('Audit regressions', () => {
  let db, app, user, token;
  before(async () => { db = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(db.getUri()); app = createApp(); });
  after(async () => { setSocketIO(null); await mongoose.disconnect(); await db.stop(); });
  beforeEach(async () => {
    setSocketIO(null);
    for (const collection of Object.values(mongoose.connection.collections)) await collection.deleteMany({});
    await Counter.create({ id: 'group_id', seq: 0 });
    await Destination.create({ id: 'railway', name: 'Station', icon: '🚆', description: 'Station', distance: '8 km', popular_time: 'Evening', avg_cab_fare: '₹200 total' });
    user = await User.create({ id: 'rider', name: 'Rider', email: 'rider@thapar.edu' });
    token = generateSessionToken(user);
  });
  const post = (path, body) => request(app).post(path).set('Authorization', `Bearer ${token}`).send(body);
  const slot = time => ({ destinationId: 'railway', date, time, vehicle: 'Shared Cab' });
  async function group(overrides = {}) {
    return Group.create({ id: 'original', destination_id: 'railway', destination_name: 'Station', date, departure_time: '12:00', admin_id: user.id,
      members: [{ id: 'member', user_id: user.id, name: user.name, role: 'Group Admin' }], ...overrides });
  }
  it('concurrent joins to different slots leave exactly one active membership', async () => {
    const results = await Promise.all([post('/api/slots/join', slot('12:00')), post('/api/slots/join', slot('13:00'))]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    assert.equal(await Group.countDocuments({ 'members.user_id': user.id }), 1);
  });
  it('malformed date, clock and off-grid times fail before creating groups', async () => {
    for (const data of [{ ...slot('garbage') }, { ...slot('25:00') }, { ...slot('12:07') }, { ...slot('12:00'), date: '2027-02-31' }]) {
      const result = await post('/api/slots/join', data); assert.equal(result.status, 400, JSON.stringify(result.body));
    }
    assert.equal(await Group.countDocuments(), 0);
    assert.equal(validateTravelDateTime(date, 'nope').valid, false);
  });
  it('outward and return at the same time are not reported as already joined', async () => {
    assert.equal((await post('/api/slots/join', slot('12:00'))).status, 201);
    const result = await post('/api/slots/join', { ...slot('12:00'), direction: 'returning' });
    assert.equal(result.status, 409); assert.notEqual(result.body.alreadyMember, true);
  });
  it('authenticated slot list recognizes the current member and auto capacity', async () => {
    await post('/api/slots/join', { ...slot('12:00'), vehicle: 'Shared Auto' });
    const result = await request(app).get('/api/slots').query({ destinationId: 'railway', date, vehicle: 'Shared Auto' }).set('Authorization', `Bearer ${token}`);
    const selected = result.body.slots.find(s => s.time === '12:00');
    assert.equal(selected.isJoined, true); assert.equal(selected.maxSeats, 3);
  });
  it('reschedule rejects companions without stranding any party members', async () => {
    await group({ members: [{ user_id: user.id, name: 'Rider' }, { user_id: 'friend', name: 'Friend', is_companion: true, added_by: user.id }] });
    const result = await post('/api/slots/reschedule', { oldGroupId: 'original', targetDate: date, targetTime: '13:00' });
    assert.equal(result.status, 409); assert.equal((await Group.findOne({ id: 'original' })).members.length, 2);
  });
  it('failure after source removal rolls back both source and target', async () => {
    await group();
    const original = User.updateOne;
    User.updateOne = function(filter, update, ...args) {
      if (update?.$set?.reliability !== undefined) throw new Error('Injected reservation failure');
      return original.call(this, filter, update, ...args);
    };
    try {
      const result = await post('/api/slots/reschedule', { oldGroupId: 'original', targetDate: date, targetTime: '13:00' });
      assert.equal(result.status, 500);
      assert.equal((await Group.findOne({ id: 'original' })).members[0].user_id, user.id);
      assert.equal(await Group.countDocuments(), 1);
    } finally { User.updateOne = original; }
  });
  it('leaving a completed ride cannot lower reliability', async () => {
    await group({ status: 'Completed' });
    assert.equal((await post('/api/groups/original/leave', {})).status, 409);
    assert.equal((await User.findOne({ id: user.id })).reliability, 5);
  });
  it('leaving evicts all the account sockets from the private group', async () => {
    await group({ members: [{ user_id: user.id, name: 'Rider' }, { user_id: 'other', name: 'Other' }] });
    const left = [];
    setSocketIO({ to: () => ({ emit() {} }), sockets: { adapter: { rooms: new Map([[`user_${user.id}`, new Set(['one', 'two'])]]) }, sockets: new Map(['one', 'two'].map(id => [id, { leave: room => left.push(room) }])) } });
    assert.equal((await post('/api/groups/original/leave', {})).status, 200);
    assert.deepEqual(left, ['group_original', 'group_original']);
  });
  it('profile settings survive a new session fetch', async () => {
    const saved = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ rollNumber: '1234', preferredTransport: 'Auto', timeWindow: 'Every 30 Minutes', frequentRoutes: ['Delhi'], rideNotifications: false });
    assert.equal(saved.status, 200);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.body.user.rollNumber, '1234'); assert.equal(me.body.user.rideNotifications, false); assert.deepEqual(me.body.user.frequentRoutes, ['Delhi']);
  });
  it('alternate city join cannot reopen a completed ride', async () => {
    await CityRide.create({ id: 'closed', community_id: 'del', community_name: 'Delhi', creator_id: 'other', creator_name: 'Other', destination: 'Delhi', date, time: '12:00', mode: 'Cab', status: 'Completed', members: [] });
    const result = await post('/api/groups/closed/join', {});
    assert.equal(result.status, 409);
    assert.equal((await CityRide.findOne({ id: 'closed' })).members.length, 0);
  });
  it('support reports are private to the reporter and administrators', async () => {
    const report = await post('/api/safety/reports', { category: 'Rating appeal', details: 'Emergency cancellation review requested.' });
    assert.equal(report.status, 201);
    const outsider = await User.create({ id: 'other', email: 'other@thapar.edu', name: 'Other' });
    const list = await request(app).get('/api/safety/reports').set('Authorization', `Bearer ${generateSessionToken(outsider)}`);
    assert.deepEqual(list.body, []); assert.equal(await SafetyReport.countDocuments(), 1);
  });
  it('only the owner may preview a reschedule penalty', async () => {
    await group({ members: [{ user_id: 'other', name: 'Other' }] });
    assert.equal((await post('/api/slots/reschedule/preview', { oldGroupId: 'original' })).status, 403);
  });
  it('invalid profile phone does not change existing ride contacts', async () => {
    await group({ members: [{ user_id: user.id, name: 'Rider', phone: '9876543210' }] });
    const result = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ phone: 'invalid' });
    assert.equal(result.status, 400); assert.equal((await Group.findOne({ id: 'original' })).members[0].phone, '9876543210');
  });
  it('muted users persist and can be unmuted', async () => {
    await User.create({ id: 'other', email: 'other@thapar.edu', name: 'Other' });
    const mute = value => request(app).put('/api/safety/mute').set('Authorization', `Bearer ${token}`).send({ userId: 'other', muted: value });
    assert.equal((await mute(true)).status, 200); assert.deepEqual((await User.findOne({ id: user.id })).muted_users.toObject(), ['other']);
    assert.equal((await mute(false)).status, 200); assert.equal((await User.findOne({ id: user.id })).muted_users.length, 0);
  });
});
