import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'audit-regression-session-secret-32-characters';
const { createApp } = await import('../server/app.js');
const { User, Group, CityRide, Destination, Counter, TravelGroup, TravelGroupMessage, Community } = await import('../server/models/index.js');
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
  async function travel(type = 'Train', overrides = {}) {
    return TravelGroup.create({ id: `tg_${type}`, type, title: `${type} to Delhi`, community_id: 'del', community_name: 'Delhi', creator_id: 'host', creator_name: 'Host', date, departure_time: '13:00', boarding_point: 'Patiala', destination: 'Delhi', train_number: type === 'Train' ? '12006 Shatabdi' : '', bus_operator: type === 'Bus' ? 'PRTC' : '', members: [{ user_id: 'host', name: 'Host', role: 'Admin' }], ...overrides });
  }
  it('replaying logout with a revoked token preserves a later session', async () => {
    assert.equal((await post('/api/auth/logout', {})).status, 200);
    const current = generateSessionToken(await User.findOne({ id: user.id }));
    assert.equal((await post('/api/auth/logout', {})).status, 200);
    const me = await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + current);
    assert.equal(me.status, 200);
  });
  it('a malformed cookie gets an authentication error', async () => {
    const me = await request(app).get('/api/auth/me').set('Cookie', 'token=%ZZ');
    assert.equal(me.status, 401);
  });
  it('travel chat returns the newest 300 messages in reading order', async () => {
    const group = await travel('Bus', { members: [{ user_id: user.id, name: user.name }] });
    await TravelGroupMessage.insertMany(Array.from({ length: 301 }, (_, i) => ({
      group_id: group.id, sender_id: user.id, sender_name: user.name, text: String(i), created_at: new Date(1000 * i)
    })));
    const response = await request(app).get('/api/travel-groups/' + group.id + '/messages').set('Authorization', 'Bearer ' + token);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.map(message => message.text), Array.from({ length: 300 }, (_, i) => String(i + 1)));
  });
  it('opens another group at the same departure after three members join', async () => {
    const first = await post('/api/slots/join', slot('12:00'));
    const users = await User.create(Array.from({length: 4}, (_, i) => ({
      id: 'overflow-' + i, name: 'Overflow ' + i, email: 'overflow' + i + '@thapar.edu'
    })));
    const join = student => request(app).post('/api/slots/join')
      .set('Authorization', 'Bearer ' + generateSessionToken(student)).send(slot('12:00'));
    for (const student of users.slice(0, 2)) assert.equal((await join(student)).status, 200);
    const listed = await request(app).get('/api/slots').query({destinationId: 'railway', date, vehicle: 'Shared Cab'});
    assert.equal(listed.body.slots.find(s => s.time === '12:00').seatsFilled, 0);
    const results = await Promise.all(users.slice(2).map(join));
    for (const result of results) assert.ok([200, 201].includes(result.status), JSON.stringify(result.body));
    const groups = await Group.find({ departure_time: '12:00' });
    assert.equal(groups.length, 2);
    assert.deepEqual(groups.map(g => g.members.length).sort(), [2, 3]);
    assert.equal((await Group.findOne({ id: first.body.group.id })).members.length, 3);
  });
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
    const day = offset => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    assert.equal(validateTravelDateTime(day(30), '23:59').valid, true);
    assert.equal(validateTravelDateTime(day(31), '00:00').valid, false);
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
  it('profile hostel changes propagate to cab, city and train memberships', async () => {
    await group();
    await travel('Train', { members: [{ user_id: user.id, name: user.name, hostel: 'Old hostel' }] });
    await CityRide.create({ id: 'city', community_id: 'del', community_name: 'Delhi', creator_id: user.id, creator_name: user.name, destination: 'Delhi', date, time: '12:00', mode: 'Cab', members: [{ user_id: user.id, name: user.name, hostel: 'Old hostel' }] });
    const result = await request(app).put('/api/auth/profile').set('Authorization', 'Bearer ' + token).send({ hostel: 'Hostel J' });
    assert.equal(result.status, 200);
    for (const Model of [Group, CityRide, TravelGroup]) {
      const trip = await Model.findOne({ 'members.user_id': user.id });
      assert.equal(trip.members.find(member => member.user_id === user.id).hostel, 'Hostel J');
    }
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
  it('the unified journey feed requires authentication', async () => {
    assert.equal((await request(app).get('/api/my-journeys')).status, 401);
  });
  it('My Journeys combines campus rides, confirmed city cabs, trains and buses without exposing other memberships', async () => {
    await group();
    await CityRide.create({ id: 'city', community_id: 'del', community_name: 'Delhi', creator_id: user.id, creator_name: user.name, origin: 'Delhi', destination: 'Thapar', date, time: '09:00', direction: 'returning', mode: 'Cab', status: 'Confirmed', members: [{ user_id: user.id, name: user.name }] });
    await travel('Train', { members: [{ user_id: user.id, name: user.name }] });
    await travel('Bus', { departure_time: '18:00', members: [{ user_id: user.id, name: user.name }] });
    await travel('Train', { id: 'tg_other' });
    const result = await request(app).get('/api/my-journeys').set('Authorization', `Bearer ${token}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.upcoming.map(item => item.id), ['city', 'original', 'tg_Train', 'tg_Bus']);
    assert.deepEqual(result.body.upcoming.map(item => item.mode), ['Cab', 'Cab', 'Train', 'Bus']);
    assert.equal(result.body.upcoming[0].origin, 'Delhi'); assert.equal(result.body.upcoming[0].direction, 'returning');
    assert.equal(result.body.upcoming[0].status, 'Confirmed'); assert.equal(result.body.past.length, 0);
  });
  it('joining a train moves it from discovery to My Journeys and leaving reverses it', async () => {
    const trip = await travel();
    const discovery = () => request(app).get('/api/travel-groups?communityId=del&type=Train&excludeJoined=true').set('Authorization', `Bearer ${token}`);
    const mine = () => request(app).get('/api/my-journeys').set('Authorization', `Bearer ${token}`);
    assert.equal((await discovery()).body.length, 1);
    assert.equal((await post(`/api/travel-groups/${trip.id}/join`, {})).status, 200);
    assert.equal((await discovery()).body.length, 0);
    assert.equal((await mine()).body.upcoming[0].id, trip.id);
    assert.equal((await post(`/api/travel-groups/${trip.id}/leave`, {})).status, 200);
    assert.equal((await mine()).body.upcoming.length, 0); assert.equal((await discovery()).body.length, 1);
  });
  it('creating a bus adds it directly to My Journeys and hides it from the creator discovery list', async () => {
    await Community.create({ id: 'del', name: 'Delhi', state: 'Delhi' });
    const result = await post('/api/travel-groups', { type: 'Bus', title: 'PRTC to Delhi', communityId: 'del', date, departureTime: '18:00', boardingPoint: 'Patiala Bus Stand', destination: 'Delhi', busOperator: 'PRTC' });
    assert.equal(result.status, 201);
    const mine = await request(app).get('/api/my-journeys').set('Authorization', `Bearer ${token}`);
    assert.equal(mine.body.upcoming[0].mode, 'Bus'); assert.equal(mine.body.upcoming[0].id, result.body.group.id);
    const discovery = await request(app).get('/api/travel-groups?type=Bus&excludeJoined=true').set('Authorization', `Bearer ${token}`);
    assert.deepEqual(discovery.body, []);
  });
  it('past train journeys stay in history but cannot be joined through discovery or direct requests', async () => {
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    await travel('Train', { date: yesterday, members: [{ user_id: user.id, name: user.name }] });
    const past = await travel('Bus', { date: yesterday });
    const mine = await request(app).get('/api/my-journeys').set('Authorization', `Bearer ${token}`);
    assert.equal(mine.body.past[0].id, 'tg_Train'); assert.equal(mine.body.upcoming.length, 0);
    assert.equal((await request(app).get('/api/travel-groups').set('Authorization', `Bearer ${token}`)).body.length, 0);
    assert.equal((await post(`/api/travel-groups/${past.id}/join`, {})).status, 409);
  });
  it('leaving a travel group notifies all of the account sessions to refresh My Journeys', async () => {
    const trip = await travel('Train', { members: [{ user_id: 'host', name: 'Host', role: 'Admin' }, { user_id: user.id, name: user.name }] });
    const events = [];
    setSocketIO({ to: room => ({ emit: (event, payload) => events.push({ room, event, payload }) }), sockets: { adapter: { rooms: new Map() } } });
    assert.equal((await post(`/api/travel-groups/${trip.id}/leave`, {})).status, 200);
    assert.ok(events.some(event => event.room === `user_${user.id}` && event.event === 'journeys_updated'));
  });
});
