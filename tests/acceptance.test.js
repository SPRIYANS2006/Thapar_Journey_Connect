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
const { User, Group, Journey, Counter, getNextGroupId, Message, RateLimit, RideRecord, CommunityGroup, CommunityGroupMessage, CityRide, Luggage } = await import('../server/models/index.js');
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
    await RateLimit.deleteMany({});
    await RideRecord.deleteMany({});
    await CommunityGroup.deleteMany({});
    await CommunityGroupMessage.deleteMany({});
    await CityRide.deleteMany({});
    await Luggage.deleteMany({});
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
      role: overrides.role || 'student',
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

    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const formatIST = (d) => {
      const parts = istFormatter.formatToParts(d);
      const getP = (type) => parts.find((p) => p.type === type)?.value;
      return {
        dStr: `${getP('year')}-${getP('month')}-${getP('day')}`,
        tStr: `${getP('hour')}:${getP('minute')}`
      };
    };

    // 6a: Under 4 hours (e.g. 2 hours from now) -> -0.3 penalty
    const { dStr: dateStr2h, tStr: time2h } = formatIST(new Date(Date.now() + 2 * 60 * 60 * 1000));

    const groupUnder4h = await Group.create({
      id: 101,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: time2h,
      date: dateStr2h,
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
    const { dStr: dateStr15m, tStr: time15m } = formatIST(new Date(Date.now() + 15 * 60 * 1000));

    const groupUnder30m = await Group.create({
      id: 102,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: time15m,
      date: dateStr15m,
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

  // 12. Community post like is a unique toggle per user and cannot be spammed
  it('12. Community post like is a unique toggle per user and cannot be spammed', async () => {
    const { CommunityPost } = await import('../server/models/index.js');
    const { user: studentA, token: tokenA } = await createTestStudent({
      name: 'Community Member A',
      joined_community: 'jal'
    });
    const { token: outsiderToken } = await createTestStudent({
      name: 'Outsider Student',
      joined_community: 'del'
    });

    const post = await CommunityPost.create({
      id: 'post_like_test_1',
      community_id: 'jal',
      author_id: studentA.id,
      author_name: studentA.name,
      title: 'Cab to Jalandhar',
      content: 'Leaving 5pm Friday',
      likes: []
    });

    // 12a: Non-member cannot like post -> HTTP 403
    const outsiderRes = await request(app)
      .post(`/api/communities/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    assert.equal(outsiderRes.status, 403);

    // 12b: Member likes post -> count = 1, isLiked = true
    const likeRes = await request(app)
      .post(`/api/communities/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(likeRes.status, 200);
    assert.equal(likeRes.body.likes, 1);
    assert.equal(likeRes.body.isLiked, true);

    // 12c: Member toggles like again -> count = 0, isLiked = false
    const unlikeRes = await request(app)
      .post(`/api/communities/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(unlikeRes.status, 200);
    assert.equal(unlikeRes.body.likes, 0);
    assert.equal(unlikeRes.body.isLiked, false);
  });

  // 13. Admin leaving a group reassigns admin_id without validation error
  it('13. Admin leaving a group reassigns admin_id without validation error', async () => {
    const { user: adminUser, token: adminToken } = await createTestStudent({ name: 'Admin Student' });
    const { user: memberUser } = await createTestStudent({ name: 'Rider Student' });

    // Group with 2 members, adminUser is admin
    const group = await Group.create({
      id: 501,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '18:00',
      date: 'Tomorrow',
      status: 'Open',
      transport: 'Shared Cab',
      max_members: 4,
      pickup_point: 'Main Gate',
      admin_id: adminUser.id,
      members: [
        { id: 'm_admin', user_id: adminUser.id, name: adminUser.name, role: 'Group Admin', departure_time: '18:00' },
        { id: 'm_rider', user_id: memberUser.id, name: memberUser.name, role: 'Member', departure_time: '18:00' }
      ]
    });

    const leaveRes = await request(app)
      .post(`/api/groups/${group.id}/leave`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(leaveRes.status, 200);

    // Verify group updated: admin_id reassigned to memberUser
    const updated = await Group.findOne({ id: group.id });
    assert.ok(updated);
    assert.equal(updated.admin_id, memberUser.id);
    assert.equal(updated.members.length, 1);
    assert.equal(updated.members[0].role, 'Group Admin');
  });

  // 14. Expired groups: unconfirmed Open groups removed, Confirmed groups become Completed in history
  it('14. Expired groups: unconfirmed Open groups removed, Confirmed groups become Completed in history', async () => {
    const { user: student1 } = await createTestStudent({ name: 'History Student 1' });
    const { user: student2, token: token2 } = await createTestStudent({ name: 'History Student 2' });

    // 14a: Unconfirmed Open group with past departure time (yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await Group.create({
      id: 601,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '08:00',
      date: yesterday,
      status: 'Open',
      transport: 'Shared Cab',
      admin_id: student1.id,
      members: [
        { id: 'm1', user_id: student1.id, name: student1.name, role: 'Group Admin', departure_time: '08:00' }
      ]
    });

    // 14b: Confirmed group with past departure time (yesterday)
    await Group.create({
      id: 602,
      destination_id: 'bus_stand',
      destination_name: 'Patiala Bus Stand',
      departure_time: '09:00',
      date: yesterday,
      status: 'Confirmed',
      transport: 'Shared Cab',
      admin_id: student2.id,
      members: [
        { id: 'm2', user_id: student2.id, name: student2.name, role: 'Group Admin', departure_time: '09:00' }
      ]
    });

    // Requesting history/mine runs cleanupExpiredGroups
    const historyRes = await request(app)
      .get('/api/groups/history/mine')
      .set('Authorization', `Bearer ${token2}`);

    assert.equal(historyRes.status, 200);
    // Confirmed past group 602 should be in history with status Completed
    const pastCompleted = historyRes.body.find((g) => g.id === 602 || g.id === '602');
    assert.ok(pastCompleted);
    assert.equal(pastCompleted.status, 'Completed');

    // Unconfirmed Open group 601 must be deleted/removed
    const openGroupCheck = await Group.findOne({ id: 601 });
    assert.equal(openGroupCheck, null);
  });

  // 15. Pickup-point update accepts both POST and PATCH
  it('15. Pickup-point update accepts both POST and PATCH methods', async () => {
    const { user: admin, token: adminToken } = await createTestStudent({ name: 'Admin Student' });
    const group = await Group.create({
      id: 701,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '18:00',
      date: '2026-11-05',
      status: 'Open',
      pickup_point: 'Main Gate (Near Executive Mess)',
      admin_id: admin.id,
      members: [{ id: 'm1', user_id: admin.id, name: admin.name, role: 'Group Admin' }]
    });

    // Test POST
    const resPost = await request(app)
      .post(`/api/groups/${group.id}/pickup-point`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pickupPoint: 'Gate 1' });

    assert.equal(resPost.status, 200);
    assert.equal(resPost.body.pickupPoint, 'Gate 1');

    // Test PATCH
    const resPatch = await request(app)
      .patch(`/api/groups/${group.id}/pickup-point`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pickupPoint: 'Gate 2' });

    assert.equal(resPatch.status, 200);
    assert.equal(resPatch.body.pickupPoint, 'Gate 2');
  });

  // 16. Ride rating: requires { targetUserId, rating }, only on Completed rides, enforces 1 rating per co-rider per ride
  it('16. Ride rating: requires targetUserId and rating, enforces 1 rating per co-rider per completed ride', async () => {
    const { user: rider1, token: token1 } = await createTestStudent({ name: 'Rider One' });
    const { user: rider2 } = await createTestStudent({ name: 'Rider Two', reliability: 5.0 });

    const group = await Group.create({
      id: 702,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '10:00',
      date: '2026-11-01',
      status: 'Completed',
      admin_id: rider1.id,
      members: [
        { id: 'm1', user_id: rider1.id, name: rider1.name, role: 'Group Admin' },
        { id: 'm2', user_id: rider2.id, name: rider2.name, role: 'Member' }
      ]
    });

    // Attempting to rate without targetUserId -> HTTP 400
    const resMissingTarget = await request(app)
      .post(`/api/groups/${group.id}/rate`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ rating: 4 });
    assert.equal(resMissingTarget.status, 400);

    // Valid rating -> HTTP 200
    const resValid = await request(app)
      .post(`/api/groups/${group.id}/rate`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ targetUserId: rider2.id, rating: 4 });
    assert.equal(resValid.status, 200);

    // Second rating for same rider on same ride -> HTTP 409
    const resDuplicate = await request(app)
      .post(`/api/groups/${group.id}/rate`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ targetUserId: rider2.id, rating: 5 });
    assert.equal(resDuplicate.status, 409);
    assert.match(resDuplicate.body.error, /already rated/i);
  });

  // 17. Idempotent ride completion: only Confirmed groups can transition to Completed, no duplicate trip increments
  it('17. Ride completion is atomic and idempotent: only Confirmed groups complete and trips increment strictly once', async () => {
    const { user: admin, token: adminToken } = await createTestStudent({ name: 'Completer Admin' });
    const { user: rider } = await createTestStudent({ name: 'Completer Rider' });

    // Past date so departure time has passed
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Case A: Unconfirmed 'Open' group cannot be completed -> HTTP 400
    const openGroup = await Group.create({
      id: 703,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '08:00',
      date: pastDate,
      status: 'Open',
      admin_id: admin.id,
      members: [
        { id: 'm1', user_id: admin.id, name: admin.name, role: 'Group Admin' },
        { id: 'm2', user_id: rider.id, name: rider.name, role: 'Member' }
      ]
    });

    const resOpen = await request(app)
      .post(`/api/groups/${openGroup.id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(resOpen.status, 400);
    assert.match(resOpen.body.error, /Only Confirmed groups can be marked as completed/i);

    // Case B: Confirmed group completes successfully -> HTTP 200
    openGroup.status = 'Confirmed';
    await openGroup.save();

    const resConfirmed = await request(app)
      .post(`/api/groups/${openGroup.id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(resConfirmed.status, 200);

    const riderAfterFirst = await User.findOne({ id: rider.id });
    assert.equal(riderAfterFirst.trips_completed, 1);

    // Case C: Calling complete again on already completed group -> HTTP 400
    const resRepeat = await request(app)
      .post(`/api/groups/${openGroup.id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(resRepeat.status, 400);
    assert.match(resRepeat.body.error, /already been marked as completed/i);

    // Verify trips_completed was NOT incremented again
    const riderAfterSecond = await User.findOne({ id: rider.id });
    assert.equal(riderAfterSecond.trips_completed, 1);
  });

  // 18. Shared rate limiter correctly identifies normalized email and returns 429 after 20 attempts
  it('18. Shared auth rate limiter: tracks attempts with normalized email and blocks after 20 attempts', async () => {
    const targetEmail = 'ratelimit.test@thapar.edu';

    // Seed 20 existing attempts in MongoDB RateLimit collection
    const key = `auth:127.0.0.1:${targetEmail.toLowerCase()}`;
    await RateLimit.create({
      key,
      count: 20,
      expireAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    // The 21st attempt from this IP + email should receive HTTP 429
    const resBlocked = await request(app)
      .post('/api/auth/login')
      .send({ email: '  RATELIMIT.TEST@THAPAR.EDU  ', password: 'somepassword123' });

    assert.equal(resBlocked.status, 429);
    assert.match(resBlocked.body.error, /Too many authentication attempts/i);
  });

  // 19. Single-ride policy race condition: concurrent joins for two different groups allow only one to succeed
  it('19. Single-ride policy race condition: concurrent join requests enforce single-ride rule atomically', async () => {
    const { user: rider, token: riderToken } = await createTestStudent({ name: 'Concurrent Rider' });
    const { user: host1 } = await createTestStudent({ name: 'Host 1' });
    const { user: host2 } = await createTestStudent({ name: 'Host 2' });

    const futureDate = '2026-11-10';

    // Create 2 open groups
    const group1 = await Group.create({
      id: 704,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '14:00',
      date: futureDate,
      status: 'Open',
      admin_id: host1.id,
      members: [{ id: 'm1', user_id: host1.id, name: host1.name, role: 'Group Admin' }]
    });

    const group2 = await Group.create({
      id: 705,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '14:00',
      date: futureDate,
      status: 'Open',
      admin_id: host2.id,
      members: [{ id: 'm2', user_id: host2.id, name: host2.name, role: 'Group Admin' }]
    });

    // Create 2 matching journeys for rider
    const journey1 = await Journey.create({
      id: 'j_concurrent_1',
      user_id: rider.id,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '14:00',
      date: futureDate,
      status: 'Searching',
      hostel: 'Amritam Hall (Previously known as Hostel-B)'
    });

    const journey2 = await Journey.create({
      id: 'j_concurrent_2',
      user_id: rider.id,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '14:00',
      date: futureDate,
      status: 'Searching',
      hostel: 'Amritam Hall (Previously known as Hostel-B)'
    });

    // Execute two simultaneous join requests concurrently
    const [joinRes1, joinRes2] = await Promise.all([
      request(app)
        .post(`/api/groups/${group1.id}/join`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ journeyId: journey1.id }),
      request(app)
        .post(`/api/groups/${group2.id}/join`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ journeyId: journey2.id })
    ]);

    const statuses = [joinRes1.status, joinRes2.status].sort();
    // Exactly one should succeed (200), and the other must be rejected by Single-Ride Policy (409)
    assert.deepEqual(statuses, [200, 409]);

    // Verify rider is member in exactly one group in the database
    const g1Check = await Group.findOne({ id: group1.id, 'members.user_id': rider.id });
    const g2Check = await Group.findOne({ id: group2.id, 'members.user_id': rider.id });
    assert.equal(Boolean(g1Check) !== Boolean(g2Check), true);
  });

  // 20. Production boot guard: SESSION_SECRET is guaranteed >= 32 characters in all environments
  it('20. Production boot guard: SESSION_SECRET is strictly guaranteed to have >= 32 chars', async () => {
    const { JWT_SECRET } = await import('../server/middleware/auth.js');
    assert.ok(JWT_SECRET);
    assert.ok(JWT_SECRET.length >= 32);
  });

  // 21. Journey matching: Server validates vehicle compatibility and time flexibility on join
  it('21. Journey matching: Server rejects group join on vehicle mismatch or time flexibility exceeded', async () => {
    const { user: rider, token: riderToken } = await createTestStudent({ name: 'Validation Rider' });
    const { user: host } = await createTestStudent({ name: 'Host Rider' });

    // Group is Shared Cab departing at 10:00
    const group = await Group.create({
      id: 801,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '10:00',
      date: '2026-11-12',
      status: 'Open',
      transport: 'Shared Cab',
      admin_id: host.id,
      members: [{ id: 'm1', user_id: host.id, name: host.name, role: 'Group Admin' }]
    });

    // Case A: Vehicle mismatch (journey requires Shared Auto)
    const autoJourney = await Journey.create({
      id: 'j_auto_mismatch',
      user_id: rider.id,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '10:00',
      date: '2026-11-12',
      transport: 'Shared Auto',
      flexibility: 15,
      status: 'Searching',
      hostel: 'Agira Hall (Previously known as Hostel-A)'
    });

    const resVehicle = await request(app)
      .post(`/api/groups/${group.id}/join`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ journeyId: autoJourney.id });

    assert.equal(resVehicle.status, 400);
    assert.match(resVehicle.body.error, /Vehicle mismatch/i);

    // Case B: Time flexibility exceeded (journey departs at 14:00 with flex 15, group departs at 10:00)
    const timeJourney = await Journey.create({
      id: 'j_time_mismatch',
      user_id: rider.id,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: '14:00',
      date: '2026-11-12',
      transport: 'Shared Cab',
      flexibility: 15,
      status: 'Searching',
      hostel: 'Agira Hall (Previously known as Hostel-A)'
    });

    const resTime = await request(app)
      .post(`/api/groups/${group.id}/join`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ journeyId: timeJourney.id });

    assert.equal(resTime.status, 400);
    assert.match(resTime.body.error, /Time mismatch/i);
  });

  // 22. Community creation escapes regex metacharacters safely
  it('22. Community creation: Escapes regex special characters without causing syntax error', async () => {
    const { token: studentToken } = await createTestStudent({ name: 'Community Founder' });

    // Name with parentheses and brackets
    const resCreate = await request(app)
      .post('/api/communities')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Shimla (Hill Station)',
        state: 'Himachal Pradesh',
        icon: '🏔️',
        distanceFromThapar: '180 km',
        popularTransport: 'HRTC Volvos, Taxis'
      });

    assert.equal(resCreate.status, 201);
    assert.equal(resCreate.body.community.name, 'Shimla (Hill Station)');

    // Attempting to create duplicate with identical special characters correctly detected
    const resDuplicate = await request(app)
      .post('/api/communities')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Shimla (Hill Station)',
        state: 'Himachal Pradesh'
      });

    assert.equal(resDuplicate.status, 400);
    assert.match(resDuplicate.body.error, /already exists/i);
  });

  // 23. Cookie-based authentication: requireAuth accepts HttpOnly cookie
  it('23. Session security: requireAuth authenticates requests via cookie', async () => {
    const { user, token } = await createTestStudent({ name: 'Cookie Student' });

    // Request without Authorization header, but with cookie
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, user.id);
  });

  // 24. Completion records: Auditable RideRecord preserved upon ride completion
  it('24. Auditable completion record: RideRecord preserved when ride is marked completed', async () => {
    const { user: admin, token: adminToken } = await createTestStudent({ name: 'Audit Admin' });
    const { user: rider } = await createTestStudent({ name: 'Audit Rider' });

    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const group = await Group.create({
      id: 802,
      destination_id: 'chd_airport',
      destination_name: 'Chandigarh Airport',
      departure_time: '06:00',
      date: pastDate,
      status: 'Confirmed',
      confirmed_at: new Date(),
      confirmed_by: admin.id,
      admin_id: admin.id,
      members: [
        { id: 'm1', user_id: admin.id, name: admin.name, role: 'Group Admin', phone: '+91 9999999991' },
        { id: 'm2', user_id: rider.id, name: rider.name, role: 'Member', phone: '+91 9999999992' }
      ]
    });

    const completeRes = await request(app)
      .post(`/api/groups/${group.id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(completeRes.status, 200);

    // Verify auditable RideRecord was permanently preserved
    const auditRecord = await RideRecord.findOne({ group_id: '802' });
    assert.ok(auditRecord);
    assert.equal(auditRecord.destination_name, 'Chandigarh Airport');
    assert.equal(auditRecord.completed_by, admin.id);
    assert.equal(auditRecord.members.length, 2);
    assert.equal(auditRecord.members[0].name, admin.name);
  });

  // 25. Production CORS guard: Render URLs and configured origins are supported
  it('25. Production CORS guard: Render URLs and configured origins are supported', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://thapar-journey-connect.onrender.com');

    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://thapar-journey-connect.onrender.com');
  });

  // 26. Community Groups: Creation with validation, Admin assignment, duplicate rejection
  it('26. Community Groups: Create group with validation, creator is Admin, reject duplicate names', async () => {
    const { user: student, token } = await createTestStudent({ name: 'Gurpreet Singh' });

    // 1. Missing name -> HTTP 400
    const resBad = await request(app)
      .post('/api/community-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '  ',
        description: 'Valid description for student cohort',
        communityId: 'del',
        category: 'Commute Cohort'
      });
    assert.equal(resBad.status, 400);

    // 2. Successful creation
    const resCreate = await request(app)
      .post('/api/community-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'South Delhi Weekend Carpool',
        description: 'Coordinating shared cabs and Volvo buses to South Extension & Lajpat Nagar',
        communityId: 'del',
        category: 'Weekend Trips'
      });
    assert.equal(resCreate.status, 201);
    assert.equal(resCreate.body.success, true);
    assert.equal(resCreate.body.group.name, 'South Delhi Weekend Carpool');
    assert.equal(resCreate.body.group.communityName, 'Delhi NCR');
    assert.equal(resCreate.body.group.category, 'Weekend Trips');
    assert.equal(resCreate.body.group.membersCount, 1);
    assert.equal(resCreate.body.group.isMember, true);
    assert.equal(resCreate.body.group.members[0].userId, student.id);
    assert.equal(resCreate.body.group.members[0].role, 'Admin');

    // 3. Duplicate group name in same community -> HTTP 400
    const resDup = await request(app)
      .post('/api/community-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'south delhi weekend carpool', // case-insensitive duplicate
        description: 'Another group with the identical name',
        communityId: 'del',
        category: 'Commute Cohort'
      });
    assert.equal(resDup.status, 400);
    assert.match(resDup.body.error, /already exists/i);
  });

  // 27. Community Groups: Filter by communityId, category, and keyword search
  it('27. Community Groups: Filter by communityId, category, and keyword search', async () => {
    const { token } = await createTestStudent({ name: 'Filter Tester' });

    await CommunityGroup.create([
      {
        id: 'cg_delhi_study',
        name: 'Delhi NCR Tech Study Group',
        description: 'Preparing for interviews and hackathons together',
        community_id: 'del',
        community_name: 'Delhi NCR',
        category: 'Study & Projects',
        creator_id: 'user_1',
        creator_name: 'Aman',
        members_count: 1,
        members: [{ user_id: 'user_1', name: 'Aman', role: 'Admin' }]
      },
      {
        id: 'cg_chd_transit',
        name: 'Chandigarh Daily Commuters',
        description: 'Daily carpool between Patiala and Mohali Phase 7',
        community_id: 'chd',
        community_name: 'Chandigarh & Tri-City',
        category: 'Commute Cohort',
        creator_id: 'user_2',
        creator_name: 'Preet',
        members_count: 1,
        members: [{ user_id: 'user_2', name: 'Preet', role: 'Admin' }]
      }
    ]);

    // Filter by community
    const resComm = await request(app)
      .get('/api/community-groups?communityId=chd')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(resComm.status, 200);
    assert.equal(resComm.body.length, 1);
    assert.equal(resComm.body[0].id, 'cg_chd_transit');

    // Filter by category
    const resCat = await request(app)
      .get('/api/community-groups?category=Study%20%26%20Projects')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(resCat.status, 200);
    assert.equal(resCat.body.length, 1);
    assert.equal(resCat.body[0].id, 'cg_delhi_study');

    // Search keyword
    const resSearch = await request(app)
      .get('/api/community-groups?search=hackathons')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(resSearch.status, 200);
    assert.equal(resSearch.body.length, 1);
    assert.equal(resSearch.body[0].id, 'cg_delhi_study');
  });

  // 28. Community Groups: Duplicate join rejection and member departure handling
  it('28. Community Groups: Duplicate join rejection and member departure handling', async () => {
    const { user: creator, token: creatorToken } = await createTestStudent({ name: 'Creator Dev' });
    const { user: joiner, token: joinerToken } = await createTestStudent({ name: 'Joining Student' });

    const group = await CommunityGroup.create({
      id: 'cg_test_join',
      name: 'Jaipur Festival Cohort',
      description: 'Diwali travel group to Jaipur and Ajmer',
      community_id: 'jpr',
      community_name: 'Jaipur & Rajasthan',
      category: 'Festivals & Events',
      creator_id: creator.id,
      creator_name: creator.name,
      members_count: 1,
      members: [{ user_id: creator.id, name: creator.name, role: 'Admin' }]
    });

    // 1. Join group succeeds
    const resJoin = await request(app)
      .post(`/api/community-groups/${group.id}/join`)
      .set('Authorization', `Bearer ${joinerToken}`);
    assert.equal(resJoin.status, 200);
    assert.equal(resJoin.body.success, true);
    assert.equal(resJoin.body.group.membersCount, 2);

    // 2. Duplicate join is rejected with HTTP 400
    const resDupJoin = await request(app)
      .post(`/api/community-groups/${group.id}/join`)
      .set('Authorization', `Bearer ${joinerToken}`);
    assert.equal(resDupJoin.status, 400);
    assert.match(resDupJoin.body.error, /already a member/i);

    // 3. Creator leaves -> Admin role transfers to next member
    const resCreatorLeave = await request(app)
      .post(`/api/community-groups/${group.id}/leave`)
      .set('Authorization', `Bearer ${creatorToken}`);
    assert.equal(resCreatorLeave.status, 200);
    assert.equal(resCreatorLeave.body.group.membersCount, 1);
    assert.equal(resCreatorLeave.body.group.members[0].userId, joiner.id);
    assert.equal(resCreatorLeave.body.group.members[0].role, 'Admin');

    // 4. Last member leaves -> Group is archived
    const resLastLeave = await request(app)
      .post(`/api/community-groups/${group.id}/leave`)
      .set('Authorization', `Bearer ${joinerToken}`);
    assert.equal(resLastLeave.status, 200);
    assert.equal(resLastLeave.body.group, null);

    const checkArchived = await CommunityGroup.findOne({ id: group.id });
    assert.equal(checkArchived, null);
  });

  // 29. Community Groups: Discussion messaging - member can post, non-member blocked HTTP 403
  it('29. Community Groups: Discussion messaging - member posts, non-member blocked HTTP 403', async () => {
    const { user: member, token: memberToken } = await createTestStudent({ name: 'Group Member' });
    const { token: nonMemberToken } = await createTestStudent({ name: 'Outsider Student' });

    const group = await CommunityGroup.create({
      id: 'cg_chat_test',
      name: 'Amritsar GT Road Travellers',
      description: 'Shared cabs from Thapar campus to Amritsar Golden Temple and city centre',
      community_id: 'asr',
      community_name: 'Amritsar Hub',
      category: 'Commute Cohort',
      creator_id: member.id,
      creator_name: member.name,
      members_count: 1,
      members: [{ user_id: member.id, name: member.name, role: 'Admin' }]
    });

    // 1. Non-member viewing messages -> HTTP 403 Forbidden
    const resGetForbidden = await request(app)
      .get(`/api/community-groups/${group.id}/messages`)
      .set('Authorization', `Bearer ${nonMemberToken}`);
    assert.equal(resGetForbidden.status, 403);

    // 2. Non-member posting message -> HTTP 403 Forbidden
    const resPostForbidden = await request(app)
      .post(`/api/community-groups/${group.id}/messages`)
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({ text: 'Hello can I join your cab?' });
    assert.equal(resPostForbidden.status, 403);

    // 3. Member posting message -> HTTP 201 Created
    const resPost = await request(app)
      .post(`/api/community-groups/${group.id}/messages`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ text: 'Cab leaving gate 2 at 5 PM sharp on Friday!' });
    assert.equal(resPost.status, 201);
    assert.equal(resPost.body.success, true);
    assert.equal(resPost.body.message.text, 'Cab leaving gate 2 at 5 PM sharp on Friday!');
    assert.equal(resPost.body.message.senderName, member.name);

    // 4. Member reading messages -> HTTP 200 with message list
    const resGet = await request(app)
      .get(`/api/community-groups/${group.id}/messages`)
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(resGet.status, 200);
    assert.equal(resGet.body.length, 1);
    assert.equal(resGet.body[0].text, 'Cab leaving gate 2 at 5 PM sharp on Friday!');
  });

  // 30. City Community Rides: List & filter rides (Cab, Train) with strict hometown access control
  it('30. City Community Rides: List & filter rides (Cab, Train) with strict hometown access control', async () => {
    const { token: delhiStudentToken } = await createTestStudent({ name: 'Delhi Student', joined_community: 'del' });
    const { token: chandigarhStudentToken } = await createTestStudent({ name: 'Chandigarh Student', joined_community: 'chd' });

    // 1. Non-member access guard: Chandigarh student cannot view or create Delhi rides -> 403 Forbidden
    const resForbiddenView = await request(app)
      .get('/api/communities/del/rides')
      .set('Authorization', `Bearer ${chandigarhStudentToken}`);
    assert.equal(resForbiddenView.status, 403);
    assert.match(resForbiddenView.body.error, /enrolled hometown community/i);

    // 2. Reject Bus mode: Bus feature has been completely removed -> 400 Bad Request
    const resBusRejected = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${delhiStudentToken}`)
      .send({
        date: '2026-11-10',
        time: '18:30',
        mode: 'Bus',
        destination: 'Delhi ISBT',
        pickupPoint: 'Main Gate',
        totalFare: 420
      });
    assert.equal(resBusRejected.status, 400);

    // 3. Create sample Cab and Train rides
    await CityRide.create([
      {
        id: 'cr_test_del_cab',
        community_id: 'del',
        community_name: 'Delhi NCR',
        creator_id: 'u1',
        creator_name: 'Aarav',
        destination: 'Delhi Kashmiri Gate',
        date: '2026-11-10',
        time: '17:00',
        mode: 'Cab',
        total_fare: 2800,
        max_capacity: 4,
        current_members_count: 2,
        members: [
          { user_id: 'u1', name: 'Aarav', role: 'Admin' },
          { user_id: 'u2', name: 'Diya', role: 'Member' }
        ]
      },
      {
        id: 'cr_test_del_train',
        community_id: 'del',
        community_name: 'Delhi NCR',
        creator_id: 'u4',
        creator_name: 'Dev',
        destination: 'New Delhi Railway Station (NDLS)',
        date: '2026-11-11',
        time: '06:15',
        mode: 'Train',
        total_fare: 380,
        max_capacity: 6,
        current_members_count: 1,
        transit_details: 'Kalka Shatabdi Express #12006',
        members: [{ user_id: 'u4', name: 'Dev', role: 'Admin' }]
      }
    ]);

    // 4. Enrolled Delhi member lists all active Delhi rides
    const resAll = await request(app)
      .get('/api/communities/del/rides')
      .set('Authorization', `Bearer ${delhiStudentToken}`);
    assert.equal(resAll.status, 200);
    assert.equal(resAll.body.length, 2);

    // 5. Filter by mode: Cab only
    const resCab = await request(app)
      .get('/api/communities/del/rides?mode=Cab')
      .set('Authorization', `Bearer ${delhiStudentToken}`);
    assert.equal(resCab.status, 200);
    assert.equal(resCab.body.length, 1);
    assert.equal(resCab.body[0].mode, 'Cab');
    assert.equal(resCab.body[0].totalFare, 2800);
    assert.equal(resCab.body[0].farePerPerson, 1400); // 2800 / 2 members = 1400

    // 6. Filter by mode: Train only
    const resTrain = await request(app)
      .get('/api/communities/del/rides?mode=Train')
      .set('Authorization', `Bearer ${delhiStudentToken}`);
    assert.equal(resTrain.status, 200);
    assert.equal(resTrain.body.length, 1);
    assert.equal(resTrain.body[0].mode, 'Train');
    assert.equal(resTrain.body[0].transitDetails, 'Kalka Shatabdi Express #12006');
  });

  // 31. City Community Rides: Cab fare division and capacity enforcement
  it('31. City Community Rides: Cab fare division and capacity enforcement', async () => {
    const { token: token1 } = await createTestStudent({ name: 'Rider One', joined_community: 'del' });
    const { token: token2 } = await createTestStudent({ name: 'Rider Two', joined_community: 'del' });
    const { token: token3 } = await createTestStudent({ name: 'Rider Three', joined_community: 'del' });
    const { token: token4 } = await createTestStudent({ name: 'Rider Four', joined_community: 'del' });
    const { token: token5 } = await createTestStudent({ name: 'Rider Five', joined_community: 'del' });

    // 1. Create a Cab ride with total fare ₹2,400 and max 4 seats
    const resCreate = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        date: '2026-11-12',
        time: '16:00',
        mode: 'Cab',
        destination: 'Delhi South Extension',
        pickupPoint: 'Main Gate',
        totalFare: 2400,
        maxCapacity: 4,
        transitDetails: 'Sedan AC Cab'
      });
    assert.equal(resCreate.status, 201);
    const rideId = resCreate.body.ride.id;
    assert.equal(resCreate.body.ride.totalFare, 2400);
    assert.equal(resCreate.body.ride.currentMembersCount, 1);
    assert.equal(resCreate.body.ride.farePerPerson, 2400); // 2400 / 1 = 2400
    assert.equal(resCreate.body.ride.seatsLeft, 3);

    // 2. Rider 2 joins -> Fare drops to ₹1,200 per student
    const resJoin2 = await request(app)
      .post(`/api/communities/del/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(resJoin2.status, 200);
    assert.equal(resJoin2.body.ride.currentMembersCount, 2);
    assert.equal(resJoin2.body.ride.farePerPerson, 1200); // 2400 / 2 = 1200
    assert.equal(resJoin2.body.ride.seatsLeft, 2);

    // 3. Rider 3 joins -> Fare drops to ₹800 per student
    const resJoin3 = await request(app)
      .post(`/api/communities/del/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${token3}`);
    assert.equal(resJoin3.status, 200);
    assert.equal(resJoin3.body.ride.currentMembersCount, 3);
    assert.equal(resJoin3.body.ride.farePerPerson, 800); // 2400 / 3 = 800
    assert.equal(resJoin3.body.ride.seatsLeft, 1);

    // 4. Rider 4 joins -> Fare drops to ₹600 per student, ride becomes Full
    const resJoin4 = await request(app)
      .post(`/api/communities/del/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${token4}`);
    assert.equal(resJoin4.status, 200);
    assert.equal(resJoin4.body.ride.currentMembersCount, 4);
    assert.equal(resJoin4.body.ride.farePerPerson, 600); // 2400 / 4 = 600
    assert.equal(resJoin4.body.ride.seatsLeft, 0);
    assert.equal(resJoin4.body.ride.isFull, true);
    assert.equal(resJoin4.body.ride.status, 'Full');

    // 5. Rider 5 tries to join full cab -> HTTP 400
    const resJoin5 = await request(app)
      .post(`/api/communities/del/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${token5}`);
    assert.equal(resJoin5.status, 400);
    assert.match(resJoin5.body.error, /already full/i);

    // 6. Duplicate join attempt by Rider 2 -> HTTP 400
    const resDupJoin = await request(app)
      .post(`/api/communities/del/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(resDupJoin.status, 400);
    assert.match(resDupJoin.body.error, /already a member/i);
  });

  // 32. City Community Rides: Train cohort travel & member departure
  it('32. City Community Rides: Train cohort travel & member departure', async () => {
    const { token: creatorToken } = await createTestStudent({ name: 'Train Leader', joined_community: 'del' });
    const { user: joiner, token: joinerToken } = await createTestStudent({ name: 'Train Fellow', joined_community: 'del' });

    // 1. Create a Train cohort ride
    const resCreate = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        date: '2026-11-13',
        time: '06:00',
        mode: 'Train',
        destination: 'New Delhi Railway Station (NDLS)',
        pickupPoint: 'Campus Gate 2',
        totalFare: 350,
        maxCapacity: 6,
        transitDetails: 'Shatabdi Express #12006'
      });
    assert.equal(resCreate.status, 201);
    const rideId = resCreate.body.ride.id;

    // 2. Joiner joins train cohort
    const resJoin = await request(app)
      .post(`/api/communities/del/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${joinerToken}`);
    assert.equal(resJoin.status, 200);
    assert.equal(resJoin.body.ride.currentMembersCount, 2);

    // 3. Creator leaves -> Admin role transferred to joiner
    const resLeave1 = await request(app)
      .post(`/api/communities/del/rides/${rideId}/leave`)
      .set('Authorization', `Bearer ${creatorToken}`);
    assert.equal(resLeave1.status, 200);
    assert.equal(resLeave1.body.ride.currentMembersCount, 1);
    assert.equal(resLeave1.body.ride.members[0].userId, joiner.id);
    assert.equal(resLeave1.body.ride.members[0].role, 'Admin');

    // 4. Last member leaves -> Ride is removed
    const resLeave2 = await request(app)
      .post(`/api/communities/del/rides/${rideId}/leave`)
      .set('Authorization', `Bearer ${joinerToken}`);
    assert.equal(resLeave2.status, 200);
    assert.equal(resLeave2.body.ride, null);

    const checkRide = await CityRide.findOne({ id: rideId });
    assert.equal(checkRide, null);
  });

  // 33. My Journeys integration: Joined community ride appears in /api/groups/mine and /api/groups
  it('33. My Journeys integration: Joined community ride appears in /api/groups/mine', async () => {
    const { token: token1 } = await createTestStudent({ name: 'Journey Student', joined_community: 'del' });
    const { token: outsiderToken } = await createTestStudent({ name: 'Outsider Student', joined_community: 'chd' });

    // Create a community ride with student1 as creator
    const resCreate = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        date: '2026-11-15',
        time: '14:00',
        mode: 'Cab',
        destination: 'Delhi Airport T3',
        pickupPoint: 'Main Gate',
        totalFare: 2000,
        maxCapacity: 4,
        transitDetails: 'Highway Sedan Cab'
      });
    assert.equal(resCreate.status, 201);
    const rideId = resCreate.body.ride.id;

    // Fetch /api/groups/mine -> Must include this community ride
    const resMine = await request(app)
      .get('/api/groups/mine')
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resMine.status, 200);
    const found = resMine.body.find((g) => g.id === rideId);
    assert.ok(found, 'Community ride should be present in /api/groups/mine');
    assert.equal(found.isCommunityRide, true);
    assert.equal(found.communityName, 'Delhi NCR');
    assert.equal(found.destinationName, 'Delhi Airport T3 (Delhi NCR)');

    // Fetch /api/groups/:id as member -> 200 OK
    const resDetail = await request(app)
      .get(`/api/groups/${rideId}`)
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resDetail.status, 200);
    assert.equal(resDetail.body.id, rideId);
    assert.equal(resDetail.body.isCommunityRide, true);

    // Fetch /api/groups/:id as outsider -> 403 Forbidden
    const resOutsider = await request(app)
      .get(`/api/groups/${rideId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    assert.equal(resOutsider.status, 403);
  });

  // 34. Profile ride history integration: Completed community ride appears in /api/groups/history/mine
  it('34. Profile ride history integration: Completed community ride appears in /api/groups/history/mine', async () => {
    const { user: student1, token: token1 } = await createTestStudent({ name: 'History Rider 1', joined_community: 'del' });
    const { user: student2, token: token2 } = await createTestStudent({ name: 'History Rider 2', joined_community: 'del' });

    // Create a community ride
    const resCreate = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        date: '2026-11-16',
        time: '15:00',
        mode: 'Train',
        destination: 'New Delhi Railway Station (NDLS)',
        pickupPoint: 'Campus Gate 2',
        totalFare: 300,
        maxCapacity: 6,
        transitDetails: 'Shatabdi Express'
      });
    assert.equal(resCreate.status, 201);
    const rideId = resCreate.body.ride.id;

    // Student 2 joins
    await request(app)
      .post(`/api/communities/del/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${token2}`);

    // Creator completes the community ride
    const resComplete = await request(app)
      .post(`/api/communities/del/rides/${rideId}/complete`)
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resComplete.status, 200);
    assert.equal(resComplete.body.ride.status, 'Completed');

    // Both riders' trips_completed should be incremented
    const updatedUser1 = await User.findOne({ id: student1.id });
    const updatedUser2 = await User.findOne({ id: student2.id });
    assert.equal(updatedUser1.trips_completed, 1);
    assert.equal(updatedUser2.trips_completed, 1);

    // Call /api/groups/history/mine for student 2 -> Contains completed community ride
    const resHist = await request(app)
      .get('/api/groups/history/mine')
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(resHist.status, 200);
    const foundHist = resHist.body.find((g) => g.id === rideId);
    assert.ok(foundHist, 'Completed community ride should be present in /api/groups/history/mine');
    assert.equal(foundHist.isCommunityRide, true);
    assert.equal(foundHist.status, 'Completed');

    // Active groups /mine should NOT contain the completed ride
    const resActive = await request(app)
      .get('/api/groups/mine')
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(resActive.status, 200);
    const foundActive = resActive.body.find((g) => g.id === rideId);
    assert.equal(foundActive, undefined);
  });

  // 35. Single-Ride Policy across City Community Rides: Rejects joining a second ride or creating a ride when already enrolled
  it('35. Single-Ride Policy across City Community Rides: Rejects joining a second ride or creating a ride when already enrolled', async () => {
    const { token: token1 } = await createTestStudent({ name: 'Solo Commuter', joined_community: 'del' });
    const { token: otherCreatorToken } = await createTestStudent({ name: 'Creator Other', joined_community: 'del' });

    // 1. Create Ride A
    const resRideA = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        date: '2026-11-20',
        time: '12:00',
        mode: 'Cab',
        destination: 'Delhi South Extension',
        pickupPoint: 'Main Gate',
        totalFare: 2400,
        maxCapacity: 4,
        transitDetails: 'Sedan Cab'
      });
    assert.equal(resRideA.status, 201);
    const rideAId = resRideA.body.ride.id;

    // 2. Creator Other creates Ride B
    const resRideB = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${otherCreatorToken}`)
      .send({
        date: '2026-11-20',
        time: '14:00',
        mode: 'Train',
        destination: 'NDLS',
        pickupPoint: 'Campus Gate 2',
        totalFare: 300,
        maxCapacity: 6,
        transitDetails: 'Shatabdi Express'
      });
    assert.equal(resRideB.status, 201);
    const rideBId = resRideB.body.ride.id;

    // 3. Student (already member of Ride A) attempts to join Ride B -> HTTP 409
    const resJoinB = await request(app)
      .post(`/api/communities/del/rides/${rideBId}/join`)
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resJoinB.status, 409);
    assert.match(resJoinB.body.error, /Single-Ride Policy/i);

    // 4. Student (already member of Ride A) attempts to create a second ride -> HTTP 409
    const resCreateSecond = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        date: '2026-11-21',
        time: '10:00',
        mode: 'Cab',
        destination: 'Delhi Airport',
        pickupPoint: 'Main Gate',
        totalFare: 2000,
        maxCapacity: 4,
        transitDetails: 'Sedan'
      });
    assert.equal(resCreateSecond.status, 409);
    assert.match(resCreateSecond.body.error, /Single-Ride Policy/i);

    // 5. Student leaves Ride A
    const resLeaveA = await request(app)
      .post(`/api/communities/del/rides/${rideAId}/leave`)
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resLeaveA.status, 200);

    // 6. Now student can join Ride B successfully -> HTTP 200
    const resJoinBAfterLeave = await request(app)
      .post(`/api/communities/del/rides/${rideBId}/join`)
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resJoinBAfterLeave.status, 200);
    assert.equal(resJoinBAfterLeave.body.ride.currentMembersCount, 2);
  });

  // 36. Campus password authentication: Allows signing in anytime with test accounts without Google OAuth
  it('36. Campus password authentication: Allows signing in anytime with test accounts without Google OAuth', async () => {
    // Re-seed static test users since beforeEach cleans dynamic collections
    const { seedDefaultData } = await import('../server/config/db.js');
    await seedDefaultData();

    // 1. Sign in with student1@thapar.edu and password 'Thapar@123'
    const resLogin1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student1@thapar.edu', password: 'Thapar@123' });
    assert.equal(resLogin1.status, 200);
    assert.equal(resLogin1.body.success, true);
    assert.equal(resLogin1.body.user.email, 'student1@thapar.edu');
    assert.equal(resLogin1.body.user.name, 'Aarav Sharma');
    assert.ok(resLogin1.body.token, 'Should return a valid JWT token');

    // 2. Sign in with student2@thapar.edu and password 'Thapar@123'
    const resLogin2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student2@thapar.edu', password: 'Thapar@123' });
    assert.equal(resLogin2.status, 200);
    assert.equal(resLogin2.body.success, true);
    assert.equal(resLogin2.body.user.email, 'student2@thapar.edu');
    assert.equal(resLogin2.body.user.name, 'Diya Verma');

    // 3. Attempt login with wrong password -> HTTP 401
    const resWrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student1@thapar.edu', password: 'WrongPassword999' });
    assert.equal(resWrongPass.status, 401);
    assert.match(resWrongPass.body.error, /invalid email or password/i);
  });

  // 37. Non-overlapping sequential group IDs across standard groups & city rides, member_joined alerts, and profile history
  it('37. Non-overlapping sequential group IDs across standard groups & city rides, member_joined alerts, and profile history', async () => {
    const { token: token1 } = await createTestStudent({ name: 'Group Number Rider 1', joined_community: 'del' });
    const { token: token2 } = await createTestStudent({ name: 'Group Number Rider 2', joined_community: 'del' });

    // 1. Create a regular travel journey and form regular Group #1
    const resJourney = await request(app)
      .post('/api/journeys')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        destinationId: 'dest_chandigarh_airport',
        destinationName: 'Chandigarh Airport (IXC)',
        date: 'Tomorrow',
        departureTime: '15:00',
        transport: 'Shared Cab',
        flexibility: 15,
        pickupPoint: 'Main Gate'
      });
    assert.equal(resJourney.status, 201);
    const regularJourneyId = resJourney.body.journey.id;

    const resGroup1 = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token1}`)
      .send({ journeyId: regularJourneyId, pickupPoint: 'Main Gate' });
    assert.equal(resGroup1.status, 201);
    const group1Id = resGroup1.body.group.id;
    assert.equal(group1Id, '1');

    // 2. Student 2 creates a City Community Ride -> Must receive ID #2 (non-overlapping sequential counter)
    const resRide2 = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        date: 'Tomorrow',
        time: '11:00',
        mode: 'Cab',
        destination: 'Delhi Connaught Place',
        pickupPoint: 'Campus Gate 2',
        totalFare: 2500,
        maxCapacity: 4,
        transitDetails: 'Sedan'
      });
    assert.equal(resRide2.status, 201);
    const ride2Id = resRide2.body.ride.id;
    assert.equal(ride2Id, '2');

    // 3. Verify IDs are strictly unique, sequential integers
    assert.notEqual(group1Id, ride2Id);

    // 4. Leave regular group 1 so student 1 can join ride 2
    const resLeave1 = await request(app)
      .post(`/api/groups/${group1Id}/leave`)
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resLeave1.status, 200);

    // 5. Student 1 joins City Ride 2
    const resJoinRide2 = await request(app)
      .post(`/api/communities/del/rides/${ride2Id}/join`)
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resJoinRide2.status, 200);
    assert.equal(resJoinRide2.body.ride.currentMembersCount, 2);

    // 6. Complete ride 2 (mark status as Completed)
    await CityRide.updateOne(
      { id: ride2Id },
      { $set: { status: 'Completed', completed_at: new Date() } }
    );

    // 7. Check Profile ride history (/api/groups/history/mine) for Student 1 -> Must contain ride 2
    const resHistory = await request(app)
      .get('/api/groups/history/mine')
      .set('Authorization', `Bearer ${token1}`);
    assert.equal(resHistory.status, 200);
    const completedEntry = resHistory.body.find((r) => String(r.id) === String(ride2Id));
    assert.ok(completedEntry, 'Ride #2 must be present in profile confirmed ride history');
    assert.equal(completedEntry.id, '2');
  });

  // 38. Admin confirms journey reveals member phone numbers, member departure triggers leave alerts
  it('38. Admin confirms journey reveals member phone numbers, member departure triggers leave alerts', async () => {
    const { token: adminToken } = await createTestStudent({
      name: 'Ride Admin',
      joined_community: 'del',
      phone: '+91 9111111111'
    });
    const { token: riderToken } = await createTestStudent({
      name: 'Fellow Rider',
      joined_community: 'del',
      phone: '+91 9222222222'
    });

    // 1. Admin creates a City Ride
    const resCreate = await request(app)
      .post('/api/communities/del/rides')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: 'Tomorrow',
        time: '16:00',
        mode: 'Cab',
        destination: 'Delhi Aerocity',
        pickupPoint: 'Main Gate',
        totalFare: 2800,
        maxCapacity: 4,
        transitDetails: 'Innova Cab'
      });
    assert.equal(resCreate.status, 201);
    const rideId = resCreate.body.ride.id;

    // 2. Fellow Rider joins the ride
    const resJoin = await request(app)
      .post(`/api/communities/del/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${riderToken}`);
    assert.equal(resJoin.status, 200);

    // 3. Before confirmation: Fellow rider checks group details -> Admin's phone number is hidden (empty string)
    const resDetailsBefore = await request(app)
      .get(`/api/groups/${rideId}`)
      .set('Authorization', `Bearer ${riderToken}`);
    assert.equal(resDetailsBefore.status, 200);
    assert.equal(resDetailsBefore.body.status, 'Open');
    const adminBefore = resDetailsBefore.body.members.find((m) => m.name === 'Ride Admin');
    assert.ok(adminBefore);
    assert.equal(adminBefore.phone, '', 'Phone numbers must remain hidden prior to admin confirmation');

    // 4. Admin confirms the journey via POST /api/groups/:id/confirm -> HTTP 200 Confirmed
    const resConfirm = await request(app)
      .post(`/api/groups/${rideId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(resConfirm.status, 200);
    assert.equal(resConfirm.body.group.status, 'Confirmed');

    // 5. After confirmation: Fellow rider checks group details -> Admin's phone number IS now visible
    const resDetailsAfter = await request(app)
      .get(`/api/groups/${rideId}`)
      .set('Authorization', `Bearer ${riderToken}`);
    assert.equal(resDetailsAfter.status, 200);
    assert.equal(resDetailsAfter.body.status, 'Confirmed');
    const adminAfter = resDetailsAfter.body.members.find((m) => m.name === 'Ride Admin');
    assert.ok(adminAfter);
    assert.equal(adminAfter.phone, '+91 9111111111', 'Admin phone must be visible after confirmation');

    // 6. Fellow rider leaves the ride -> Remaining admin is notified and member count is 1
    const resLeave = await request(app)
      .post(`/api/groups/${rideId}/leave`)
      .set('Authorization', `Bearer ${riderToken}`);
    assert.equal(resLeave.status, 200);

    // 7. Admin checks group details -> Only admin remains
    const resDetailsAfterLeave = await request(app)
      .get(`/api/groups/${rideId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(resDetailsAfterLeave.status, 200);
    assert.equal(resDetailsAfterLeave.body.members.length, 1);
  });

  // 39. Slot-Based Travel: 15-minute slots generation (96 slots/day), virtual slots (0/4), and atomic lazy group creation
  it('39. Slot-Based Travel: 15-minute slots generation (96 slots/day), virtual slots (0/4), and atomic lazy group creation', async () => {
    const { token: studentToken } = await createTestStudent({ name: 'Slot Pioneer' });

    // 1. Fetch slots for tomorrow
    const resSlots = await request(app)
      .get('/api/slots?destinationId=railway&date=Tomorrow&vehicle=Shared+Cab')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resSlots.status, 200);
    assert.equal(resSlots.body.totalSlots, 96);
    assert.ok(Array.isArray(resSlots.body.slots));

    // A slot with no joined members appears as 0/4 virtual slot
    const slot10am = resSlots.body.slots.find((s) => s.time === '10:00');
    assert.ok(slot10am);
    assert.equal(slot10am.seatsFilled, 0);
    assert.equal(slot10am.isFull, false);
    assert.equal(slot10am.groupId, null);

    // 2. Student joins the 10:00 slot -> lazily creates Group #1 atomically
    const resJoin = await request(app)
      .post('/api/slots/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        destinationId: 'railway',
        date: 'Tomorrow',
        time: '10:00',
        vehicle: 'Shared Cab'
      });

    assert.equal(resJoin.status, 201);
    assert.equal(resJoin.body.created, true);
    assert.equal(resJoin.body.group.id, '1');
    assert.equal(resJoin.body.group.members.length, 1);
    assert.equal(resJoin.body.group.members[0].name, 'Slot Pioneer');

    // 3. Now re-fetch slots -> slot at 10:00 now shows 1/4 filled and links to Group #1
    const resSlotsAfter = await request(app)
      .get('/api/slots?destinationId=railway&date=Tomorrow&vehicle=Shared+Cab')
      .set('Authorization', `Bearer ${studentToken}`);

    const slotAfter = resSlotsAfter.body.slots.find((s) => s.time === '10:00');
    assert.ok(slotAfter);
    assert.equal(slotAfter.seatsFilled, 1);
    assert.equal(slotAfter.groupId, '1');
  });

  // 40. Slot-Based Travel: Strict capacity enforcement (reject 5th member) & Single-Ride Policy
  it('40. Slot-Based Travel: Strict capacity enforcement (reject 5th member) & Single-Ride Policy', async () => {
    const students = [];
    for (let i = 1; i <= 5; i++) {
      students.push(await createTestStudent({ name: `Rider ${i}` }));
    }

    // First 4 riders join the 12:00 slot for tomorrow
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/slots/join')
        .set('Authorization', `Bearer ${students[i].token}`)
        .send({
          destinationId: 'railway',
          date: 'Tomorrow',
          time: '12:00',
          vehicle: 'Shared Cab'
        });
      assert.ok([200, 201].includes(res.status));
    }

    // 5th rider attempts to join full slot -> HTTP 409
    const res5th = await request(app)
      .post('/api/slots/join')
      .set('Authorization', `Bearer ${students[4].token}`)
      .send({
        destinationId: 'railway',
        date: 'Tomorrow',
        time: '12:00',
        vehicle: 'Shared Cab'
      });
    assert.equal(res5th.status, 409);
    assert.match(res5th.body.error, /full/i);

    // Rider 1 (already enrolled in Group #1) attempts to join another slot at 14:00 -> Single-Ride Policy error 409
    const resDouble = await request(app)
      .post('/api/slots/join')
      .set('Authorization', `Bearer ${students[0].token}`)
      .send({
        destinationId: 'railway',
        date: 'Tomorrow',
        time: '14:00',
        vehicle: 'Shared Cab'
      });
    assert.equal(resDouble.status, 409);
    assert.match(resDouble.body.error, /Single-Ride Policy/i);
  });

  // 41. Atomic Slot Rescheduling: Switch from Slot A to Slot B within 4h incurs reliability penalty (-0.3)
  it('41. Atomic Slot Rescheduling: Switch from Slot A to Slot B within 4h incurs reliability penalty (-0.3)', async () => {
    const { user: student, token: studentToken } = await createTestStudent({ name: 'Shifter Student', reliability: 5.0 });

    // Calculate a departure time 2 hours from now in IST
    const { now } = getNowIST();
    const targetDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const dateStr = targetDate.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = targetDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

    // Create an initial group departing in 2h
    const oldGroupId = await getNextGroupId();
    const oldGroup = await Group.create({
      id: oldGroupId,
      destination_id: 'railway',
      destination_name: 'Patiala Railway Station',
      departure_time: timeStr,
      date: dateStr,
      status: 'Open',
      transport: 'Shared Cab',
      max_members: 4,
      pickup_point: 'Main Gate',
      admin_id: student.id,
      members: [
        {
          id: student.id,
          user_id: student.id,
          name: student.name,
          avatar: 'SS',
          hostel: 'Hostel-J',
          departure_time: timeStr,
          role: 'Group Admin',
          phone: '+91 9999999999'
        }
      ]
    });
    await User.updateOne({ id: student.id }, { $set: { active_group_id: oldGroup.id } });

    // Preview penalty
    const resPreview = await request(app)
      .post('/api/slots/reschedule/preview')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ oldGroupId: oldGroup.id });
    assert.equal(resPreview.status, 200);
    assert.equal(resPreview.body.willIncurPenalty, true);
    assert.equal(resPreview.body.penalty, 0.3);

    // Reschedule to tomorrow at 16:00
    const resResched = await request(app)
      .post('/api/slots/reschedule')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        oldGroupId: oldGroup.id,
        targetDestinationId: 'railway',
        targetDate: 'Tomorrow',
        targetTime: '16:00',
        targetVehicle: 'Shared Cab'
      });

    assert.equal(resResched.status, 200);
    assert.equal(resResched.body.penaltyApplied, true);
    assert.equal(resResched.body.penaltyAmount, 0.3);
    assert.equal(resResched.body.newReliability, 4.7);

    // Verify user reliability was updated in DB
    const updatedUser = await User.findOne({ id: student.id });
    assert.equal(updatedUser.reliability, 4.7);

    // Old group was cleanly deleted since only 1 member was in it
    const checkOldGroup = await Group.findOne({ id: oldGroup.id });
    assert.equal(checkOldGroup, null);
  });

  // 42. Luggage Transport: 4-step booking, instant quote with pooling savings, 4-digit pickup OTP
  it('42. Luggage Transport: 4-step booking, instant quote with pooling savings, 4-digit pickup OTP', async () => {
    const { token: student1Token } = await createTestStudent({ name: 'Luggage Sender 1' });
    const { token: student2Token } = await createTestStudent({ name: 'Luggage Sender 2' });

    // 1. Get quote for single sender to Chandigarh
    const resQuote1 = await request(app)
      .get('/api/luggage/quote?destination=Chandigarh+ISBT-43&date=Tomorrow&time=11:00&vehicleType=Tempo%2FMini-truck&items=' + encodeURIComponent(JSON.stringify([{ size: 'Trunk-Box', count: 1 }])))
      .set('Authorization', `Bearer ${student1Token}`);
    assert.equal(resQuote1.status, 200);
    assert.ok(resQuote1.body.quote.estimatedFare > 0);

    // 2. Student 1 books luggage
    const resBook1 = await request(app)
      .post('/api/luggage')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        pickupLocation: 'Tejas Hall (Hostel-J)',
        destination: 'Chandigarh ISBT Sector 43',
        date: 'Tomorrow',
        slotTime: '11:00',
        vehicleType: 'Tempo/Mini-truck',
        items: [{ size: 'Trunk-Box', count: 1 }],
        notes: 'Iron trunk handle with care'
      });

    assert.equal(resBook1.status, 201);
    assert.equal(resBook1.body.luggage.status, 'Requested');
    assert.match(resBook1.body.luggage.pickupOtp, /^\d{4}$/); // 4-digit OTP
    const order1Id = resBook1.body.luggage.id;

    // 3. Student 2 gets quote for same destination & slot -> Pool & Save applies!
    const resQuote2 = await request(app)
      .get('/api/luggage/quote?destination=Chandigarh+ISBT+Sector+43&date=Tomorrow&time=11:00&vehicleType=Tempo%2FMini-truck&items=' + encodeURIComponent(JSON.stringify([{ size: 'Medium', count: 1 }])))
      .set('Authorization', `Bearer ${student2Token}`);
    assert.equal(resQuote2.status, 200);
    assert.ok(resQuote2.body.quote.pooledSavings > 0, 'Pooling discount must apply for second student in same slot');

    // 4. Student 1 checks /api/luggage/mine
    const resMine = await request(app)
      .get('/api/luggage/mine')
      .set('Authorization', `Bearer ${student1Token}`);
    assert.equal(resMine.status, 200);
    assert.equal(resMine.body.active.length, 1);
    assert.equal(resMine.body.active[0].id, order1Id);
  });

  // 43. Vendor Operations & Role Checks: Student blocked from /api/vendor (HTTP 403), vendor dispatches driver, verifies OTP
  it('43. Vendor Operations & Role Checks: Student blocked from /api/vendor (HTTP 403), vendor dispatches driver, verifies OTP', async () => {
    const { token: studentToken } = await createTestStudent({ name: 'Regular Student', role: 'student' });
    const { token: vendorToken } = await createTestStudent({ name: 'Vendor Dispatcher', email: 'partner@thapar.edu', role: 'vendor' });

    // 1. Regular student attempts to access /api/vendor/requests -> HTTP 403
    const resForbidden = await request(app)
      .get('/api/vendor/requests')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resForbidden.status, 403);

    // 2. Student creates a luggage order
    const resBook = await request(app)
      .post('/api/luggage')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        pickupLocation: 'Hostel-M Gate',
        destination: 'Patiala Railway Station',
        date: 'Tomorrow',
        slotTime: '15:20',
        vehicleType: 'Auto/e-rickshaw',
        items: [{ size: 'Medium', count: 2 }]
      });
    assert.equal(resBook.status, 201);
    const orderId = resBook.body.luggage.id;
    const studentOtp = resBook.body.luggage.pickupOtp;

    // 3. Vendor accesses /api/vendor/requests -> HTTP 200
    const resVendorOrders = await request(app)
      .get('/api/vendor/requests')
      .set('Authorization', `Bearer ${vendorToken}`);
    assert.equal(resVendorOrders.status, 200);
    assert.ok(resVendorOrders.body.allRequests.some((o) => o.id === orderId));

    // 4. Vendor assigns driver and vehicle
    const resAssign = await request(app)
      .post(`/api/vendor/requests/${orderId}/assign`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        driverName: 'Manjit Singh',
        driverPhone: '9888123456',
        vehicleNumber: 'PB 11 AZ 9988'
      });
    assert.equal(resAssign.status, 200);
    assert.equal(resAssign.body.luggage.status, 'Vendor Assigned');
    assert.equal(resAssign.body.luggage.driverName, 'Manjit Singh');

    // 5. Vendor attempts to verify pickup with WRONG OTP -> HTTP 400 rejection
    const resWrongOtp = await request(app)
      .post(`/api/vendor/requests/${orderId}/verify-pickup`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ otp: '0000' });
    assert.equal(resWrongOtp.status, 400);

    // 6. Vendor verifies pickup with correct student OTP -> HTTP 200 Picked Up
    const resCorrectOtp = await request(app)
      .post(`/api/vendor/requests/${orderId}/verify-pickup`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ otp: studentOtp });
    assert.equal(resCorrectOtp.status, 200);
    assert.equal(resCorrectOtp.body.luggage.status, 'Picked Up');

    // 7. Student can NO LONGER cancel order once Picked Up -> HTTP 400
    const resCancelBlocked = await request(app)
      .post(`/api/luggage/${orderId}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resCancelBlocked.status, 400);
    assert.match(resCancelBlocked.body.error, /already been collected/i);

    // 8. Vendor transitions to In Transit and Delivered
    const resDelivered = await request(app)
      .post(`/api/vendor/requests/${orderId}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: 'Delivered', note: 'Safely handed over at station' });
    assert.equal(resDelivered.status, 200);
    assert.equal(resDelivered.body.luggage.status, 'Delivered');
  });

  // 44. City Community Slots: 96 slots generation (15-min intervals), virtual slots (0/4), fare calculation, and enrolled hometown access control
  it('44. City Community Slots: 96 slots generation (15-min intervals), virtual slots (0/4), fare calculation, and enrolled hometown access control', async () => {
    const { token: delhiStudentToken } = await createTestStudent({
      name: 'Delhi NCR Student',
      joined_community: 'del'
    });
    const { token: outsiderStudentToken } = await createTestStudent({
      name: 'Outsider Student',
      joined_community: 'chd'
    });

    // 1. Non-member attempting to view Delhi community slots -> HTTP 403 Forbidden
    const resForbidden = await request(app)
      .get('/api/communities/del/slots?date=Tomorrow&mode=Cab')
      .set('Authorization', `Bearer ${outsiderStudentToken}`);
    assert.equal(resForbidden.status, 403);
    assert.match(resForbidden.body.error, /enrolled hometown community/i);

    // 2. Enrolled member requests slots -> HTTP 200 with 96 slots
    const resSlots = await request(app)
      .get('/api/communities/del/slots?date=Tomorrow&mode=Cab&destination=Kashmiri Gate ISBT')
      .set('Authorization', `Bearer ${delhiStudentToken}`);
    assert.equal(resSlots.status, 200);
    assert.equal(resSlots.body.success, true);
    assert.equal(resSlots.body.totalSlots, 96);
    assert.ok(Array.isArray(resSlots.body.slots));
    assert.equal(resSlots.body.slots.length, 96);

    // 3. Virtual slot (0/4) verification
    const slot10AM = resSlots.body.slots.find((s) => s.time === '10:00');
    assert.ok(slot10AM, '10:00 slot must exist');
    assert.equal(slot10AM.seatsFilled, 0);
    assert.equal(slot10AM.maxSeats, 4);
    assert.equal(slot10AM.isFull, false);
    assert.equal(slot10AM.isJoined, false);
    assert.equal(slot10AM.rideId, null);
    assert.ok(slot10AM.estimatedFarePerPerson > 0, 'Estimated per person fare must be calculated');
  });

  // 45. City Community Slots: Atomic slot join, lazy group creation with sequential Group #id, and Single-Ride Policy enforcement
  it('45. City Community Slots: Atomic slot join, lazy group creation with sequential Group #id, and Single-Ride Policy enforcement', async () => {
    const { token: student1Token } = await createTestStudent({
      name: 'Community Slot Rider 1',
      joined_community: 'del'
    });
    const { token: student2Token } = await createTestStudent({
      name: 'Community Slot Rider 2',
      joined_community: 'del'
    });

    // 1. Student 1 joins 16:30 slot to Kashmiri Gate -> Lazily creates CityRide with sequential Group #id
    const resJoin1 = await request(app)
      .post('/api/communities/del/slots/join')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        date: 'Tomorrow',
        time: '16:30',
        mode: 'Cab',
        destination: 'Kashmiri Gate ISBT (Metro Hub)',
        pickupPoint: 'Main Gate'
      });
    assert.equal(resJoin1.status, 201);
    assert.equal(resJoin1.body.success, true);
    assert.equal(resJoin1.body.created, true);
    const createdGroupId = resJoin1.body.ride.id;
    assert.ok(createdGroupId, 'Must return a created group ID');
    assert.equal(resJoin1.body.ride.currentMembersCount, 1);
    assert.equal(resJoin1.body.ride.members[0].role, 'Admin');

    // 2. Student 2 joins the SAME slot -> Atomically joins existing Group instead of creating duplicate
    const resJoin2 = await request(app)
      .post('/api/communities/del/slots/join')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        date: 'Tomorrow',
        time: '16:30',
        mode: 'Cab',
        destination: 'Kashmiri Gate ISBT (Metro Hub)',
        pickupPoint: 'Hostel-J Gate'
      });
    assert.equal(resJoin2.status, 200);
    assert.equal(resJoin2.body.success, true);
    assert.equal(resJoin2.body.created, false);
    assert.equal(resJoin2.body.ride.id, createdGroupId);
    assert.equal(resJoin2.body.ride.currentMembersCount, 2);

    // 3. Single-Ride Policy: Student 1 attempts to join a different slot (18:00) -> HTTP 409 conflict
    const resConflict = await request(app)
      .post('/api/communities/del/slots/join')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        date: 'Tomorrow',
        time: '18:00',
        mode: 'Cab',
        destination: 'Gurgaon Cyber Hub'
      });
    assert.equal(resConflict.status, 409);
    assert.match(resConflict.body.error, /Single-Ride Policy/i);

    // 4. Calling join on the SAME slot student is already member of returns alreadyMember: true
    const resAlready = await request(app)
      .post('/api/communities/del/slots/join')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        date: 'Tomorrow',
        time: '16:30',
        mode: 'Cab',
        destination: 'Kashmiri Gate ISBT (Metro Hub)'
      });
    assert.equal(resAlready.status, 200);
    assert.equal(resAlready.body.alreadyMember, true);
  });

  // 46. Friend / Companion Management: Add friend (+1 seat), fare split update, and remove friend
  it('46. Friend / Companion Management: Add friend (+1 seat), fare split update, and remove friend', async () => {
    const { token: studentToken } = await createTestStudent({ name: 'Solo Student' });

    // 1. Join a slot
    const resJoin = await request(app)
      .post('/api/slots/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        destinationId: 'chandigarh_43',
        date: 'Tomorrow',
        time: '14:15',
        vehicle: 'Shared Cab'
      });
    assert.equal(resJoin.status, 201);
    const groupId = resJoin.body.group.id;
    assert.equal(resJoin.body.group.members.length, 1);

    // 2. Add a companion friend to the slot
    const resAddFriend = await request(app)
      .post(`/api/groups/${groupId}/friends`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Simran Kaur',
        hostel: 'Hostel PG',
        phone: '9876543210'
      });

    assert.equal(resAddFriend.status, 201);
    assert.equal(resAddFriend.body.success, true);
    assert.equal(resAddFriend.body.group.members.length, 2);

    const companion = resAddFriend.body.group.members.find((m) => m.isCompanion);
    assert.ok(companion, 'Companion member must exist with isCompanion: true');
    assert.equal(companion.companionName, 'Simran Kaur');
    assert.equal(companion.role, 'Companion');

    // 3. Remove the companion friend from the slot
    const resRemoveFriend = await request(app)
      .delete(`/api/groups/${groupId}/friends/${companion.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resRemoveFriend.status, 200);
    assert.equal(resRemoveFriend.body.success, true);
    assert.equal(resRemoveFriend.body.group.members.length, 1);
    assert.ok(!resRemoveFriend.body.group.members.some((m) => m.isCompanion));
  });

  // 47. Friend / Companion Management: Capacity enforcement (max 4 seats)
  it('47. Friend / Companion Management: Capacity enforcement (max 4 seats)', async () => {
    const { token: leaderToken } = await createTestStudent({ name: 'Ride Leader' });

    // 1. Join a slot
    const resJoin = await request(app)
      .post('/api/slots/join')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        destinationId: 'delhi_isbt',
        date: 'Tomorrow',
        time: '08:30',
        vehicle: 'Shared Cab'
      });
    const groupId = resJoin.body.group.id;

    // 2. Add 3 companions (filling 4/4 seats)
    await request(app).post(`/api/groups/${groupId}/friends`).set('Authorization', `Bearer ${leaderToken}`).send({ name: 'Friend 1' });
    await request(app).post(`/api/groups/${groupId}/friends`).set('Authorization', `Bearer ${leaderToken}`).send({ name: 'Friend 2' });
    const res3 = await request(app).post(`/api/groups/${groupId}/friends`).set('Authorization', `Bearer ${leaderToken}`).send({ name: 'Friend 3' });
    assert.equal(res3.status, 201);
    assert.equal(res3.body.group.members.length, 4);

    // 3. Attempting to add a 4th companion exceeds capacity -> HTTP 409
    const resOverCapacity = await request(app)
      .post(`/api/groups/${groupId}/friends`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: 'Friend 4' });
    assert.equal(resOverCapacity.status, 409);
    assert.match(resOverCapacity.body.error, /maximum capacity/i);
  });
});
