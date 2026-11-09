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
  const dashboardUrl=base+'/api/erp/dashboard?period=2026-08';
  assert.equal((await fetch(dashboardUrl)).status,401);count++;
  for(const role of ['DEALER','HEADQUARTER']) {
    assert.equal((await fetch(dashboardUrl,{headers:{cookie:await cookie(role)}})).status,403);count++;
  }
  assert.equal((await fetch(base+'/api/erp/dashboard?period=2026-99',{headers:{cookie:admin}})).status,422);count++;
  let dashboard=await fetch(dashboardUrl,{headers:{cookie:admin}});
  assert.equal(dashboard.status,200);assert.match(dashboard.headers.get('cache-control'),/(^|,\s*)no-store(,|$)/);
  let report=await dashboard.json();assert.equal(report.metrics.net_sales,'82');assert.equal(report.metrics.profit,null);
  assert.equal(report.allocation_id,null);assert.equal(report.metrics.stock_quantity,null);assert.equal(report.publishable,false);count++;
  // Full source→review→allocation→dashboard flow in a separate synthetic month slot.
  for(const kind of ['sales','purchases','stock']) {
    const bytes=execFileSync('python3',['-c',`import sys;sys.path.insert(0,'scripts/erp');from test_dashboard import sample_workbook;sys.stdout.buffer.write(sample_workbook('${kind}'))`]);
    const form=new FormData();form.set('file',new File([bytes],'synthetic.xlsx'));form.set('kind',kind);form.set('period','2026-08');form.set('sheet',kind==='sales'?'판매':kind);
    if(kind==='sales') {
      // Rename the generated sales sheet so this is a revision, not a second active sales scope.
      const revised=execFileSync('python3',['-c',"import sys,io,openpyxl;sys.path.insert(0,'scripts/erp');from test_dashboard import sample_workbook;w=openpyxl.load_workbook(io.BytesIO(sample_workbook()));w.active.title='판매';o=io.BytesIO();w.save(o);sys.stdout.buffer.write(o.getvalue())"]);
      form.set('file',new File([revised],'synthetic.xlsx'));form.set('expectedActive',first.id);
    }
    const uploaded=await fetch(base+'/api/erp/imports',{method:'POST',headers:{cookie:admin,origin:base},body:form});
    assert.equal(uploaded.status,200);assert.equal((await uploaded.json()).active,true);count++;
  }
  state=await reviewState(admin);const latestReview=state.reviews.find(r=>r.batch_id===card.id&&r.source_row===2);
  res=await reviewRequest(admin,{...review,expected_review:latestReview.id});assert.equal(res.status,200);
  state=await reviewState(admin);
  res=await reviewRequest(admin,{action:'allocate',period:'2026-08',fingerprint:state.fingerprint,categories:{A:'EVERYDAY'}});assert.equal(res.status,200);count++;
  dashboard=await fetch(dashboardUrl,{headers:{cookie:admin}});assert.equal(dashboard.status,200);report=await dashboard.json();
  assert.equal(report.metrics.net_sales,'200');assert.equal(report.metrics.purchase_cost,'60');assert.equal(report.metrics.profit,'39');
  assert.equal(report.metrics.stock_quantity,'3');assert.equal(report.metrics.selling_stock_value,'330');assert.equal(report.channels[0].profit,'39');
  assert.equal(report.products[0].unit_total_cost,'81');assert.equal(report.sale_lines[0].cost_source.date,'2026-08-01');count++;
  execFileSync('python3',['-c',`import sys,base64
sys.path.insert(0,'scripts/erp')
from preview_history import select_preview
from import_store import connect
db=connect(sys.argv[1])
args=dict(actor='test',period='2026-08',expectedRevision=0,inputs=[])
for kind in ('sales','purchases'):
    row=db.execute('select sheet,batch_id from active where period=? and kind=?',('2026-08',kind)).fetchone()
    data=db.execute('select original from batches where id=?',(row['batch_id'],)).fetchone()[0]
    args['inputs'].append(dict(period='2026-08',kind=kind,sheet=row['sheet'],filename='test.xlsx',data=base64.b64encode(data).decode()))
assert select_preview(db,args)['revision']==1
`,root]);
  const read=async(url,auth)=>fetch(url,{headers:{cookie:auth}});
  const selectedResponse=await read(dashboardUrl,admin);
  assert.equal(selectedResponse.status,200);
  const chosen=await selectedResponse.json();
  assert.equal(chosen.selection_revision,1);assert.ok(chosen.sources.length>=2);
  const ids=new Set(chosen.sources.map(s=>s.id));
  assert.ok(chosen.sale_lines.every(row=>ids.has(row.source.batch_id)));
  for(const role of ['DEALER','HEADQUARTER']){
    const denied=await read(dashboardUrl,await cookie(role));
    assert.equal(denied.status,403);assert.equal((await denied.json()).sources,undefined);
  }
  const other=await read(base+'/api/erp/dashboard?period=2026-10',admin);
  assert.equal(other.status,422);assert.equal((await other.json()).sources,undefined);
  assert.deepEqual(await (await read(dashboardUrl,admin)).json(),chosen);
  count+=5;
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
      await page.getByRole('button',{name:'배부 포함',exact:true}).click();
      await page.getByRole('button',{name:'검토 저장',exact:true}).waitFor();
      await page.screenshot({path:process.env.ERP_UI_SCREENSHOT || '/tmp/erp-review-ui.png',fullPage:true});
      await page.goto(base+'/admin/erp-dashboard');
      await page.getByLabel('대시보드 자료월').fill('2026-08');
      await page.getByRole('heading',{name:'상품별 원가·손익',exact:true}).waitFor();
      await page.getByLabel('품목 검색').fill('missing');
      await page.getByText('표시할 품목이 없습니다.').waitFor();
      await page.getByLabel('품목 검색').fill('A');
      await page.getByLabel('채널 필터').selectOption('온라인');
      await page.screenshot({path:'/tmp/erp-dashboard-desktop.png',fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:'/tmp/erp-dashboard-mobile.png',fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
      await page.getByLabel('대시보드 자료월').fill('2026-09');
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('heading',{name:'상품별 원가·손익',exact:true}).count(),0);
      assert.deepEqual(errors,[]);count+=6;
    } finally {await browser.close();}
  }
  console.log(`PASS: ${count} ${process.env.ERP_UI_TEST==='1'?'HTTP/UI':'HTTP'} checks (auth, roles, origin, import, review, actor, allocation, stale revisions)`);
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,2000);});
  await rm(root,{recursive:true,force:true});
}
