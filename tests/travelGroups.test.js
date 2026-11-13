import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-at-least-32-characters-long-1234567890';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.APP_ORIGIN = 'http://localhost:5173';

const { createApp } = await import('../server/app.js');
const { seedDefaultData } = await import('../server/config/db.js');
const { User, TravelGroup, TravelGroupMessage } = await import('../server/models/index.js');
const { generateSessionToken } = await import('../server/middleware/auth.js');

describe('Train Groups & Bus Groups - Feature Acceptance Tests', () => {
  let mongod;
  let app;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      process.env.MONGODB_URI = uri;
      await mongoose.connect(uri);
    }
    await seedDefaultData();
    app = createApp();
  });

  after(async () => {
    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    await TravelGroup.deleteMany({});
    await TravelGroupMessage.deleteMany({});
    await User.deleteMany({});
  });

  async function createTestStudent(overrides = {}) {
    const id = overrides.id || `user_${Math.random().toString(36).substring(7)}`;
    const email = overrides.email || `${id}@thapar.edu`;
    const user = await User.create({
      id,
      email,
      name: overrides.name || 'Test Student',
      hostel: overrides.hostel || 'Hostel B',
      reliability: overrides.reliability !== undefined ? overrides.reliability : 5.0,
      role: overrides.role || 'student',
      joined_community: overrides.joined_community || null,
      phone: overrides.phone || '+91 9876543210'
    });
    const token = generateSessionToken(user);
    return { user, token };
  }

  // 1. Create Train Group with full validation
  it('1. Create Train Group with full validation -> HTTP 201 and creator is Admin', async () => {
    const { user, token } = await createTestStudent({ name: 'Aryan Sharma', joined_community: 'del' });

    const payload = {
      type: 'Train',
      title: 'Shatabdi Express Cohort to Delhi',
      communityId: 'del',
      date: '2026-11-25',
      departureTime: '17:30',
      boardingPoint: 'Patiala Railway Station',
      destination: 'New Delhi Railway Station (NDLS)',
      trainNumber: '12005 Kalka Shatabdi',
      travelClass: 'CC',
      description: 'Book your tickets in coach C2 or C3 so we can sit together!'
    };

    const res = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.group.type, 'Train');
    assert.equal(res.body.group.title, payload.title);
    assert.equal(res.body.group.trainNumber, '12005 Kalka Shatabdi');
    assert.equal(res.body.group.travelClass, 'CC');
    assert.equal(res.body.group.membersCount, 1);
    assert.equal(res.body.group.isMember, true);
    assert.equal(res.body.group.members[0].role, 'Admin');
    assert.equal(res.body.group.members[0].userId, user.id);
  });

  // 2. Train Group creation requires trainNumber and valid departureTime
  it('2. Train Group creation rejects missing trainNumber and invalid time -> HTTP 400', async () => {
    const { token } = await createTestStudent();

    // Missing trainNumber
    const resNoTrain = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'Train',
        title: 'Train to Delhi',
        communityId: 'del',
        date: '2026-11-25',
        departureTime: '17:30',
        boardingPoint: 'Patiala Railway Station',
        destination: 'New Delhi'
      });

    assert.equal(resNoTrain.status, 400);
    assert.match(resNoTrain.body.error, /Train number \/ name is required/i);

    // Invalid departureTime
    const resBadTime = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'Train',
        title: 'Train to Delhi',
        communityId: 'del',
        date: '2026-11-25',
        departureTime: 'evening 5pm',
        boardingPoint: 'Patiala Railway Station',
        destination: 'New Delhi',
        trainNumber: '12005'
      });

    assert.equal(resBadTime.status, 400);
    assert.match(resBadTime.body.error, /Valid departure time/i);
  });

  // 3. Create Bus Group with full validation
  it('3. Create Bus Group with operator -> HTTP 201 and correct bus attributes', async () => {
    const { token } = await createTestStudent({ name: 'Simran Kaur', joined_community: 'chd' });

    const payload = {
      type: 'Bus',
      title: 'PRTC AC Bus to Sector 43 Chandigarh',
      communityId: 'chd',
      date: '2026-11-26',
      departureTime: '09:15',
      boardingPoint: 'Patiala Bus Stand (Counter 4)',
      destination: 'Chandigarh ISBT Sector 43',
      busOperator: 'PRTC AC Volvo',
      description: 'Taking the 9:15 AM Volvo bus.'
    };

    const res = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.group.type, 'Bus');
    assert.equal(res.body.group.busOperator, 'PRTC AC Volvo');
    assert.equal(res.body.group.boardingPoint, payload.boardingPoint);
  });

  // 4. Bus Group creation requires busOperator
  it('4. Bus Group creation rejects missing busOperator -> HTTP 400', async () => {
    const { token } = await createTestStudent();

    const res = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'Bus',
        title: 'Bus to Chandigarh',
        communityId: 'chd',
        date: '2026-11-26',
        departureTime: '09:00',
        boardingPoint: 'Patiala Bus Stand',
        destination: 'Chandigarh'
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Bus operator name is required/i);
  });

  // 5. Cross-community discovery: students can discover and join groups across any community without changing hometown
  it('5. Cross-community discovery: Delhi student can list and join Chandigarh group without hometown change', async () => {
    const { token: token1 } = await createTestStudent({ name: 'Chandigarh Creator', joined_community: 'chd' });
    const { user: delhiUser, token: token2 } = await createTestStudent({ name: 'Delhi Student', joined_community: 'del' });

    // 1. Create group in Chandigarh community
    const createRes = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        type: 'Bus',
        title: 'Weekend Bus to Chandigarh',
        communityId: 'chd',
        date: '2026-11-27',
        departureTime: '10:00',
        boardingPoint: 'Patiala Bypass',
        destination: 'Chandigarh',
        busOperator: 'IntrCity SmartBus'
      });
    const groupId = createRes.body.group.id;

    // 2. Delhi student discovers group by searching all communities
    const listRes = await request(app)
      .get('/api/travel-groups?communityId=chd')
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.length, 1);
    assert.equal(listRes.body[0].id, groupId);
    assert.equal(listRes.body[0].isMember, false);

    // 3. Delhi student joins the Chandigarh travel group
    const joinRes = await request(app)
      .post(`/api/travel-groups/${groupId}/join`)
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(joinRes.status, 200);
    assert.equal(joinRes.body.success, true);
    assert.equal(joinRes.body.group.membersCount, 2);

    // 4. Verify Delhi student's hometown membership remained unchanged ('del')
    const refreshedUser = await User.findOne({ id: delhiUser.id });
    assert.equal(refreshedUser.joined_community, 'del');

    // 5. Verify the group appears in Delhi student's /mine endpoint
    const mineRes = await request(app)
      .get('/api/travel-groups/mine')
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(mineRes.status, 200);
    assert.equal(mineRes.body.length, 1);
    assert.equal(mineRes.body[0].id, groupId);
  });

  // 6. Duplicate join prevention
  it('6. Duplicate join prevention -> HTTP 400 when attempting to join twice', async () => {
    const { token: token1 } = await createTestStudent({ name: 'Creator' });
    const { token: token2 } = await createTestStudent({ name: 'Joiner' });

    const createRes = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        type: 'Train',
        title: 'Intercity to Ambala',
        communityId: 'del',
        date: '2026-11-28',
        departureTime: '14:00',
        boardingPoint: 'Patiala Station',
        destination: 'Ambala Cantt',
        trainNumber: '14508'
      });
    const groupId = createRes.body.group.id;

    // First join -> OK
    const join1 = await request(app)
      .post(`/api/travel-groups/${groupId}/join`)
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(join1.status, 200);

    // Second join -> HTTP 400
    const join2 = await request(app)
      .post(`/api/travel-groups/${groupId}/join`)
      .set('Authorization', `Bearer ${token2}`);
    assert.equal(join2.status, 400);
    assert.match(join2.body.error, /already a member/i);
  });

  // 7. Member departure, admin succession, and group cleanup
  it('7. Leaving travel group: admin reassigns to oldest member; empty group deletes automatically', async () => {
    const { token: t1 } = await createTestStudent({ name: 'Admin Student' });
    const { user: u2, token: t2 } = await createTestStudent({ name: 'Second Student' });

    const createRes = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${t1}`)
      .send({
        type: 'Train',
        title: 'Shatabdi to Ludhiana',
        communityId: 'del',
        date: '2026-11-29',
        departureTime: '18:00',
        boardingPoint: 'Patiala',
        destination: 'Ludhiana',
        trainNumber: '12029'
      });
    const groupId = createRes.body.group.id;

    // Student 2 joins
    await request(app)
      .post(`/api/travel-groups/${groupId}/join`)
      .set('Authorization', `Bearer ${t2}`);

    // Admin (u1) leaves -> u2 should succeed as Admin
    const leave1 = await request(app)
      .post(`/api/travel-groups/${groupId}/leave`)
      .set('Authorization', `Bearer ${t1}`);
    assert.equal(leave1.status, 200);
    assert.equal(leave1.body.group.membersCount, 1);
    assert.equal(leave1.body.group.members[0].userId, u2.id);
    assert.equal(leave1.body.group.members[0].role, 'Admin');

    // Student 2 leaves -> last member leaves -> group is archived/deleted
    const leave2 = await request(app)
      .post(`/api/travel-groups/${groupId}/leave`)
      .set('Authorization', `Bearer ${t2}`);
    assert.equal(leave2.status, 200);
    assert.equal(leave2.body.group, null);

    const checkDb = await TravelGroup.findOne({ id: groupId });
    assert.equal(checkDb, null);
  });

  // 8. Group chat security & messaging
  it('8. Group chat security: non-member blocked HTTP 403; member can post and read messages', async () => {
    const { token: memberToken } = await createTestStudent({ name: 'Cohort Member', hostel: 'Hostel-M' });
    const { token: outsiderToken } = await createTestStudent({ name: 'Outsider Student' });

    const createRes = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        type: 'Bus',
        title: 'Delhi Volvo Group',
        communityId: 'del',
        date: '2026-11-30',
        departureTime: '07:30',
        boardingPoint: 'Patiala Bus Stand',
        destination: 'ISBT Kashmiri Gate',
        busOperator: 'Zingbus Electric'
      });
    const groupId = createRes.body.group.id;

    // 1. Outsider attempts to read messages -> HTTP 403 Forbidden
    const getOutsider = await request(app)
      .get(`/api/travel-groups/${groupId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    assert.equal(getOutsider.status, 403);
    assert.match(getOutsider.body.error, /must join this travel group/i);

    // 2. Outsider attempts to post message -> HTTP 403 Forbidden
    const postOutsider = await request(app)
      .post(`/api/travel-groups/${groupId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ text: 'Hey can I join?' });
    assert.equal(postOutsider.status, 403);

    // 3. Member posts empty message -> HTTP 400
    const postEmpty = await request(app)
      .post(`/api/travel-groups/${groupId}/messages`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ text: '   ' });
    assert.equal(postEmpty.status, 400);
    assert.match(postEmpty.body.error, /cannot be empty/i);

    // 4. Member posts valid message -> HTTP 201
    const postMsg = await request(app)
      .post(`/api/travel-groups/${groupId}/messages`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ text: 'I booked seat 14 in the upper deck!' });
    assert.equal(postMsg.status, 201);
    assert.equal(postMsg.body.success, true);
    assert.equal(postMsg.body.message.text, 'I booked seat 14 in the upper deck!');
    assert.equal(postMsg.body.message.senderName, 'Cohort Member');

    // 5. Member reads messages -> HTTP 200 with 1 message
    const getMember = await request(app)
      .get(`/api/travel-groups/${groupId}/messages`)
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(getMember.status, 200);
    assert.equal(getMember.body.length, 1);
    assert.equal(getMember.body[0].text, 'I booked seat 14 in the upper deck!');
  });

  // 9. Phone privacy: Co-riders see phone numbers, outsiders do not
  it('9. Phone privacy: Phone numbers are masked for outsiders and visible to joined co-riders', async () => {
    const { token: t1 } = await createTestStudent({ name: 'Rider One', phone: '+91 9999988888' });
    const { token: t2 } = await createTestStudent({ name: 'Rider Two', phone: '+91 7777766666' });
    const { token: outsiderToken } = await createTestStudent({ name: 'Outsider' });

    const createRes = await request(app)
      .post('/api/travel-groups')
      .set('Authorization', `Bearer ${t1}`)
      .send({
        type: 'Train',
        title: 'Chandigarh Morning Train',
        communityId: 'chd',
        date: '2026-12-01',
        departureTime: '06:45',
        boardingPoint: 'Patiala',
        destination: 'Chandigarh',
        trainNumber: '12057'
      });
    const groupId = createRes.body.group.id;

    // t2 joins
    await request(app)
      .post(`/api/travel-groups/${groupId}/join`)
      .set('Authorization', `Bearer ${t2}`);

    // Outsider views group -> phone masked or empty
    const outsiderView = await request(app)
      .get(`/api/travel-groups/${groupId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    assert.equal(outsiderView.status, 200);
    outsiderView.body.members.forEach((m) => {
      assert.equal(m.phone || '', '');
    });

    // Joined member t2 views group -> sees Rider One phone number
    const memberView = await request(app)
      .get(`/api/travel-groups/${groupId}`)
      .set('Authorization', `Bearer ${t2}`);
    assert.equal(memberView.status, 200);
    const riderOne = memberView.body.members.find((m) => m.name === 'Rider One');
    assert.equal(riderOne.phone, '+91 9999988888');
  });
});
