"""Read-only ECOUNT import validation. Never publishes financial results."""
import argparse
import hashlib
import json
from collections import Counter
from decimal import Decimal, InvalidOperation
from pathlib import Path
import openpyxl

SCHEMAS = {
 'sales': {'code':'품목코드코드','qty':'수량','net':'공급가액','tax':'부가세','gross':'합 계'},
 'purchases': {'code':'품목코드','qty':'수량','price':'단가','net':'공급가액','tax':'부가세','gross':'합 계'},
 'stock': {'code':'품목코드','qty':'재고수량'},
 'movement': {'code':'품목코드','opening':'전일재고','in':'입고수량','out':'출고수량','qty':'재고수량'},
 'master': {'code':'품목코드','name':'품목명','spec':'규격명'},
}

def number(value):
    if value is None or value == '': return Decimal(0)
    if isinstance(value, bool): raise ValueError('boolean is not a number')
    try: result = Decimal(str(value).replace(',', ''))
    except InvalidOperation as e: raise ValueError('invalid numeric value') from e
    if not result.is_finite(): raise ValueError('non-finite number')
    return result

def read_sheet(path, sheet, kind):
    schema = SCHEMAS[kind]
    wb = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        ws = wb[sheet] if sheet else wb.active
        it = ws.iter_rows(values_only=True)
        title = next(it)
        headers = next(it)
        missing = set(schema.values()) - set(headers)
        if missing: raise ValueError('Missing headers: ' + ', '.join(sorted(missing)))
        indices = {key: headers.index(label) for key,label in schema.items()}
        if any(headers.count(label) != 1 for label in schema.values()):
            raise ValueError('Duplicate headers')
        records, totals, errors = [], None, []
        numeric = set(schema) - {'code','name','spec'}
        for rownum,row in enumerate(it,3):
            first = str(row[0] or '').strip()
            if first in {'총합계','합계'}:
                if totals is not None: raise ValueError('Multiple grand totals')
                totals = {k:number(row[indices[k]]) for k in numeric}
                continue
            rawcode = row[indices['code']]
            if rawcode is None: continue # month subtotal
            if kind == 'master' and not row[indices['name']]: continue # export footer
            if kind in {'stock','movement'} and '/' in first and '오' in first: continue
            if any(isinstance(row[i],str) and row[i].startswith('=') for i in indices.values()):
                errors.append({'row':rownum,'issue':'formula_cell'}); continue
            record = {'source_row':rownum}
            try:
                for k,i in indices.items():
                    record[k] = number(row[i]) if k in numeric else str(row[i] or '').strip()
            except ValueError:
                errors.append({'row':rownum,'issue':'invalid_number'}); continue
            records.append(record)
        sums = {k:sum((r[k] for r in records),Decimal(0)) for k in numeric}
        # Unit prices are not additive controls.
        controls = numeric - {'price'}
        if kind != 'master' and totals is None: errors.append({'issue':'missing_grand_total'})
        if totals is not None:
            for k in controls:
                if sums[k] != totals[k]: errors.append({'issue':'total_mismatch','field':k})
        for r in records:
            if {'net','tax','gross'} <= set(r) and r['net']+r['tax'] != r['gross']:
                errors.append({'row':r['source_row'],'issue':'amount_mismatch'})
            if kind=='movement' and r['opening']+r['in']-r['out'] != r['qty']:
                errors.append({'row':r['source_row'],'issue':'stock_equation_mismatch'})
        codes=Counter(r['code'] for r in records)
        if kind in {'master','stock','movement'} and any(v>1 for v in codes.values()):
            errors.append({'issue':'duplicate_item_codes'})
        return records, {'sheet':ws.title,'kind':kind,'rows':len(records),'unique_codes':len(codes),
          'totals':{k:str(v) for k,v in sums.items() if k!='price'},'errors':errors,
          'validated':not errors,'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest()}
    finally: wb.close()

def compare(sales,purchases,master):
    sold={r['code'] for r in sales}; known={r['code'] for r in master}
    priced={r['code'] for r in purchases if r['qty']>0 and r['price']>0}
    return {'sold_codes':len(sold),'priced_codes':len(sold&priced),
      'unpriced_codes':sorted(sold-priced),'missing_master_codes':sorted(sold-known),
      'note':'Price availability only; does not establish historical inventory cost.'}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--sales',required=True);ap.add_argument('--purchases',required=True)
    ap.add_argument('--master',required=True);ap.add_argument('--stock',required=True);ap.add_argument('--output',required=True)
    a=ap.parse_args(); datasets={}; report={'publishable':False,'checks':[]}
    for kind,path,sheet in [('sales',a.sales,None),('purchases',a.purchases,None),('master',a.master,None),
      ('stock',a.stock,'7월말 재고'),('stock',a.stock,'8월말 재고'),('movement',a.stock,'Sheet2')]:
        records,check=read_sheet(path,sheet,kind); datasets[sheet or kind]=records;report['checks'].append(check)
    report['coverage']=compare(datasets['sales'],datasets['purchases'],datasets['master'])
    opening={r['code']:r['qty'] for r in datasets['7월말 재고']}
    closing={r['code']:r['qty'] for r in datasets['8월말 재고']}
    movement={r['code']:r for r in datasets['Sheet2']}
    diffs=[]
    for code in sorted(set(opening)|set(closing)|set(movement)):
        m=movement.get(code,{})
        if opening.get(code,0)!=m.get('opening',0) or closing.get(code,0)!=m.get('qty',0):
            diffs.append({'code':code,'opening_difference':str(m.get('opening',0)-opening.get(code,0)),
              'closing_difference':str(m.get('qty',0)-closing.get(code,0))})
    report['stock_snapshot_differences']=diffs
    out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'checks':[{k:c[k] for k in ['kind','sheet','rows','validated']} for c in report['checks']],
      'priced_codes':report['coverage']['priced_codes'],'stock_differences':len(diffs)},ensure_ascii=False))
    return 1 if any(c['errors'] for c in report['checks']) or diffs else 0

if __name__=='__main__': raise SystemExit(main())
