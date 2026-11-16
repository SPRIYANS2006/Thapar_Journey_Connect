import { it } from 'node:test';
import assert from 'node:assert/strict';
import { api, setToken, clearToken } from '../src/services/api.js';

it('ride chat API loads history and posts messages using the authenticated group endpoints', async t => {
  setToken('local-chat-test-token');
  t.after(clearToken);
  const message = { id: 'chat-message', text: 'Meet at Main Gate' };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json(options.method === 'POST' ? { success: true, message } : [message]);
  });
  for (const groupId of ['campus-group', 'cr_community']) {
    assert.deepEqual(await api.getMessages(groupId), [message]);
    assert.deepEqual(await api.sendMessage(groupId, message.text), { success: true, message });
  }
  assert.deepEqual(calls.map(call => call.url), [
    '/api/groups/campus-group/messages', '/api/groups/campus-group/messages',
    '/api/groups/cr_community/messages', '/api/groups/cr_community/messages'
  ]);
  for (const { options } of calls) {
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers.Authorization, 'Bearer local-chat-test-token');
    if (options.method === 'POST') assert.deepEqual(JSON.parse(options.body), { text: message.text });
  }
});

it('ride chat API reports a server failure to the caller', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Temporary chat failure' }, { status: 503 }));
  await assert.rejects(api.getMessages('campus-group'), { message: 'Temporary chat failure', status: 503 });
  await assert.rejects(api.sendMessage('campus-group', 'Hello'), { message: 'Temporary chat failure', status: 503 });
});
