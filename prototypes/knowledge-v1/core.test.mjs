import test from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgePrototype, sha256 } from './core.mjs';
const service = { kind: 'sync-service', tenantId: 'fm' };
const sales = { kind: 'user', tenantId: 'fm', active: true, groups: ['sales'] };
function fixture() {
  let now = 0; const k = new KnowledgePrototype({ now: () => now });
  const upload = (text = '양모 가격 100원', mimeType = 'text/plain') => {
    const bytes = Buffer.from(text);
    return k.upload(service, { documentId: 'doc', title: '상품', bytes, expectedHash: sha256(bytes), mimeType });
  };
  const event = (sequence, type, versionId, allowedGroups = ['sales']) => k.applyEvent(service,
    { eventId: `event-${sequence}`, documentId: 'doc', sequence, type, versionId, allowedGroups });
  const ready = () => { const v = upload(); event(1, 'APPROVE', v.versionId);
    k.indexApprovedText(service, { documentId: 'doc', versionId: v.versionId }); return v; };
  return { k, upload, event, ready, advance: value => { now = value; } };
}
test('draft is excluded; approval and extraction enable exact original download', () => {
  const {k, upload, event} = fixture(); const v = upload();
  assert.deepEqual(k.search(sales, '양모'), []);
  event(1, 'APPROVE', v.versionId);
  assert.deepEqual(k.search(sales, '양모'), []);
  k.indexApprovedText(service, {documentId:'doc', versionId:v.versionId});
  assert.equal(k.search(sales, '양모')[0].versionId, v.versionId);
  assert.equal(sha256(k.download(sales, 'doc', v.versionId)), v.hash);
});
test('department, tenant, inactive user and service are denied', () => {
  const {k, ready} = fixture(); const v = ready();
  for (const ctx of [{...sales,groups:['design']},{...sales,tenantId:'other'}]) {
    assert.deepEqual(k.search(ctx,'양모'),[]); assert.throws(()=>k.download(ctx,'doc',v.versionId));
  }
  assert.throws(()=>k.search({...sales,active:false},'양모'));
  assert.throws(()=>k.search(service,'양모'));
});
test('hash mismatch does not create a document', () => {
  const {k} = fixture(); assert.throws(()=>k.upload(service,{documentId:'doc',bytes:Buffer.from('a'),expectedHash:'bad'}));
  assert.deepEqual(k.search(sales,'a'),[]);
});
test('exact duplicate is idempotent; changed duplicate, gap and stale events fail', () => {
  const {event, upload} = fixture(); const v = upload(); event(1,'APPROVE',v.versionId);
  assert.equal(event(1,'APPROVE',v.versionId).duplicate,true);
  assert.throws(()=>event(1,'REVOKE')); assert.throws(()=>event(3,'REVOKE'));
  assert.throws(()=>event(0,'REVOKE'));
});
test('failed replacement preserves v1; success switches version', () => {
  const {k, ready, upload, event} = fixture(); const v1=ready(); const v2=upload('양모 가격 200원');
  event(2,'APPROVE',v2.versionId);
  assert.throws(()=>k.indexApprovedText(service,{documentId:'doc',versionId:v2.versionId,extractor:()=>{throw Error('failure');}}));
  assert.equal(k.search(sales,'양모')[0].versionId,v1.versionId);
  k.indexApprovedText(service,{documentId:'doc',versionId:v2.versionId});
  assert.equal(k.search(sales,'양모')[0].versionId,v2.versionId);
  assert.throws(()=>k.download(sales,'doc',v1.versionId));
});
test('revocation prevents search, download and late reindex', () => {
  const {k, ready, event} = fixture(); const v=ready(); event(2,'REVOKE');
  assert.deepEqual(k.search(sales,'양모'),[]); assert.throws(()=>k.download(sales,'doc',v.versionId));
  assert.throws(()=>k.indexApprovedText(service,{documentId:'doc',versionId:v.versionId}));
});
test('stale ACL fails closed at boundary, refresh restores allowed group', () => {
  const {k,ready,advance,event}=fixture(); ready(); advance(300000);
  assert.deepEqual(k.search(sales,'양모'),[]); event(2,'ACL',undefined,['design']);
  assert.deepEqual(k.search(sales,'양모'),[]);
  assert.equal(k.search({...sales,groups:['design']},'양모').length,1);
});
test('unsupported formats and unknown evidence do not fabricate content', () => {
  const {k,upload,event}=fixture(); const v=upload('fake pdf','application/pdf'); event(1,'APPROVE',v.versionId);
  assert.throws(()=>k.indexApprovedText(service,{documentId:'doc',versionId:v.versionId}));
  assert.deepEqual(k.search(sales,'없는 정보'),[]);
});
test('old indexing work cannot publish after a newer approval', () => {
  const {k,upload,event}=fixture();const a=upload();event(1,'APPROVE',a.versionId);
  const b=upload('새 자료');event(2,'APPROVE',b.versionId);
  assert.throws(()=>k.indexApprovedText(service,{documentId:'doc',versionId:a.versionId}));
});
