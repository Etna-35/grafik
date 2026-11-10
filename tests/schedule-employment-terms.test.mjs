// Isolated Postgres engine (PGlite); no .env, network, credentials or production database.
// PGLITE_MODULE_URL=file:///.../pglite/dist/index.js node tests/schedule-employment-terms.test.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {PGlite} = await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
const db = new PGlite();
const query = async (sql, params=[]) => {
  const result = await db.query(sql, params);
  return {...result, rowCount: result.rows.length || result.affectedRows || 0};
};
const pool = {query, connect:async()=>({query,release(){}})};
globalThis.etnaTermsTest = {pool,query,user:null};
const uri = code => 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const dbModule = uri('export const {pool,query}=globalThis.etnaTermsTest;');
const authModule = uri(`export const requireUser=async()=>globalThis.etnaTermsTest.user;
  export const audit=async()=>{};`);
async function load(name, exports='') {
  let source=await readFile(new URL(`../apps/api/src/${name}.ts`,import.meta.url),'utf8');
  const deps={
    './db.js':dbModule,'./auth.js':authModule,
    './features.js':uri('export const isFeatureEnabled=async()=>false;'),
    './finance.js':uri('export const getDailyRevenueForecast=async()=>null;'),
    './progress.js':uri('export const awardGreenScore=async()=>{};export const revokeGreenScore=async()=>{};'),
    './security.js':uri('export const hashPin=async()=>"test";export const verifyPin=async()=>false;'),
    './scheduleTerms.js':globalThis.termsModule,
    'zod':import.meta.resolve('zod')
  };
  source=source.replace(/from (["'])([^"']+)\1/g,(all,quote,path)=>deps[path]?`from ${JSON.stringify(deps[path])}`:all);
  const compiled=ts.transpileModule(source+'\n'+exports,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  return uri(compiled);
}
try {
  await db.exec(`CREATE TYPE employee_role AS ENUM ('owner','manager','waiter','bar','cook','dishwasher','other');
    CREATE TABLE employees(id uuid PRIMARY KEY, display_name text, role employee_role, schedule_role text,
      hourly_rate int, default_hours numeric DEFAULT 12, pay_model text DEFAULT 'hourly', is_active boolean DEFAULT true,
      archived_at timestamptz, start_date date, schedule_until date, birth_date date, updated_at timestamptz,
      is_hookah_master boolean, hookah_rate int);
    CREATE TABLE schedule_days(work_date date PRIMARY KEY,is_deadline boolean DEFAULT false,event_title text,event_note text,updated_at timestamptz);
    CREATE TABLE schedule_shifts(work_date date,employee_id uuid,planned_hours numeric,pay_amount int,pay_model text,
      role_override text,day_part text,created_by uuid,updated_by uuid,updated_at timestamptz,PRIMARY KEY(work_date,employee_id));
    CREATE TABLE schedule_month_rates(year int,month int,employee_id uuid,hourly_rate int,updated_at timestamptz,
      PRIMARY KEY(year,month,employee_id));
    CREATE TABLE payroll_payouts(employee_id uuid,work_date date,amount int);
    CREATE TABLE employee_service_access(employee_id uuid,service_id uuid,can_view boolean,can_edit boolean);
    CREATE TABLE services(id uuid,code text,is_active boolean);`);
  const v='11111111-1111-4111-8111-111111111111', owner='22222222-2222-4222-8222-222222222222';
  const fresh='33333333-3333-4333-8333-333333333333';
  await query(`INSERT INTO employees(id,display_name,role,schedule_role,hourly_rate)
    VALUES($1,'Victoria','waiter','waiter',200),($2,'Owner','owner',NULL,NULL),($3,'New','waiter','waiter',200)`,[v,owner,fresh]);
  await query(`INSERT INTO schedule_shifts VALUES
    ('2026-08-01',$1,10,2000,'hourly',NULL,NULL,$2,$2,NULL),
    ('2026-09-01',$1,10,2700,'hourly','bar',NULL,$2,$2,NULL),
    ('2026-10-01',$1,10,2000,'hourly',NULL,NULL,$2,$2,NULL),
    ('2026-11-01',$1,10,2000,'hourly',NULL,NULL,$2,$2,NULL),
    ('2026-11-02',$1,10,2000,'hourly','waiter',NULL,$2,$2,NULL),
    ('2026-11-03',$1,NULL,5000,'event',NULL,NULL,$2,$2,NULL)`,[v,owner]);
  await query("INSERT INTO payroll_payouts VALUES($1,'2026-11-05',15000)",[v]);
  const protectedRows=async()=>JSON.stringify((await query('SELECT * FROM schedule_shifts ORDER BY work_date')).rows)+JSON.stringify((await query('SELECT * FROM payroll_payouts')).rows);
  const before=await protectedRows();
  const migration=await readFile(new URL('../migrations/054_schedule_employment_terms.sql',import.meta.url),'utf8');
  await db.exec(migration);await db.exec(migration);
  assert.equal((await query('SELECT count(*)::int AS n FROM schedule_employment_terms')).rows[0].n,0);
  globalThis.termsModule=await load('scheduleTerms');
  const {saveEmploymentTerms}=await import(globalThis.termsModule);
  const terms={employeeId:v,effectiveMonth:'2026-11',scheduleRole:'bar',rate:270};
  await saveEmploymentTerms(terms,owner);
  assert.equal(await protectedRows(),before,'transfer and migration never rewrite existing shifts or payouts');
  const effective=async(date)=> (await query('SELECT schedule_role_on($1,$2::date) AS role,schedule_rate_on($1,$2::date) AS rate',[v,date])).rows[0];
  assert.deepEqual(await effective('2026-10-31'),{role:'waiter',rate:200});
  assert.deepEqual(await effective('2026-11-01'),{role:'bar',rate:270});
  assert.deepEqual(await effective('2026-12-15'),{role:'bar',rate:270});
  await saveEmploymentTerms(terms,owner);
  assert.equal((await query('SELECT count(*)::int AS n FROM schedule_employment_terms WHERE employee_id=$1',[v])).rows[0].n,2,'resave does not duplicate');
  await saveEmploymentTerms({...terms,effectiveMonth:'2027-01',scheduleRole:'cook',rate:320},owner);
  assert.deepEqual(await effective('2026-12-31'),{role:'bar',rate:270});
  assert.deepEqual(await effective('2027-01-01'),{role:'cook',rate:320});
  await assert.rejects(saveEmploymentTerms({...terms,employeeId:fresh,rate:0},owner));
  assert.equal((await query('SELECT count(*)::int AS n FROM schedule_employment_terms WHERE employee_id=$1',[fresh])).rows[0].n,0,'failure rolls back baseline too');
  const schedule=await import(await load('schedule','export {upsertShift,setMonthRate};'));
  // Execute the actual monthly employee query, including historical role, rate and sorting.
  const source=await readFile(new URL('../apps/api/src/schedule.ts',import.meta.url),'utf8');
  const employeeSql=[...source.matchAll(/`([^`]+)`/g)].map(x=>x[1]).find(x=>x.includes('AS schedule_role, default_hours'));
  // Fixture tables needed only for the roster visibility query.
  await db.exec('CREATE TABLE tasks(employee_id uuid,status text,approved_at timestamptz,reward_amount int,reward_month date);');
  const october=(await query(employeeSql,['2026-10-01'])).rows.find(x=>x.id===v);
  const november=(await query(employeeSql,['2026-11-01'])).rows.find(x=>x.id===v);
  assert.equal(october.schedule_role,'waiter');assert.equal(october.hourly_rate,200);
  assert.equal(november.schedule_role,'bar');assert.equal(november.hourly_rate,270);
  await schedule.upsertShift({employeeId:v,workDate:'2026-10-12',hours:10},owner);
  await schedule.upsertShift({employeeId:v,workDate:'2026-11-12',hours:10},owner);
  await schedule.upsertShift({employeeId:v,workDate:'2026-11-13',hours:10,roleOverride:'waiter',rate:200},owner);
  const pay=async(date)=>(await query('SELECT pay_amount,role_override FROM schedule_shifts WHERE employee_id=$1 AND work_date=$2',[v,date])).rows[0];
  assert.deepEqual(await pay('2026-10-12'),{pay_amount:2000,role_override:null});
  assert.deepEqual(await pay('2026-11-12'),{pay_amount:2700,role_override:null});
  assert.deepEqual(await pay('2026-11-13'),{pay_amount:2000,role_override:'waiter'});
  await schedule.setMonthRate({employeeId:v,year:2026,month:11,rate:300});
  await schedule.upsertShift({employeeId:v,workDate:'2026-11-14',hours:10,roleOverride:'bar'},owner);
  assert.equal((await pay('2026-11-14')).pay_amount,3000,'explicit selection of base role uses month rate');
  assert.equal((await pay('2026-11-13')).pay_amount,2000,'waiter shift unchanged by bar month rate');
  assert.equal((await pay('2026-11-03')).pay_amount,5000,'event unchanged');
  assert.equal((await pay('2026-10-01')).pay_amount,2000,'old months unchanged');
  await schedule.setMonthRate({employeeId:v,year:2026,month:11,rate:null});
  assert.equal((await pay('2026-11-12')).pay_amount,2700,'reset rate uses dated base, not original employee rate');
  const waiter=async(date,role=null)=>(await query('SELECT schedule_is_waiter_on($1,$2::date,$3) AS yes',[v,date,role])).rows[0].yes;
  assert.equal(await waiter('2026-10-01'),true);
  assert.equal(await waiter('2026-09-01','bar'),true,'legacy past algorithm preserved');
  assert.equal(await waiter('2026-11-01'),false);
  assert.equal(await waiter('2026-11-02','waiter'),true);
  await db.exec(`CREATE TABLE shift_closings(work_date date,cash_revenue int);
    INSERT INTO shift_closings SELECT DISTINCT work_date,10000 FROM schedule_shifts;`);
  const cash=await import(await load('cashPlan','export {waiterSequence};'));
  const sequence=await cash.waiterSequence(v);
  assert.ok(sequence.some(x=>x.date==='2026-10-01'));
  assert.ok(sequence.some(x=>x.date==='2026-11-02'));
  assert.ok(!sequence.some(x=>['2026-11-01','2026-11-12','2026-11-14'].includes(x.date)));
  const admin=await import(await load('admin','export {updateEmployee};'));
  const adminData={displayName:'Victoria',role:'waiter',isActive:true,scheduleRole:'waiter',defaultHours:12,
    hourlyRate:200,payModel:'hourly',isHookahMaster:false,hookahRate:0,services:[]};
  await assert.rejects(admin.updateEmployee(v,{...adminData,hourlyRate:300}),/use_employment_terms/);
  await admin.updateEmployee(v,adminData);
  assert.deepEqual(await effective('2026-10-31'),{role:'waiter',rate:200});
  // Route authorization and bad month: actual registered handlers with isolated auth fixture.
  const routes={};const app={get(){},post(){},delete(){},patch(){},put(path,fn){routes[path]=fn;}};
  schedule.registerScheduleRoutes(app);
  let code=200;const reply={code(n){code=n;return this;},send(body){return body;}};
  globalThis.etnaTermsTest.user={id:v,role:'waiter'};
  await routes['/api/schedule/employment-terms']({body:terms},reply);assert.equal(code,403);
  globalThis.etnaTermsTest.user={id:owner,role:'owner'};code=200;
  for (const bad of [{effectiveMonth:'2026-13'},{effectiveMonth:'2026-00'},{effectiveMonth:'2026-11-01'},
    {rate:null},{rate:0},{rate:270.5},{scheduleRole:'owner'}]) {
    code=200;await routes['/api/schedule/employment-terms']({body:{...terms,...bad}},reply);assert.equal(code,400);
  }
  const protectedBeforeSave=await protectedRows();code=200;
  await routes['/api/schedule/employment-terms']({body:terms},reply);assert.equal(code,200);
  assert.equal(await protectedRows(),protectedBeforeSave);
  assert.equal((await query('SELECT amount FROM payroll_payouts')).rows[0].amount,15000);
  console.log('PASS: migration rerun, no automatic data changes, dated roster/read/write, Oct/Nov and future cutoffs, baseline, idempotence, rollback, month rate/reset, role override, corporate shifts, waiter bonus eligibility, admin guard, authorization, invalid month, payout preservation.');
} finally {await db.close();delete globalThis.etnaTermsTest;delete globalThis.termsModule;}
