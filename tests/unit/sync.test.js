/**
 * sync.test.js — the Covenant Circle transport.
 *
 * Uses a mock fetch to verify the RPC contract without a live Supabase, and
 * to prove the adapter degrades honestly when the network is gone.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { LocalAdapter, SupabaseAdapter, createAdapter } from '../../src/core/storage.js';
import { emptyState, shareable, addIdentity } from '../../src/core/state.js';

const ME = { playerId: 'plr_1', displayName: 'Sam', newName: 'Caleb', snapshot: { stats: { steps: 3 } } };

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts, body: opts?.body ? JSON.parse(opts.body) : null });
    return handler({ url: String(url), opts, calls });
  };
  return calls;
}

function jsonRes(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

let originalFetch;
beforeEach(() => { originalFetch = globalThis.fetch; });
afterEach(() => { globalThis.fetch = originalFetch; });

describe('adapter selection', () => {
  test('defaults to local when nothing is configured', () => {
    assert.ok(createAdapter(emptyState()) instanceof LocalAdapter);
  });

  test('stays local when the mode is set but credentials are missing', () => {
    const s = emptyState();
    s.settings.syncMode = 'supabase';
    assert.ok(createAdapter(s) instanceof LocalAdapter, 'must not claim live without credentials');
  });

  test('goes live only with a url AND a key', () => {
    const s = emptyState();
    s.settings.syncMode = 'supabase';
    s.settings.supabaseUrl = 'https://x.supabase.co';
    s.settings.supabaseKey = 'anon-key';
    assert.ok(createAdapter(s) instanceof SupabaseAdapter);
  });
});

describe('local adapter is a real, working circle', () => {
  test('creates a circle and round-trips messages', async () => {
    const state = emptyState();
    const a = new LocalAdapter(state);
    const join = await a.joinCircle('', ME);
    assert.equal(join.ok, true);
    assert.ok(join.code.length >= 16);
    assert.equal(a.live, false, 'must be honest that it is not live');

    await a.sendMessage('first word', ME);
    const msgs = await a.fetchMessages();
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].body, 'first word');
    assert.equal(msgs[0].playerId, 'plr_1');
  });

  test('caps stored history so the save cannot grow without bound', async () => {
    const state = emptyState();
    const a = new LocalAdapter(state);
    await a.joinCircle('', ME);
    for (let i = 0; i < 520; i++) await a.sendMessage(`m${i}`, ME);
    assert.ok(state.circle.messages.length <= 500);
  });

  test('leaving clears the circle', async () => {
    const state = emptyState();
    const a = new LocalAdapter(state);
    await a.joinCircle('', ME);
    await a.leaveCircle(ME);
    assert.equal(state.circle.code, null);
  });
});

describe('supabase adapter speaks RPC, never raw tables', () => {
  test('CRITICAL: never hits a table endpoint directly', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    const calls = mockFetch(() => jsonRes([]));

    await a.fetchMembers();
    await a.fetchMessages();
    await a.sendMessage('hi', ME);
    await a.joinCircle('ABCD-EFGH-IJKL-MNPQ', ME);
    await a.pushSnapshot(ME, { stats: {} });

    assert.ok(calls.length >= 5);
    for (const c of calls) {
      assert.match(c.url, /\/rest\/v1\/rpc\//, `direct table access would expose every circle: ${c.url}`);
    }
  });

  test('always passes the circle code as an argument', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    const calls = mockFetch(() => jsonRes([]));
    await a.fetchMessages();
    assert.equal(calls[0].body.p_code, 'ABCD-EFGH-IJKL-MNPQ');
  });

  test('sends the anon key in both required headers', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'my-anon-key', state });
    const calls = mockFetch(() => jsonRes([]));
    await a.fetchMembers();
    assert.equal(calls[0].opts.headers.apikey, 'my-anon-key');
    assert.equal(calls[0].opts.headers.Authorization, 'Bearer my-anon-key');
  });

  test('maps snake_case rows onto the client shape', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    mockFetch(() => jsonRes([{
      player_id: 'p2', display_name: 'Jo', new_name: 'Deborah',
      snapshot: { stats: { steps: 9 } },
      joined_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-11T00:00:00Z',
    }]));
    const members = await a.fetchMembers();
    assert.equal(members[0].playerId, 'p2');
    assert.equal(members[0].newName, 'Deborah');
    assert.equal(members[0].snapshot.stats.steps, 9);
    assert.ok(members[0].joinedAt > 0);
  });

  test('truncates an over-long message rather than failing', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    const calls = mockFetch(() => jsonRes('uuid-1'));
    await a.sendMessage('x'.repeat(5000), ME);
    assert.equal(calls[0].body.p_body.length, 2000);
  });
});

describe('the adapter fails honestly', () => {
  test('a network outage does not lose the locally cached history', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    state.circle.messages = [{ id: 'm1', body: 'cached', playerId: 'p1', createdAt: 1 }];
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    globalThis.fetch = async () => { throw new Error('offline'); };

    const msgs = await a.fetchMessages();
    assert.equal(msgs.length, 1, 'must fall back to what is on the device');
    assert.equal(msgs[0].body, 'cached');
  });

  test('reports offline in a way a person can act on', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    globalThis.fetch = async () => { throw new Error('offline'); };
    const s = await a.status();
    assert.equal(s.live, false);
    assert.match(s.message, /cannot reach/i);
  });

  test('a missing schema tells you to run the SQL, not "404"', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    mockFetch(() => jsonRes({ message: 'not found' }, 404));
    const s = await a.status();
    assert.match(s.message, /schema\.sql/i);
  });

  test('a rejected key says so plainly', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'bad', state });
    mockFetch(() => jsonRes({ message: 'JWT invalid' }, 401));
    const r = await a.sendMessage('hi', ME);
    assert.equal(r.ok, false);
    assert.match(r.error, /anon \(publishable\) key/i);
  });

  test('rate limiting is surfaced kindly', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    mockFetch(() => jsonRes({ message: 'slow down' }, 400));
    const r = await a.sendMessage('spam', ME);
    assert.match(r.error, /slow down/i);
  });

  test('refuses to act without a circle', async () => {
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state: emptyState() });
    const r = await a.sendMessage('hi', ME);
    assert.equal(r.ok, false);
    assert.match(r.error, /not in a circle/i);
  });
});

describe('what actually crosses the wire', () => {
  test('the pushed snapshot contains stats, never the vault', async () => {
    const state = emptyState();
    state.circle.code = 'ABCD-EFGH-IJKL-MNPQ';
    addIdentity(state, { statement: 'I am a man who trains before sunrise', domain: 'body' });
    const a = new SupabaseAdapter({ url: 'https://x.supabase.co', key: 'k', state });
    const calls = mockFetch(() => jsonRes(null));

    await a.pushSnapshot(ME, shareable(state));
    const sent = JSON.stringify(calls[0].body);
    assert.match(sent, /trains before sunrise/, 'identity statements are shared by design');
    assert.ok(!sent.includes('vault'));
    assert.ok(!sent.includes('why'));
  });
});
