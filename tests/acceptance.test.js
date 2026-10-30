import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Configure test environment before loading application
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-at-least-32-characters-long-1234567890';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.APP_ORIGIN = 'http://localhost:5173';

const { createApp } = await import('../server/app.js');
const { seedDefaultData } = await import('../server/config/db.js');
const { googleClient } = await import('../server/routes/auth.js');
const { User, Group, Journey, Counter, Message } = await import('../server/models/index.js');
const { generateSessionToken } = await import('../server/middleware/auth.js');
const { getNowIST } = await import('../server/utils/time.js');

describe('Thapar Journey Connect - Acceptance Tests', () => {
  let mongod;
  let app;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;

    await mongoose.connect(uri);
    await seedDefaultData();
    app = createApp();
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    // Clean collections between tests
    await User.deleteMany({});
    await Group.deleteMany({});
    await Journey.deleteMany({});
    await Message.deleteMany({});
    await Counter.deleteMany({});
    await Counter.create({ id: 'group_id', seq: 0 });
  });

  // Helper to create test user with token
  async function createTestStudent(overrides = {}) {
    const id = overrides.id || `user_${Math.random().toString(36).substring(7)}`;
    const email = overrides.email || `${id}@thapar.edu`;
    const user = await User.create({
      id,
      email,
      name: overrides.name || 'Test Student',
      hostel: overrides.hostel || 'Amritam Hall (Previously known as Hostel-B)',
      reliability: overrides.reliability !== undefined ? overrides.reliability : 5.0,
      joined_community: overrides.joined_community || null,
      phone: overrides.phone || '+91 9876543210'
    });
    const token = generateSessionToken(user);
    return { user, token };
  }

  // 1. Google auth with a non-thapar email (@gmail.com) -> HTTP 400
  it('1. Google auth with a non-thapar email (@gmail.com) -> HTTP 400', async () => {
    // Mock google token verification to return a personal gmail payload
    const originalVerify = googleClient.verifyIdToken;
    googleClient.verifyIdToken = async () => ({
      getPayload: () => ({
        email: 'outsider@gmail.com',
        email_verified: true,
        hd: 'gmail.com',
        name: 'Personal User'
      })
    });

    try {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid-looking-jwt-token' });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /Only official @thapar\.edu/i);
    } finally {
      googleClient.verifyIdToken = originalVerify;
    }
  });

  // 2. Google auth with payload.email_verified === false -> HTTP 400
  it('2. Google auth with payload.email_verified === false -> HTTP 400', async () => {
    const originalVerify = googleClient.verifyIdToken;
    googleClient.verifyIdToken = async () => ({
      getPayload: () => ({
        email: 'student@thapar.edu',
        email_verified: false,
        hd: 'thapar.edu',
        name: 'Unverified Student'
      })
    });

    try {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid-looking-jwt-token' });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /Only official @thapar\.edu/i);
    } finally {
      googleClient.verifyIdToken = originalVerify;
    }
  });

  // 3. Protected route without Authorization header -> HTTP 401
  it('3. Protected route without Authorization header -> HTTP 401', async () => {
    const res = await request(app).get('/api/groups/mine');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /Unauthorized/i);
  });

  // 4. Protected route with an expired or forged JWT -> HTTP 401
  it('4. Protected route with an expired or forged JWT -> HTTP 401', async () => {
    const res = await request(app)
      .get('/api/groups/mine')
      .set('Authorization', 'Bearer forged.fake.jwt-signature');

    assert.equal(res.status, 401);
    assert.match(res.body.error, /Unauthorized/i);
  });

  // 5. Student attempts to join a second Open/Confirmed group -> HTTP 409 / Single-Ride Policy error
  it('5. Student attempts to join a second Open/Confirmed group -> HTTP 409 / Single-Ride Policy error', async () => {
    const { user: student1, token: token1 } = await createTestStudent({ name: 'Student One' });
    const { user: student2 } = await createTestStudent({ name: 'Student Two' });

    const tomorrow = 'Tomorrow';

    // Student 1 has a journey and creates Group 1
    const journey1 = await Journey.create({
      id: 'j1',
      user_id: student1.id,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      hostel: student1.hostel,
      date: tomorrow,
      departure_time: '18:00',
      transport: 'Shared Cab',
      status: 'Searching'
    });

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token1}`)
      .send({ journeyId: journey1.id, pickupPoint: 'Main Gate (Near Executive Mess)' });
    assert.equal(createRes.status, 201);

    // Student 2 creates Group 2
    const group2 = await Group.create({
      id: 2,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '18:15',
      date: 'Tomorrow',
      status: 'Open',
      transport: 'Shared Cab',
      max_members: 4,
      pickup_point: 'Hostel-J Gate',
      admin_id: student2.id,
      members: [
        {
          id: 'm2',
          user_id: student2.id,
          name: student2.name,
          role: 'Group Admin',
          departure_time: '18:15'
        }
      ]
    });

    // Student 1 (already in Group 1) tries to join Group 2
    const joinRes = await request(app)
      .post(`/api/groups/${group2.id}/join`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ journeyId: journey1.id });

    // Should return 409 Conflict with Single-Ride Policy error
    assert.equal(joinRes.status, 409);
    assert.match(joinRes.body.error, /Single-Ride Policy/i);
  });

  // 6. Leaving a group within 4 hours decreases reliability by 0.3; within 30 minutes decreases by 0.8; floor is 1.0
  it('6. Leaving a group within 4 hours decreases reliability by 0.3; within 30 minutes decreases by 0.8; floor is 1.0', async () => {
    const { user: studentA, token: tokenA } = await createTestStudent({
      name: 'Rider A',
      reliability: 4.5
    });
    const { user: studentB, token: tokenB } = await createTestStudent({
      name: 'Rider B',
      reliability: 1.2
    });

    const { dateStr } = getNowIST();
    const now = new Date();

    // 6a: Under 4 hours (e.g. 2 hours from now) -> -0.3 penalty
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const time2h = `${String(twoHoursLater.getHours()).padStart(2, '0')}:${String(twoHoursLater.getMinutes()).padStart(2, '0')}`;

    const groupUnder4h = await Group.create({
      id: 101,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: time2h,
      date: dateStr,
      status: 'Open',
      transport: 'Shared Cab',
      max_members: 4,
      pickup_point: 'Main Gate (Near Executive Mess)',
      admin_id: studentA.id,
      members: [
        { id: 'm1', user_id: studentA.id, name: studentA.name, role: 'Group Admin', departure_time: time2h },
        { id: 'm2', user_id: 'other_user', name: 'Other', role: 'Member', departure_time: time2h }
      ]
    });

    const leave4hRes = await request(app)
      .post(`/api/groups/${groupUnder4h.id}/leave`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();

    assert.equal(leave4hRes.status, 200);
    assert.equal(leave4hRes.body.penaltyApplied, true);
    assert.equal(leave4hRes.body.penaltyAmount, 0.3);
    assert.equal(leave4hRes.body.newReliability, 4.2);

    // 6b: Under 30 minutes (e.g. 15 mins from now) -> -0.8 penalty, floor 1.0
    const fifteenMinsLater = new Date(now.getTime() + 15 * 60 * 1000);
    const time15m = `${String(fifteenMinsLater.getHours()).padStart(2, '0')}:${String(fifteenMinsLater.getMinutes()).padStart(2, '0')}`;

    const groupUnder30m = await Group.create({
      id: 102,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: time15m,
      date: dateStr,
      status: 'Open',
      transport: 'Shared Cab',
      max_members: 4,
      pickup_point: 'Main Gate (Near Executive Mess)',
      admin_id: studentB.id,
      members: [
        { id: 'mb1', user_id: studentB.id, name: studentB.name, role: 'Group Admin', departure_time: time15m },
        { id: 'mb2', user_id: 'other_user', name: 'Other', role: 'Member', departure_time: time15m }
      ]
    });

    const leave30mRes = await request(app)
      .post(`/api/groups/${groupUnder30m.id}/leave`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send();

    assert.equal(leave30mRes.status, 200);
    assert.equal(leave30mRes.body.penaltyApplied, true);
    assert.equal(leave30mRes.body.penaltyAmount, 0.8);
    // Student B started at 1.2. 1.2 - 0.8 = 0.4, but floor is 1.0!
    assert.equal(leave30mRes.body.newReliability, 1.0);
  });

  // 7. Attempting to add a 5th member to a Shared Cab group fails (capacity enforced)
  it('7. Attempting to add a 5th member to a Shared Cab group fails (capacity enforced)', async () => {
    const { user: student5, token: token5 } = await createTestStudent({ name: 'Student Five' });

    // Shared Cab already has 4 members
    const fullGroup = await Group.create({
      id: 200,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '19:00',
      date: 'Tomorrow',
      status: 'Open',
      transport: 'Shared Cab',
      max_members: 4,
      pickup_point: 'Main Gate',
      admin_id: 'u1',
      members: [
        { id: 'm1', user_id: 'u1', name: 'User 1', role: 'Group Admin', departure_time: '19:00' },
        { id: 'm2', user_id: 'u2', name: 'User 2', role: 'Member', departure_time: '19:00' },
        { id: 'm3', user_id: 'u3', name: 'User 3', role: 'Member', departure_time: '19:00' },
        { id: 'm4', user_id: 'u4', name: 'User 4', role: 'Member', departure_time: '19:00' }
      ]
    });

    const journey5 = await Journey.create({
      id: 'j5',
      user_id: student5.id,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      hostel: student5.hostel,
      date: 'Tomorrow',
      departure_time: '19:00',
      transport: 'Shared Cab',
      status: 'Searching'
    });

    const res = await request(app)
      .post(`/api/groups/${fullGroup.id}/join`)
      .set('Authorization', `Bearer ${token5}`)
      .send({ journeyId: journey5.id });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /capacity|full/i);
  });

  // 8. Chat history endpoint of group A requested by a non-member -> HTTP 403
  it('8. Chat history endpoint of group A requested by a non-member -> HTTP 403', async () => {
    const { token: nonMemberToken } = await createTestStudent({ name: 'Outsider Student' });

    const groupA = await Group.create({
      id: 300,
      destination_id: 'bus_stand',
      destination_name: 'Patiala Bus Stand',
      departure_time: '10:00',
      date: 'Tomorrow',
      status: 'Open',
      transport: 'Shared Cab',
      max_members: 4,
      admin_id: 'member1',
      members: [{ id: 'm1', user_id: 'member1', name: 'Member 1', role: 'Group Admin', departure_time: '10:00' }]
    });

    const res = await request(app)
      .get(`/api/groups/${groupA.id}/messages`)
      .set('Authorization', `Bearer ${nonMemberToken}`);

    assert.equal(res.status, 403);
    assert.match(res.body.error, /Forbidden/i);
  });

  // 9. Match query with Shared Cab never returns a candidate who specified Shared Auto
  it('9. Match query with Shared Cab never returns a candidate who specified Shared Auto', async () => {
    const { token: cabToken } = await createTestStudent({
      name: 'Cab Rider',
      hostel: 'Agira Hall (Previously known as Hostel-A)'
    });
    const { user: autoRider } = await createTestStudent({
      name: 'Auto Rider',
      hostel: 'Agira Hall (Previously known as Hostel-A)'
    });

    // Auto rider is already searching for Railway at 17:00
    await Journey.create({
      id: 'j_auto',
      user_id: autoRider.id,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      hostel: autoRider.hostel,
      departure_time: '17:00',
      date: 'Tomorrow',
      flexibility: 15,
      transport: 'Shared Auto',
      status: 'Searching'
    });

    // Cab rider searches for Railway at 17:00 with Shared Cab
    const matchRes = await request(app)
      .post('/api/journeys')
      .set('Authorization', `Bearer ${cabToken}`)
      .send({
        destinationId: 'railway',
        date: 'Tomorrow',
        departureTime: '17:00',
        flexibility: 15,
        transport: 'Shared Cab'
      });

    assert.equal(matchRes.status, 201);
    const matched = matchRes.body.matchedStudents || [];

    // Auto rider must NOT be included in matched results
    const foundAuto = matched.some((m) => m.student.id === autoRider.id);
    assert.equal(foundAuto, false);
  });

  // 10. Community post creation by a non-member of that community -> HTTP 403
  it('10. Community post creation by a non-member of that community -> HTTP 403', async () => {
    // Student enrolled in Jalandhar community ('jal') or none
    const { token: studentToken } = await createTestStudent({
      name: 'Jalandhar Student',
      joined_community: 'jal'
    });

    // Attempts to post in Delhi community ('del')
    const res = await request(app)
      .post('/api/communities/del/posts')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Looking for a ride to Delhi',
        content: 'Anyone travelling this Friday evening?',
        category: 'Ride Sharing'
      });

    assert.equal(res.status, 403);
    assert.match(res.body.error, /Access Denied|only verified members/i);
  });

  // 11. Group creation with a past departure time today (IST) -> HTTP 400
  it('11. Group creation with a past departure time today (IST) -> HTTP 400', async () => {
    const { user: student, token } = await createTestStudent({ name: 'Past Time Student' });

    // Create a journey with departure time set to 00:01 today (which is already past in IST during the day)
    const { dateStr } = getNowIST();
    const pastJourney = await Journey.create({
      id: 'j_past',
      user_id: student.id,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      hostel: student.hostel,
      departure_time: '00:01',
      date: dateStr,
      transport: 'Shared Cab',
      status: 'Searching'
    });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        journeyId: pastJourney.id,
        pickupPoint: 'Main Gate (Near Executive Mess)'
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /past/i);
  });
});
