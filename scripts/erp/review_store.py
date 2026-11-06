"""Immutable cost review and allocation preview; all amounts derived server-side."""
from datetime import datetime
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import tempfile
import uuid
from allocation import allocate
from erp_errors import ImportErrorDetail
from validate import number, read_sheet


def latest_reviews(db):
    return [dict(r) for r in db.execute('''SELECT * FROM reviews WHERE id IN
        (SELECT MAX(id) FROM reviews GROUP BY batch_id,source_row) ORDER BY id''')]


def fingerprint(db):
    source = [tuple(r) for r in db.execute('SELECT kind,period,sheet,batch_id FROM active ORDER BY kind,period,sheet')]
    reviews = [r['id'] for r in latest_reviews(db)]
    return hashlib.sha256(json.dumps([source, reviews]).encode()).hexdigest()


def records(db, batch):
    saved = db.execute('SELECT records FROM source_rows WHERE batch_id=?', (batch['id'],)).fetchone()
    if saved: return json.loads(saved[0])
    # Read old staging databases without destroying or re-importing original bytes.
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)/'source.xlsx'; p.write_bytes(batch['original'])
        rows, _ = read_sheet(p, batch['sheet'], batch['kind'])
        return json.loads(json.dumps(rows, default=str))


def active_batches(db):
    return [dict(r) for r in db.execute('SELECT b.* FROM batches b JOIN active a ON b.id=a.batch_id ORDER BY b.rowid')]


def state(db):
    current = fingerprint(db)
    sources = []
    for b in active_batches(db):
        if b['kind'] not in {'cards', 'expenses', 'sales'}: continue
        rows = records(db, b)
        sources.append({k: b[k] for k in ('id', 'kind', 'period', 'sheet', 'filename', 'created_at')} | {'rows': rows})
    results = []
    for r in db.execute('SELECT * FROM allocations ORDER BY rowid DESC LIMIT 20'):
        results.append(dict(r) | {'stale': r['fingerprint'] != current,
                                 'result': json.loads(r['result']), 'inputs': json.loads(r['inputs'])})
    reviews = [r | {'data': json.loads(r['data'])} for r in latest_reviews(db)]
    audit = [dict(r) | {'data': json.loads(r['data'])} for r in db.execute('SELECT * FROM reviews ORDER BY id DESC LIMIT 200')]
    return {'sources': sources, 'reviews': reviews, 'audit': audit, 'allocations': results,
            'fingerprint': current, 'publishable': False}


def save_review(db, p):
    batch = next((b for b in active_batches(db) if b['id'] == p.get('batch_id') and b['kind'] in {'cards','expenses'}), None)
    if not batch: raise ImportErrorDetail('현재 유효한 비용 자료가 아닙니다. 새로 조회하십시오.', 409)
    row = next((r for r in records(db,batch) if r['source_row'] == p.get('source_row')), None)
    if not row: raise ImportErrorDetail('원본 행을 찾을 수 없습니다.')
    prior = db.execute('SELECT MAX(id) FROM reviews WHERE batch_id=? AND source_row=?',
                       (batch['id'],row['source_row'])).fetchone()[0]
    if p.get('expected_review') != prior:
        raise ImportErrorDetail('다른 검토가 저장되었습니다. 새로 조회하십시오.', 409)
    d = p.get('review', {})
    if not isinstance(d,dict): raise ImportErrorDetail('검토 입력을 확인하십시오.',422)
    status = d.get('status')
    reason = str(d.get('reason','')).strip()
    if status not in {'include', 'exclude', 'hold'} or not 3 <= len(reason) <= 2000:
        raise ImportErrorDetail('처리 상태와 검토 근거를 입력하십시오.', 422)
    normalized = {'status': status, 'reason': reason, 'period': row.get('period'), 'amount': None}
    if status == 'include':
        if not row.get('eligible') or row.get('gross') is None:
            raise ImportErrorDetail('자금·카드대금·집계·영업외 항목은 배부할 수 없습니다.', 422)
        if d.get('cost_class') not in {'selling_admin','labor','manufacturing'}:
            raise ImportErrorDetail('판관비·노무비·제조경비 중 비용항목을 선택하십시오.',422)
        for field in ('duplicate_evidence', 'cancellation_evidence', 'detail_evidence'):
            if not isinstance(d.get(field),str) or not 3 <= len(d[field].strip()) <= 2000:
                raise ImportErrorDetail('상세 대사·취소 확인·중복 해소 근거가 필요합니다.', 422)
        if row.get('installment') or number(row.get('fee',0)) or number(row.get('balance',0)) or number(row.get('points',0)):
            raise ImportErrorDetail('할부·수수료·잔액·포인트 포함 내역은 상세 분리 후 처리해야 합니다.',422)
        if d.get('tax_type') not in {'deductible','non_deductible'}:
            raise ImportErrorDetail('공제 구분을 지정하십시오.',422)
        if d.get('tax_amount') in (None,''): raise ImportErrorDetail('부가세를 명시하십시오. 비공제는 0원입니다.',422)
        try: gross, tax = number(row['gross']), number(d['tax_amount'])
        except ValueError: raise ImportErrorDetail('유효한 금액을 입력하십시오.',422)
        if tax != tax.to_integral_value() or gross != gross.to_integral_value():
            raise ImportErrorDetail('원 단위 금액이 필요합니다.',422)
        if (gross >= 0 and not 0 <= tax <= gross) or (gross < 0 and not gross <= tax <= 0):
            raise ImportErrorDetail('부가세 부호·범위를 확인하십시오.',422)
        if d['tax_type'] == 'non_deductible' and tax != 0:
            raise ImportErrorDetail('비공제 비용은 지급총액을 반영합니다.',422)
        period = str(d.get('period',''))
        if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])',period): raise ImportErrorDetail('귀속월을 확인하십시오.',422)
        if batch['kind'] == 'cards' and period != row['period']:
            raise ImportErrorDetail('카드 사용월과 귀속월이 다릅니다. 이번 경로에서는 사용월만 허용합니다.',422)
        normalized.update({k: d[k] for k in ('cost_class','tax_type','duplicate_evidence','cancellation_evidence','detail_evidence')})
        normalized.update(period=period,tax_amount=str(tax),amount=str(gross-tax))
    cursor = db.execute('INSERT INTO reviews(batch_id,source_row,actor,data) VALUES(?,?,?,?)',
        (batch['id'],row['source_row'],p['actor'],json.dumps(normalized,ensure_ascii=False)))
    return {'review_id': cursor.lastrowid, 'publishable': False}


def sales_month(raw, period):
    raw = str(raw).strip()
    for fmt in ('%Y-%m-%d','%Y/%m/%d','%Y.%m.%d','%Y%m%d','%Y-%m-%d %H:%M:%S'):
        try: return datetime.strptime(raw,fmt).strftime('%Y-%m')
        except ValueError: pass
    if re.fullmatch(r'\d{2}/\d{2}', raw):
        try: return datetime.strptime(period[:4]+'/'+raw,'%Y/%m/%d').strftime('%Y-%m')
        except ValueError: pass
    raise ImportErrorDetail('판매행 거래일을 확인할 수 없어 배부를 보류합니다.',422)


def run_allocation(db,p):
    period = p.get('period','')
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])',period): raise ImportErrorDetail('기준월을 확인하십시오.',422)
    if p.get('fingerprint') != fingerprint(db): raise ImportErrorDetail('입력 또는 검토가 변경되었습니다. 새로 조회하십시오.',409)
    sources = active_batches(db)
    sales_batches = [b for b in sources if b['kind']=='sales' and b['period']==period]
    if len(sales_batches) != 1:
        raise ImportErrorDetail('동일월 판매 자료는 정확히 1개여야 합니다. 중복 범위를 검토하십시오.',422)
    sales = records(db,sales_batches[0])
    if any(sales_month(r.get('source_date',''),period) != period for r in sales):
        raise ImportErrorDetail('판매 파일 거래월이 일치하지 않습니다.',422)
    reviews = {(r['batch_id'],r['source_row']): r for r in latest_reviews(db)}
    total, refs, pending, relevant = Decimal(0), [], [], 0
    for b in sources:
        if b['kind'] not in {'expenses','cards'}: continue
        for row in records(db,b):
            if not row.get('eligible') or row.get('gross') is None: continue
            review = reviews.get((b['id'],row['source_row']))
            d = json.loads(review['data']) if review else {}
            # An explicit reassignment still has to be reviewed; holds remain visible in source month.
            if period not in {row.get('period'), d.get('period')}: continue
            relevant += 1
            if d.get('status') not in {'include','exclude'}:
                pending.append({'batch_id':b['id'],'source_row':row['source_row']}); continue
            if d['status']=='include' and d['period']==period:
                total += number(d['amount']); refs.append(review['id'])
    if pending: raise ImportErrorDetail(f'해당 월 비용 {len(pending)}행이 미검토·보류 상태입니다.',422)
    if not relevant: raise ImportErrorDetail('해당 월 비용 자료가 없습니다. 0원으로 가정하지 않습니다.',422)
    if total == 0 and p.get('zero_confirmed') is not True:
        raise ImportErrorDetail('월 배부 대상 비용 0원 확인이 필요합니다.',422)
    result = allocate(int(total),sales,p.get('categories',{}))
    identifier = str(uuid.uuid4())
    inputs = {'sales_batch': sales_batches[0]['id'], 'review_ids': refs,
              'categories': p['categories'], 'zero_confirmed': p.get('zero_confirmed',False)}
    db.execute('INSERT INTO allocations(id,period,actor,fingerprint,inputs,result) VALUES(?,?,?,?,?,?)',
        (identifier,period,p['actor'],fingerprint(db),json.dumps(inputs),json.dumps(result)))
    return {'id':identifier,'result':result}


def dispatch(db,p):
    if not p.get('actor'): raise ImportErrorDetail('인증이 필요합니다.',401)
    db.execute('BEGIN IMMEDIATE' if p['action'] != 'review_state' else 'BEGIN')
    try:
        if p['action']=='review_state': result=state(db)
        elif p['action']=='save_review': result=save_review(db,p)
        else: result=run_allocation(db,p)
        db.commit(); return result
    except BaseException:
        db.rollback(); raise
