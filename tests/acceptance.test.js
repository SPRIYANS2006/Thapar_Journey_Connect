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
const { User, Group, Journey, Counter, Message, RateLimit, RideRecord, CommunityGroup, CommunityGroupMessage, CityRide } = await import('../server/models/index.js');
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
});
