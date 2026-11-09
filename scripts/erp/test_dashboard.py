import io
import json
import tempfile
import unittest
from decimal import Decimal
import openpyxl
from dashboard import date_value, estimate, snapshot
from import_store import connect, ingest
from review_store import dispatch, fingerprint
from erp_errors import ImportErrorDetail


def sale(code='A', date='2026-08-10', qty='2', gross='220', channel='온라인', row=3):
    return dict(code=code, source_date=date, qty=qty, gross=gross, net=gross, tax='0', channel=channel,
                _period=date[:7], _ref={'batch_id':'sales', 'row':row})


def purchase(price='30', date='2026-08-01', code='A'):
    return dict(code=code, source_date=date, qty='10', price=price, _period=date[:7], _ref={'batch_id':'purchases', 'row':3})


def stock(code='A', qty='3'):
    return dict(code=code, qty=qty, _ref={'batch_id':'stock', 'row':3})


def allocation(total=10):
    return dict(total=total, products=[dict(code='A', category='EVERYDAY', allocated=total)])


def sample_workbook(kind='sales', amount=220, channel='온라인', date='2026-08-10'):
    w=openpyxl.Workbook(); s=w.active; s.title=kind; s.append(['synthetic'])
    if kind=='sales':
        s.append(['일자','품목코드코드','수량','공급가액','부가세','합 계','판매채널'])
        s.append([date,'A',2,amount,0,amount,channel]);s.append(['총합계',None,2,amount,0,amount])
    elif kind=='purchases':
        s.append(['일자','품목코드','수량','단가','공급가액','부가세','합 계'])
        s.append(['2026-08-01','A',10,30,300,30,330]);s.append(['총합계',None,10,None,300,30,330])
    elif kind=='stock':
        s.append(['품목명','품목코드','재고수량']);s.append(['test','A',3]);s.append(['총합계',None,3])
    data=io.BytesIO(); w.save(data); return data.getvalue()


class EstimateTests(unittest.TestCase):
    def test_export_date_with_numeric_suffix(self):
        for raw in ("08/01", "08/01-1", "08/01-12"):
            self.assertEqual(date_value(raw, "2026-08"), "2026-08-01")
        for raw in ("08/32-1", "08/01-", "08/01-X", "08/01-1-2"):
            with self.assertRaises(ImportErrorDetail):
                date_value(raw, "2026-08")

    def run_case(self, sales=None, purchases=None, stocks=None, history=None, alloc=None):
        return estimate('2026-08', sales if sales is not None else [sale()], purchases if purchases is not None else [purchase()],
                        stocks if stocks is not None else [stock()], history or [], alloc)

    def test_historical_cost_and_inventory_are_distinct(self):
        r=self.run_case(alloc=allocation())
        self.assertEqual(r['metrics']['net_sales'],200)
        self.assertEqual(r['metrics']['purchase_cost'],60)
        self.assertEqual(r['metrics']['profit'],130)
        self.assertEqual(r['products'][0]['unit_total_cost'],35)
        self.assertEqual(r['metrics']['selling_stock_value'],330)
        self.assertEqual(r['sale_lines'][0]['cost_source']['date'],'2026-08-01')

    def test_future_and_same_day_purchase_never_backfilled(self):
        for day in ['2026-08-10','2026-08-11','2026-09-01']:
            with self.subTest(day=day):
                r=self.run_case(purchases=[purchase(date=day)],alloc=allocation())
                self.assertIsNone(r['metrics']['purchase_cost']);self.assertIsNone(r['metrics']['profit'])

    def test_latest_purchase_day_conflict_blocks(self):
        r=self.run_case(purchases=[purchase(),purchase('50'),purchase('20','2026-07-01')])
        self.assertEqual(r['sale_lines'][0]['missing_reason'],'최근 매입일 단가 충돌')

    def test_missing_and_unlinked_returns_not_zero(self):
        r=self.run_case(sales=[sale(),sale(qty='-1',gross='-110',row=4)],alloc=allocation())
        self.assertEqual(r['metrics']['net_sales'],100)
        self.assertIsNone(r['metrics']['profit']);self.assertEqual(r['metrics']['costed_rows'],1)
        self.assertEqual(r['sale_lines'][1]['missing_reason'],'반품 원거래 미연결')

    def test_symmetric_vat_rounding(self):
        r=self.run_case(sales=[sale(qty='1',gross='1001'),sale(qty='-1',gross='-1001',row=4)])
        self.assertEqual([r['net_sales'] for r in r['sale_lines']],[910,-910])

    def test_channel_allocation_conserves_product_costs(self):
        r=self.run_case(sales=[sale(channel='가',gross='110'),sale(channel='나',gross='110',row=4)],alloc=allocation(11))
        self.assertEqual([r['allocated_expense'] for r in r['channels']],[6,5])
        self.assertEqual(sum(r['profit'] for r in r['channels']),r['metrics']['profit'])

    def test_negative_channel_weight_withholds_channel_profit(self):
        r=self.run_case(sales=[sale(),sale(channel='반품',qty='-1',gross='-11',row=4)],alloc=allocation())
        self.assertTrue(all(c['allocated_expense'] is None for c in r['channels']))

    def test_missing_channel_stays_unclassified(self):
        r=self.run_case(sales=[sale(channel='')])
        self.assertEqual(r['channels'][0]['channel'],'미분류');self.assertEqual(r['metrics']['unclassified_rows'],1)

    def test_weighted_inventory_and_prior_price_date(self):
        r=self.run_case(sales=[sale(qty='1',gross='110'),sale(qty='3',gross='660',row=4)],stocks=[stock(qty='2')])
        self.assertEqual(r['inventory'][0]['selling_value'],385)
        r=self.run_case(stocks=[stock('B')],history=[sale('B','2026-07-31',qty='1',gross='55')])
        self.assertEqual(r['inventory'][0]['price_date'],'2026-07-31');self.assertEqual(r['inventory'][0]['selling_value'],165)

    def test_unvalued_stock_total_not_partial_and_negative_preserved(self):
        r=self.run_case(stocks=[stock(qty='-2'),stock('B')])
        self.assertEqual(r['metrics']['stock_quantity'],1)
        self.assertIsNone(r['metrics']['selling_stock_value']);self.assertEqual(r['metrics']['unvalued_items'],1)

    def test_invalid_purchase_date_and_sales_month(self):
        p=purchase();p['source_date']='unknown'
        self.assertIsNone(self.run_case(purchases=[p])['metrics']['purchase_cost'])
        with self.assertRaises(ImportErrorDetail):self.run_case(sales=[sale(date='2026-09-01')])

    def test_uncertain_history_does_not_fall_back_to_older_price(self):
        bad=sale('B','2026-07-31');bad['source_date']='unknown'
        r=self.run_case(stocks=[stock('B')],history=[sale('B','2026-06-30'),bad])
        self.assertIsNone(r['inventory'][0]['selling_value'])

    def test_no_cost_allocation_profit_stays_unknown(self):
        r=self.run_case();self.assertIsNone(r['metrics']['profit']);self.assertIsNone(r['metrics']['allocated_expense'])


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.db=connect(self.tmp.name)
        self.batch={}
        for kind in ['sales','purchases','stock']:
            self.batch[kind]=ingest(self.db,sample_workbook(kind),dict(kind=kind,period='2026-08',sheet=kind,filename='synthetic.xlsx',actor='admin'))['id']
    def tearDown(self):self.db.close();self.tmp.cleanup()
    def get(self):return snapshot(self.db,dict(actor='admin',period='2026-08'))
    def test_roundtrip_source_rows_and_no_write(self):
        before=self.db.total_changes;r=self.get()
        self.assertEqual(r['metrics']['purchase_cost'],'60');self.assertEqual(r['channels'][0]['channel'],'온라인')
        self.assertEqual(r['metrics']['stock_quantity'],'3');self.assertFalse(r['publishable'])
        self.assertEqual(self.db.total_changes,before)
    def test_legacy_cached_rows_rehydrate_original_without_overwrite(self):
        self.db.execute('UPDATE source_rows SET records=? WHERE batch_id=?',(json.dumps([dict(code='A',source_row=3,qty='999',net='999',tax='0',gross='999')]),self.batch['sales']));self.db.commit()
        r=self.get();self.assertEqual(r['metrics']['net_sales'],'200');self.assertEqual(r['channels'][0]['channel'],'온라인')
        self.assertIn('999',self.db.execute('SELECT records FROM source_rows WHERE batch_id=?',(self.batch['sales'],)).fetchone()[0])
    def test_stale_allocation_never_used(self):
        self.db.execute('INSERT INTO allocations(id,period,actor,fingerprint,inputs,result) VALUES(?,?,?,?,?,?)',('test','2026-08','admin',fingerprint(self.db),'{}',json.dumps(allocation())));self.db.commit()
        first=self.get();self.assertEqual(first['metrics']['profit'],'130')
        ingest(self.db,sample_workbook(amount=330),dict(kind='sales',period='2026-08',sheet='sales',filename='synthetic.xlsx',actor='admin',expectedActive=self.batch['sales']))
        second=self.get();self.assertIsNone(second['metrics']['profit']);self.assertIsNone(second['allocation_id']);self.assertNotEqual(first['version'],second['version'])
    def test_duplicate_period_sources_block_estimation(self):
        self.db.execute('INSERT INTO active VALUES(?,?,?,?)',('purchases','2026-08','other',self.batch['purchases']));self.db.commit()
        self.assertIsNone(self.get()['metrics']['purchase_cost'])
        self.db.execute('INSERT INTO active VALUES(?,?,?,?)',('sales','2026-08','other',self.batch['sales']));self.db.commit()
        with self.assertRaises(ImportErrorDetail):self.get()
    def test_auth_and_period_validation(self):
        for p in [dict(period='2026-08'),dict(actor='admin',period='2026-99')]:
            with self.assertRaises(ImportErrorDetail):snapshot(self.db,p)
    def test_invalid_channel_formula_is_quarantined(self):
        result=ingest(self.db,sample_workbook(channel='=1+1'),dict(kind='sales',period='2026-08',sheet='sales',filename='synthetic.xlsx',actor='admin',expectedActive=self.batch['sales']))
        self.assertFalse(result['active']);self.assertEqual(self.get()['channels'][0]['channel'],'온라인')

if __name__=='__main__':unittest.main()
