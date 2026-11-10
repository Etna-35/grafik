// Uses ONLY temporary tables with search_path=pg_temp. All fixtures roll back.
// Run: TEST_DATABASE_URL=... node tests/task-reward-month-postgres.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required');
const sources = globalThis.rewardMonthTestSource || Object.fromEntries(await Promise.all(
  ['schedule','payroll','money'].map(async name => [name, await readFile(new URL(`../apps/api/src/${name}.ts`, import.meta.url),'utf8')])
));
const migration = globalThis.rewardMonthTestMigration || await readFile(new URL('../migrations/053_task_reward_month.sql',import.meta.url),'utf8');
const sqls = name => [...sources[name].matchAll(/`([^`]+)`/g)].map(m=>m[1]);
const queries = {
  schedule: sqls('schedule').find(s=>s.includes('SELECT employee_id, SUM(reward_amount)') && s.includes('FROM tasks')),
  breakdown: sqls('schedule').find(s=>s.includes('SELECT title, reward_amount AS amount FROM tasks')),
  payroll: sqls('payroll').find(s=>s.includes('FROM tasks') && s.includes('SELECT id::text, title, reward_amount')),
  money: sqls('money').find(s=>s.includes('WITH acc AS'))
};
assert.ok(Object.values(queries).every(Boolean));
const c = new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
await c.connect();
try {
  await c.query('BEGIN');
  await c.query('SET LOCAL search_path=pg_temp');
  await c.query("SET LOCAL timezone='Europe/Moscow'");
  await c.query(`CREATE TEMP TABLE tasks(id uuid,title text,employee_id uuid,status text,reward_amount int,approved_at timestamptz);
    CREATE TEMP TABLE schedule_shifts(employee_id uuid,pay_amount int,work_date date);
    CREATE TEMP TABLE sales_goals(employee_id uuid,reward_amount int,status text,confirmed_at timestamptz);
    CREATE TEMP TABLE cash_streak_awards(employee_id uuid,bonus_amount int,streak_end_date date);
    CREATE TEMP TABLE payroll_payouts(employee_id uuid,amount int,work_date date,apply_month date,obligation_id uuid)`);
  await c.query(migration);
  await c.query(migration); // rerun must not change existing data or fail
  const emp='11111111-1111-4111-8111-111111111111';
  const id='22222222-2222-4222-8222-222222222222';
  await c.query(`INSERT INTO tasks VALUES($1,'Monthly bonus',$2,'done',5000,'2026-11-10 12:00+03',NULL)`,[id,emp]);
  async function check(month, expected) {
    const start=`2026-${month}-01`;
    const schedule=(await c.query(queries.schedule,[start])).rows;
    const breakdown=(await c.query(queries.breakdown,[emp,start])).rows;
    const payroll=(await c.query(queries.payroll,[start,emp])).rows;
    const money=(await c.query(queries.money,[start])).rows;
    assert.equal(schedule.reduce((n,r)=>n+Number(r.v),0),expected,'schedule '+month);
    assert.equal(breakdown.reduce((n,r)=>n+Number(r.amount),0),expected,'breakdown '+month);
    assert.equal(payroll.reduce((n,r)=>n+Number(r.reward_amount),0),expected,'payroll '+month);
    assert.equal(Number(money[0].total),expected,'money '+month);
  }
  await check('11',5000);await check('09',0);
  await c.query("UPDATE tasks SET reward_month='2026-09-01' WHERE id=$1",[id]);
  await check('09',5000);await check('11',0);
  await c.query("UPDATE tasks SET reward_month='2026-10-01' WHERE id=$1",[id]);
  await check('09',0);await check('10',5000);
  assert.equal((await c.query('SELECT approved_at::text FROM tasks WHERE id=$1',[id])).rows[0].approved_at,'2026-11-10 12:00:00+03');
  await c.query('UPDATE tasks SET reward_month=NULL WHERE id=$1',[id]);
  await check('10',0);await check('11',5000);
  // Two monthly awards, even if both approved in November, must not double count in November.
  await c.query("UPDATE tasks SET reward_month='2026-09-01' WHERE id=$1",[id]);
  await c.query(`INSERT INTO tasks VALUES('33333333-3333-4333-8333-333333333333','Second month',$1,'done',5000,'2026-11-10 12:00+03','2026-10-01')`,[emp]);
  await check('09',5000);await check('10',5000);await check('11',0);
  await c.query("UPDATE tasks SET approved_at=NULL WHERE reward_month='2026-09-01'");
  await check('09',0);
  await c.query("UPDATE tasks SET status='cancelled' WHERE reward_month='2026-10-01'");
  await check('10',0);
  await c.query('SAVEPOINT invalid_month');
  await assert.rejects(c.query("UPDATE tasks SET reward_month='2026-09-15'"),/tasks_reward_month_first_day/);
  await c.query('ROLLBACK TO SAVEPOINT invalid_month');
  console.log('PASS: migration rerun, legacy fallback, September/October moves, preserved approval, two monthly awards, pending/cancelled exclusion; four payroll readers agree. Temporary tables rolled back.');
} finally {
  await c.query('ROLLBACK');
  await c.end();
}
