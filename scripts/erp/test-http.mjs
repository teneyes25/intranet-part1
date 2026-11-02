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
  console.log(`PASS: ${count} HTTP assertions (auth, roles, origin, import, duplicate, quarantine, history)`);
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,2000);});
  await rm(root,{recursive:true,force:true});
}
