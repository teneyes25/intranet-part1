"""Bounded readers for settlement summaries and card statements. Never approve costs."""
from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal
import re
import openpyxl
from validate import number


def read_costs(path, sheet, kind, period):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb[sheet]
        records, errors = [], []
        if kind == 'expenses':
            rows = list(ws.iter_rows(max_row=48, max_col=4, values_only=True))
            match = re.fullmatch(r'(\d{2}|\d{4})년\s*(\d{2})월', str(rows[1][2]).strip())
            source_period = f'{int(match[1]) + (2000 if len(match[1]) == 2 else 0):04d}-{match[2]}' if match else None
            if source_period != period:
                errors.append({'issue': 'settlement_period_mismatch'})
            if '입출금기준' not in str(rows[0][3]) or str(rows[40][1]).strip() != '지출계':
                errors.append({'issue': 'unknown_settlement_layout'})
            eligible = {23:'인건비(급여,퇴직금,가불)',26:'사회보험 세금공과금',27:'통신비',28:'고정비',29:'차량유지비',
                        30:'임대료',31:'복리후생비',32:'접대비',33:'사무용품비.광고선전비.,도서인쇄비',35:'운반비',37:'비품. 인테리어',39:'여비교통비'}
            if any(str(rows[n-1][1]).strip() != label for n,label in eligible.items()):
                errors.append({'issue': 'settlement_rows_changed'})
            for n, row in enumerate(rows[2:], 3):
                if row[1] is None: continue
                records.append({'source_row': n, 'label': str(row[1]).strip(),
                    'gross': str(number(row[2])) if row[2] is not None else None,
                    'period': source_period, 'eligible': n in eligible and str(row[1]).strip() == eligible[n],
                    'summary_only': True, 'note': str(row[3] or '')})
            report = {'rows': len(records), 'summary_only': True, 'totals': {}}
        else:
            if (ws.max_row or 0) > 100000 or (ws.max_column or 0) > 30:
                raise ValueError('statement too large')
            totals, subtotals, by_card = [], {}, defaultdict(Decimal)
            for n, row in enumerate(ws.iter_rows(max_col=10, values_only=True), 1):
                date = str(row[0] or '').strip()
                if re.fullmatch(r'\d{2}\.\d{2}\.\d{2}', date):
                    dt = datetime.strptime('20' + date, '%Y.%m.%d')
                    amounts = [number(v) for v in row[4:10]]
                    gross = amounts[0] + amounts[1]
                    record = {'source_row': n, 'label': str(row[2] or ''), 'card': str(row[1] or ''),
                        'date': dt.date().isoformat(), 'period': dt.strftime('%Y-%m'),
                        'gross': str(gross), 'usage': str(amounts[0]), 'discount': str(amounts[1]),
                        'points': str(amounts[2]), 'principal': str(amounts[3]),
                        'fee': str(amounts[4]), 'balance': str(amounts[5]),
                        'installment': str(row[3] or ''), 'eligible': True, 'summary_only': False}
                    records.append(record)
                    by_card[record['card']] += amounts[3]
                elif row[2] == '카드소계':
                    card = str(row[1] or '')
                    if card in subtotals: errors.append({'issue': 'repeated_card_subtotal'})
                    subtotals[card] = number(row[7])
                elif row[2] == '이용금액 합계': totals.append(number(row[7]))
                elif date and date not in {'이용일', '신용카드 이용내역'}:
                    errors.append({'row': n, 'issue': 'unrecognized_statement_row'})
            principal = sum((number(r['principal']) for r in records), Decimal(0))
            if not records or len(totals) != 1 or totals[0] != principal:
                errors.append({'issue': 'statement_total_mismatch'})
            if dict(by_card) != subtotals: errors.append({'issue': 'card_subtotal_mismatch'})
            keys = [tuple((k, v) for k, v in r.items() if k != 'source_row') for r in records]
            counts = Counter(keys)
            for r, key in zip(records, keys): r['duplicate_candidate'] = counts[key] > 1
            report = {'rows': len(records), 'totals': {'principal': str(principal)},
                'duplicate_candidate_rows': sum(r['duplicate_candidate'] for r in records)}
        report.update(kind=kind, sheet=sheet, errors=errors, validated=not errors,
                      publishable=False, allocation_ready=False)
        return records, report
    finally:
        wb.close()
