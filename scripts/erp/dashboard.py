"""Read-only management estimates; missing inputs never become zero costs."""
from collections import Counter, defaultdict
from bisect import bisect_left
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import re
from allocation import split
from erp_errors import ImportErrorDetail
from review_store import active_batches, fingerprint, records
from validate import number

POLICY = 'management-preview-v1'


def date_value(raw, period):
    raw = str(raw).strip()
    for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d', '%Y%m%d', '%Y-%m-%d %H:%M:%S'):
        try: return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError: pass
    short_date = re.fullmatch(r'(\d{2}/\d{2})(?:-[0-9]+)?', raw)
    if short_date:
        try: return datetime.strptime(period[:4]+'/'+short_date.group(1), '%Y/%m/%d').date().isoformat()
        except ValueError: pass
    raise ImportErrorDetail('거래일을 확인할 수 없습니다. 원본 날짜를 확인하십시오.', 422)


def rounded(value):
    return value.quantize(Decimal(1), rounding=ROUND_HALF_UP)


def net_amount(row):
    value = number(row['net'])
    return rounded(value / Decimal('1.1')) if number(row['tax']) == 0 else value


def total_or_none(rows, key):
    values = [r[key] for r in rows]
    return sum(values, Decimal(0)) if all(v is not None for v in values) else None


def estimate(period, sales, purchases, stock, history, allocation, names=None):
    """Rows carry immutable batch/row references. Caller validates file scope."""
    names = names or {}
    problems = set()
    prices = defaultdict(list)
    unsafe_prices = set()
    for row in purchases:
        try:
            day = date_value(row.get('source_date', ''), row['_period'])
            if day[:7] != row['_period']: raise ValueError('period mismatch')
        except (ValueError, ImportErrorDetail):
            unsafe_prices.add(row['code']); continue
        if number(row['qty']) > 0 and number(row['price']) > 0:
            prices[row['code']].append((day, number(row['price']), row))
    if unsafe_prices: problems.add('매입 거래일·자료월이 불명확한 품목은 원가 추정을 보류했습니다.')
    price_days = {}
    price_groups = {}
    for code, entries in prices.items():
        grouped = defaultdict(list)
        for entry in entries: grouped[entry[0]].append(entry)
        price_days[code], price_groups[code] = sorted(grouped), grouped
    sale_lines = []
    for row in sales:
        day = date_value(row.get('source_date', ''), period)
        if day[:7] != period: raise ImportErrorDetail('판매 거래월과 선택 월이 다릅니다.', 422)
        qty, net = number(row['qty']), net_amount(row)
        unit, cost_ref, reason = None, None, None
        if qty <= 0:
            reason = '반품 원거래 미연결' if qty < 0 else '판매수량 0'
        elif row['code'] in unsafe_prices:
            reason = '매입 거래일 미확정'
        else:
            days = price_days.get(row['code'], [])
            index = bisect_left(days, day) - 1
            if index >= 0:
                latest = days[index]
                candidates = price_groups[row['code']][latest]
                if len({p[1] for p in candidates}) == 1:
                    unit = candidates[0][1]
                    cost_ref = {'date': latest, 'unit_price': str(unit), 'sources': [p[2]['_ref'] for p in candidates]}
                else: reason = '최근 매입일 단가 충돌'
            else: reason = '판매일 이전 유효 매입가 없음'
        cost = rounded(qty * unit) if unit is not None else None
        sale_lines.append({'code': row['code'], 'channel': row.get('channel') or '미분류',
                           'date': day, 'qty': qty, 'net_sales': net, 'purchase_cost': cost,
                           'source': row['_ref'], 'cost_source': cost_ref, 'missing_reason': reason})
    allocated = {p['code']: p for p in allocation['products']} if allocation else {}
    products, channels = [], []
    channel_groups = defaultdict(list)
    channel_expenses = defaultdict(list)
    product_lines = defaultdict(list)
    for line in sale_lines: product_lines[line['code']].append(line)
    for code, lines in sorted(product_lines.items()):
        net = sum((r['net_sales'] for r in lines), Decimal(0))
        cost = total_or_none(lines, 'purchase_cost')
        expense = Decimal(allocated[code]['allocated']) if code in allocated else None
        qty = sum((r['qty'] for r in lines), Decimal(0))
        total_cost = cost + expense if cost is not None and expense is not None else None
        products.append({'code': code, 'name': names.get(code, ''), 'category': allocated.get(code, {}).get('category', '미분류'),
                         'qty': qty, 'net_sales': net, 'purchase_cost': cost, 'allocated_expense': expense,
                         'total_cost': total_cost, 'unit_total_cost': rounded(total_cost / qty) if total_cost is not None and qty > 0 else None,
                         'profit': net - total_cost if total_cost is not None else None,
                         'missing_rows': sum(r['purchase_cost'] is None for r in lines)})
        weights = defaultdict(Decimal)
        for r in lines:
            weights[r['channel']] += r['net_sales']; channel_groups[r['channel']].append(r)
        parts = None
        if expense is not None and sum(weights.values()) > 0 and all(v >= 0 for v in weights.values()):
            parts = split(int(expense), weights)
        elif expense is not None:
            problems.add('채널별 순매출이 음수이거나 분모가 0인 상품의 채널 비용 배부를 보류했습니다.')
        for channel in weights: channel_expenses[channel].append(Decimal(parts[channel]) if parts is not None else None)
    for channel, lines in sorted(channel_groups.items()):
        net, cost = sum((r['net_sales'] for r in lines), Decimal(0)), total_or_none(lines, 'purchase_cost')
        values = channel_expenses[channel]
        expense = sum(values, Decimal(0)) if all(v is not None for v in values) else None
        channels.append({'channel': channel, 'net_sales': net, 'purchase_cost': cost, 'allocated_expense': expense,
                         'profit': net-cost-expense if cost is not None and expense is not None else None})
    if '미분류' in channel_groups: problems.add('판매채널 열이 없거나 비어 있는 거래는 미분류로 보존했습니다.')
    # Only positive, non-return sales establish a usable selling price.
    valid_history = defaultdict(list)
    uncertain_history = set()
    for row in history + sales:
        try: day = date_value(row.get('source_date', ''), row['_period'])
        except ImportErrorDetail:
            uncertain_history.add(row['code']); continue
        if day[:7] != row['_period']:
            uncertain_history.add(row['code']); continue
        if day[:7] > period: continue
        qty, gross = number(row['qty']), number(row['gross'])
        if qty > 0 and gross > 0: valid_history[row['code']].append((row['code'], day, qty, gross, row['_ref']))
    if uncertain_history: problems.add('일자·자료월이 불명확한 판매 이력이 있는 품목은 과거 가격 대체를 보류했습니다.')
    inventory = []
    for row in stock or []:
        candidates = [r for r in valid_history[row['code']] if r[1][:7] == period]
        basis = '당월 양수 판매 가중평균'
        if not candidates and row['code'] not in uncertain_history:
            prior = [r for r in valid_history[row['code']] if r[1][:7] < period]
            last = max((r[1] for r in prior), default=None)
            candidates = [r for r in prior if r[1] == last]
            basis = '과거 최근 유효 판매일 가중평균'
        price = sum((r[3] for r in candidates), Decimal(0))/sum((r[2] for r in candidates), Decimal(0)) if candidates else None
        qty = number(row['qty'])
        inventory.append({'code': row['code'], 'qty': qty, 'selling_price': str(price) if price is not None else None,
                          'selling_value': rounded(price*qty) if price is not None else None,
                          'price_basis': basis if candidates else '유효 판매가 없음', 'price_date': max((r[1] for r in candidates), default=None),
                          'source': row['_ref'], 'price_sources': [r[4] for r in candidates]})
    cost = total_or_none(products, 'purchase_cost') if products else None
    expense = Decimal(allocation['total']) if allocation else None
    net = sum((r['net_sales'] for r in sale_lines), Decimal(0))
    if any(r['purchase_cost'] is None for r in sale_lines): problems.add('미확정 원가가 있어 전체 손익을 계산하지 않았습니다.')
    if not allocation: problems.add('현재 입력과 일치하는 비용 배부가 없습니다. 비용 미확정으로 표시합니다.')
    if stock is None: problems.add('선택 월 재고 자료가 없거나 복수여서 재고 집계를 보류했습니다.')
    if any(r['qty'] < 0 for r in inventory): problems.add('음수 재고를 보존했습니다. 원천 재고 대사가 필요합니다.')
    return {'metrics': {'net_sales': net, 'purchase_cost': cost, 'allocated_expense': expense,
                        'profit': net-cost-expense if cost is not None and expense is not None else None,
                        'stock_quantity': sum((r['qty'] for r in inventory), Decimal(0)) if stock is not None else None,
                        'selling_stock_value': total_or_none(inventory, 'selling_value') if stock is not None else None,
                        'costed_rows': sum(r['purchase_cost'] is not None for r in sale_lines), 'sales_rows': len(sale_lines),
                        'unclassified_rows': sum(r['channel'] == '미분류' for r in sale_lines),
                        'unvalued_items': sum(r['selling_value'] is None for r in inventory)},
            'products': products, 'channels': channels, 'inventory': inventory, 'sale_lines': sale_lines,
            'warnings': sorted(problems)}


def snapshot(db, payload):
    if not payload.get('actor'): raise ImportErrorDetail('인증이 필요합니다.', 401)
    period = payload.get('period', '')
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', period): raise ImportErrorDetail('기준월을 확인하십시오.', 422)
    db.execute('BEGIN')
    try:
        sources, current = active_batches(db), fingerprint(db)
        eligible = [b for b in sources if b['period'] <= period and b['kind'] in {'sales','purchases','stock','master'}]
        counts = Counter((b['kind'], b['period']) for b in eligible)
        selected_sales = [b for b in eligible if b['kind']=='sales' and b['period']==period]
        if len(selected_sales) != 1: raise ImportErrorDetail('선택 월의 판매 원본은 정확히 1개여야 합니다. 중복 범위를 확인하십시오.', 422)
        def rows(batch):
            return [dict(r, _period=batch['period'], _ref={'batch_id':batch['id'], 'row':r['source_row']}) for r in records(db,batch)]
        sales = rows(selected_sales[0])
        purchases, history, warnings = [], [], []
        ambiguous_purchase = any(k=='purchases' and n>1 for (k,_),n in counts.items())
        for b in eligible:
            if b['kind']=='purchases' and not ambiguous_purchase: purchases.extend(rows(b))
            if b['kind']=='sales' and b['period']<period and counts[(b['kind'],b['period'])]==1: history.extend(rows(b))
        if ambiguous_purchase: warnings.append('같은 월 매입 원본이 여러 개여서 범위 중복 확인 전 모든 원가 추정을 보류했습니다.')
        if any(k=='sales' and n>1 and m<period for (k,m),n in counts.items()):
            warnings.append('과거 판매 원본의 범위 중복 확인 전 과거 가격 대체를 보류했습니다.')
            history = []
        stock_batches = [b for b in eligible if b['kind']=='stock' and b['period']==period]
        stock = rows(stock_batches[0]) if len(stock_batches)==1 else None
        master_batches = [b for b in eligible if b['kind']=='master']
        latest_master = max((b['period'] for b in master_batches), default=None)
        master_batches = [b for b in master_batches if b['period']==latest_master]
        names = {r['code']:r['name'] for r in rows(master_batches[0])} if len(master_batches)==1 else {}
        a = db.execute('SELECT * FROM allocations WHERE period=? ORDER BY rowid DESC LIMIT 1', (period,)).fetchone()
        allocation = json.loads(a['result']) if a and a['fingerprint']==current else None
        report = estimate(period, sales, purchases, stock, history, allocation, names)
        if a and not allocation: warnings.append('입력·검토 변경으로 이전 배부가 만료됐습니다. 비용 검토 화면에서 재계산하십시오.')
        allocation_id = a['id'] if allocation else None
        report.update(period=period, generated_at=datetime.now(timezone.utc).isoformat(), policy=POLICY,
                      fingerprint=current, allocation_id=allocation_id, publishable=False, status='management_estimate_preview',
                      version=hashlib.sha256(f'{POLICY}:{period}:{current}:{allocation_id}'.encode()).hexdigest(),
                      sources=[{k:b[k] for k in ('id','kind','period','sheet','filename','created_at','digest')} for b in sources],
                      stock_basis='업로드 자료월 기준; 실제 재고 기준일과 원천 대사 확인 필요',
                      warnings=report['warnings']+warnings)
        db.commit()
        return json.loads(json.dumps(report, ensure_ascii=False, default=str))
    except BaseException:
        db.rollback(); raise
