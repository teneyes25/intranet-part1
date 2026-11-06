// Isolated HTTP regression; synthetic signed sessions, never production credentials.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { encode } from 'next-auth/jwt';

const root = await mkdtemp(path.join(tmpdir(), 'erp-http-'));
const secret = randomBytes(32).toString('hex');
const port = 3187;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, NEXTAUTH_URL: base, NEXTAUTH_SECRET: secret, ERP_IMPORT_DIR: root, REDIS_URL: '', DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test' },
  stdio: ['ignore','pipe','pipe'],
});
let serverLog='';
child.stdout.on('data',d=>serverLog+=d);child.stderr.on('data',d=>serverLog+=d);
let count=0;
async function cookie(role) {
  return `next-auth.session-token=${await encode({ secret, token: { id: 'synthetic-test', name: 'Test', email: 'test@example.invalid', role, mustChangePassword: false, dealerActive: true, dealerRolloutActive: true }, maxAge: 600 })}`;
}
function file(bad=false) {
  return execFileSync('python3', ['-c', `import sys;sys.path.insert(0,'scripts/erp');from test_import_store import workbook;sys.stdout.buffer.write(workbook(bad=${bad ? 'True':'False'}))`]);
}
async function upload(auth, data, expected='', origin=base) {
  const form = new FormData();
  form.set('file', new File([data], 'test.xlsx'));
  form.set('kind','sales');form.set('period','2026-08');form.set('sheet','판매');form.set('expectedActive',expected);
  return fetch(base+'/api/erp/imports',{method:'POST',headers:{cookie:auth,origin},body:form});
}
async function cardUpload(auth) {
  const data=execFileSync('python3',['-c',"import sys;sys.path.insert(0,'scripts/erp');from test_review_store import card_workbook;sys.stdout.buffer.write(card_workbook())"]);
  const form=new FormData();form.set('file',new File([data],'card-test.xlsx'));
  form.set('kind','cards');form.set('period','2026-09');form.set('sheet','카드');
  return fetch(base+'/api/erp/imports',{method:'POST',headers:{cookie:auth,origin:base},body:form});
}
async function reviewRequest(auth, payload, origin=base) {
  return fetch(base+'/api/erp/reviews',{method:'POST',headers:{cookie:auth,origin,'Content-Type':'application/json'},body:JSON.stringify(payload)});
}
async function reviewState(auth) {
  const r=await fetch(base+'/api/erp/reviews',{headers:{cookie:auth}});assert.equal(r.status,200);return r.json();
}
try {
  let ready=false;
  for(let i=0;i<120;i++) {
    try { if ((await fetch(base+'/api/erp/imports')).status===401) {ready=true;break;} } catch {}
    await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(ready,'isolated server startup: '+serverLog.slice(-2000));
  assert.equal((await fetch(base+'/api/erp/imports')).status,401); count++;
  const admin=await cookie('ADMIN');
  const validData=file();
  for(const role of ['DEALER','HEADQUARTER']) {
    const auth=await cookie(role);
    assert.equal((await fetch(base+'/api/erp/imports',{headers:{cookie:auth}})).status,403);count++;
    assert.equal((await upload(auth,validData)).status,403);count++;
  }
  assert.equal((await upload(admin,validData,'',base+'.evil.invalid')).status,403);count++;
  let res=await upload(admin,validData);assert.equal(res.status,200);
  const first=await res.json();assert.equal(first.active,true);count++;
  res=await upload(admin,validData);assert.equal(res.status,200);assert.equal((await res.json()).duplicate,true);count++;
  res=await upload(admin,file(true),first.id);assert.equal(res.status,200);assert.equal((await res.json()).active,false);count++;
  const listing=await fetch(base+'/api/erp/imports',{headers:{cookie:admin}});
  assert.equal(listing.status,200);
  const rows=(await listing.json()).batches;
  assert.equal(rows.length,2);assert.equal(rows.find(r=>r.active).id,first.id);count++;
  assert.equal((await fetch(base+'/api/erp/reviews')).status,401);count++;
  for(const role of ['DEALER','HEADQUARTER']) {
    const auth=await cookie(role);
    assert.equal((await fetch(base+'/api/erp/reviews',{headers:{cookie:auth}})).status,403);count++;
    assert.equal((await reviewRequest(auth,{action:'save_review'})).status,403);count++;
  }
  assert.equal((await reviewRequest(admin,{action:'save_review'},base+'.evil.invalid')).status,403);count++;
  res=await cardUpload(admin);assert.equal(res.status,200);const card=await res.json();assert.equal(card.active,true);count++;
  let state=await reviewState(admin);
  const request=()=>({action:'allocate',period:'2026-08',fingerprint:state.fingerprint,categories:{'001':'EVERYDAY'}});
  assert.equal((await reviewRequest(admin,request())).status,422);count++;
  const review={action:'save_review',actor:'forged-actor',batch_id:card.id,source_row:2,expected_review:null,
    review:{status:'include',reason:'synthetic invoice checked',period:'2026-08',cost_class:'selling_admin',tax_type:'non_deductible',tax_amount:'0',detail_evidence:'invoice checked',duplicate_evidence:'bank entry checked',cancellation_evidence:'no cancellation'}};
  res=await reviewRequest(admin,review);assert.equal(res.status,200);const revision=await res.json();count++;
  assert.equal((await reviewRequest(admin,review)).status,409);count++;
  assert.equal((await reviewRequest(admin,request())).status,409);count++;
  state=await reviewState(admin);assert.equal(state.reviews[0].actor,'synthetic-test');count++;
  res=await reviewRequest(admin,request());assert.equal(res.status,200);
  const allocation=await res.json();assert.equal(allocation.result.total,101);assert.equal(allocation.result.difference,0);assert.equal(allocation.result.publishable,false);count++;
  res=await reviewRequest(admin,{...review,expected_review:revision.review_id,review:{status:'hold',reason:'additional invoice review'}});
  assert.equal(res.status,200);state=await reviewState(admin);assert.equal(state.allocations[0].stale,true);count++;
  if(process.env.ERP_UI_TEST==='1') {
    const {chromium}=await import('@playwright/test');
    const browser=await chromium.launch({headless:true});
    try {
      const page=await browser.newPage({viewport:{width:1440,height:1000}});
      await page.context().addCookies([{name:'next-auth.session-token',value:admin.split('=').slice(1).join('='),url:base}]);
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/admin/erp-imports');
      await page.getByRole('heading',{name:'비용 검토 → 월별 배부'}).waitFor();
      await page.getByLabel('검토 귀속월').fill('2026-08');
      await page.getByRole('button',{name:'보류',exact:true}).click();
      await page.getByRole('button',{name:'검토 저장',exact:true}).waitFor();
      await page.screenshot({path:process.env.ERP_UI_SCREENSHOT || '/tmp/erp-review-ui.png',fullPage:true});
      assert.deepEqual(errors,[]);count++;
    } finally {await browser.close();}
  }
  console.log(`PASS: ${count} HTTP/UI checks (auth, roles, origin, import, review, actor, allocation, stale revisions)`);
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,2000);});
  await rm(root,{recursive:true,force:true});
}
