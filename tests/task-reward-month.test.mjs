import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';

// API contracts only: no database connections or Telegram messages.
process.env.DATABASE_URL = 'postgres://unused/unused';
process.env.SESSION_SECRET = 'test-only';
process.env.PIN_PEPPER = 'test-only';
const { pool } = await import('../apps/api/src/db.ts');
const { registerTaskRoutes } = await import('../apps/api/src/tasks.ts');
const id = '11111111-1111-4111-8111-111111111111';

test('reward month API', async (t) => {
  let role = 'owner', found = true;
  const writes = [], original = pool.query;
  pool.query = async (sql, args = []) => {
    if (sql.includes('FROM sessions s')) return { rows: [{ id, display_name:'Test', role, is_active:true }] };
    if (sql.startsWith('UPDATE sessions')) return { rows: [] };
    if (/UPDATE tasks SET reward_month|INSERT INTO tasks/.test(sql)) {
      writes.push({ sql, args });
      return { rows: found ? [{ id }] : [] };
    }
    if (sql.includes('INSERT INTO audit_log')) return { rows: [] };
    throw new Error('Unexpected query: ' + sql);
  };
  const app = Fastify();
  app.register(cookie);
  registerTaskRoutes(app);
  const request = (payload, options={}) => app.inject({ method:'PATCH', url:`/api/tasks/${id}/reward-month`, cookies:{ etna_session:'test' }, payload, ...options });
  try {
    await t.test('authentication and manager scope', async () => {
      assert.equal((await request({rewardMonth:'2026-09'}, { cookies:{} })).statusCode, 401);
      role = 'waiter';
      assert.equal((await request({rewardMonth:'2026-09'})).statusCode, 403);
      assert.equal(writes.length, 0);
      role = 'owner';
    });
    await t.test('invalid or missing months cannot write', async () => {
      for (const rewardMonth of ['2026-00','2026-13','2026-9','2026-09-01','1999-12','2101-01',123,undefined]) {
        assert.equal((await request({rewardMonth})).statusCode, 400);
      }
      assert.equal(writes.length, 0);
    });
    await t.test('move to September/October or restore approval month without reapproval', async () => {
      for (const [rewardMonth, stored] of [['2026-09','2026-09-01'],['2026-10','2026-10-01'],[null,null]]) {
        assert.equal((await request({rewardMonth})).statusCode, 200);
        const write = writes.at(-1);
        assert.deepEqual(write.args, [id,stored]);
        assert.doesNotMatch(write.sql.split('WHERE')[0], /approved_at|status\s*=|reward_amount\s*=/);
      }
    });
    await t.test('task without an editable reward returns 404', async () => {
      found = false;
      assert.equal((await request({rewardMonth:'2026-09'})).statusCode, 404);
      found = true;
    });
    await t.test('create with explicit month or legacy payload; reject month without personal reward', async () => {
      for (const extra of [{}, {rewardMonth:'2026-09'}]) {
        const response = await request({ title:'Task',employeeId:id,rewardAmount:5000,...extra }, { method:'POST',url:'/api/tasks' });
        assert.equal(response.statusCode, 200);
        assert.equal(writes.at(-1).args[7], extra.rewardMonth ? '2026-09-01' : null);
      }
      const before = writes.length;
      for (const body of [{title:'Task',employeeId:id,rewardMonth:'2026-09'}, {title:'Task',audienceRole:'bar',rewardAmount:5000,rewardMonth:'2026-09'}]) {
        assert.equal((await request(body,{method:'POST',url:'/api/tasks'})).statusCode,400);
      }
      assert.equal(writes.length,before);
    });
  } finally {
    await app.close();
    pool.query = original;
    await pool.end();
  }
});
