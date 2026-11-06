import concurrent.futures
import io
import json
import tempfile
import unittest
import openpyxl
from allocation import allocate
from import_store import connect, ingest, ImportErrorDetail
from review_store import dispatch, fingerprint
from test_import_store import workbook


def card_workbook(amount=101, bad=False, duplicate=False):
    w=openpyxl.Workbook(); s=w.active; s.title='카드'
    s.append(['이용일','이용자','이 용 가 맹 점','할부개월','이용금액','할인','포인트','금월 결제하실 금액',None,'결제후 잔액'])
    row=['26.08.01','test','synthetic merchant',None,amount,0,0,amount,0,0]
    s.append(row)
    if duplicate: s.append(row)
    total=amount*(2 if duplicate else 1)
    s.append([None,'test','카드소계',None,None,None,None,total,0,0])
    s.append([None,None,'이용금액 합계',None,None,None,None,total+int(bad),0,0])
    out=io.BytesIO(); w.save(out); return out.getvalue()


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.db=connect(self.tmp.name)
        self.meta=dict(kind='cards',period='2026-09',sheet='카드',filename='test.xlsx',actor='admin')
        self.card=ingest(self.db,card_workbook(),self.meta)['id']
        self.sales=ingest(self.db,workbook(),dict(kind='sales',period='2026-08',sheet='판매',filename='sales.xlsx',actor='admin'))['id']
    def tearDown(self): self.db.close(); self.tmp.cleanup()
    def review(self, **changes):
        d=dict(status='include',reason='synthetic review',period='2026-08',cost_class='selling_admin',tax_type='non_deductible',tax_amount='0',
               detail_evidence='invoice matched',duplicate_evidence='no bank overlap',cancellation_evidence='not cancelled')
        d.update(changes)
        return dict(action='save_review',actor='admin',batch_id=self.card,source_row=2,expected_review=None,review=d)
    def run_args(self):
        return dict(action='allocate',actor='admin',period='2026-08',fingerprint=fingerprint(self.db),categories={'001':'EVERYDAY'})
    def test_unreviewed_blocked_then_sum_preserved(self):
        with self.assertRaises(ImportErrorDetail): dispatch(self.db,self.run_args())
        dispatch(self.db,self.review())
        result=dispatch(self.db,self.run_args())['result']
        self.assertEqual((result['total'],result['allocated'],result['difference']),(101,101,0))
        self.assertFalse(result['publishable'])
        self.assertEqual(result['products'][0]['net_sales'],'82')
    def test_review_revision_history_and_stale_result(self):
        first=dispatch(self.db,self.review())['review_id']
        dispatch(self.db,self.run_args())
        second=self.review(status='hold');second['expected_review']=first
        dispatch(self.db,second)
        state=dispatch(self.db,dict(action='review_state',actor='admin'))
        self.assertTrue(state['allocations'][0]['stale'])
        self.assertEqual(len(state['audit']),2)
        with self.assertRaises(ImportErrorDetail):dispatch(self.db,self.run_args())
    def test_optimistic_lock_and_actor_required(self):
        dispatch(self.db,self.review())
        with self.assertRaises(ImportErrorDetail) as cm:dispatch(self.db,self.review())
        self.assertEqual(cm.exception.status,409)
        with self.assertRaises(ImportErrorDetail):dispatch(self.db,dict(action='review_state'))
    def test_review_requirements_and_wrong_month(self):
        for change in [dict(period='2026-09'),dict(detail_evidence=''),dict(duplicate_evidence=''),dict(cancellation_evidence=''),dict(tax_type=''),dict(tax_amount='1'),dict(tax_amount='NaN')]:
            with self.subTest(change=change), self.assertRaises((ImportErrorDetail,ValueError)):
                dispatch(self.db,self.review(**change))
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM reviews').fetchone()[0],0)
    def test_original_replacement_blocks_old_review_and_stales_allocation(self):
        dispatch(self.db,self.review()); dispatch(self.db,self.run_args())
        ingest(self.db,card_workbook(202),{**self.meta,'expectedActive':self.card})
        with self.assertRaises(ImportErrorDetail):dispatch(self.db,self.review())
        state=dispatch(self.db,dict(action='review_state',actor='admin'))
        self.assertTrue(state['allocations'][0]['stale'])
        with self.assertRaises(ImportErrorDetail):dispatch(self.db,self.run_args())
    def test_same_bytes_other_billing_month_not_added(self):
        data=self.db.execute('SELECT original FROM batches WHERE id=?',(self.card,)).fetchone()[0]
        result=ingest(self.db,data,{**self.meta,'period':'2026-10'})
        self.assertTrue(result['duplicate'])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM active WHERE kind='cards'").fetchone()[0],1)
    def test_bad_statement_cannot_replace_current(self):
        r=ingest(self.db,card_workbook(bad=True),{**self.meta,'expectedActive':self.card})
        self.assertFalse(r['active'])
        self.assertEqual(self.db.execute("SELECT batch_id FROM active WHERE kind='cards'").fetchone()[0],self.card)
    def test_duplicates_preserved_and_require_review(self):
        r=ingest(self.db,card_workbook(duplicate=True),{**self.meta,'expectedActive':self.card})
        self.assertEqual(r['report']['rows'],2)
        self.assertEqual(r['report']['duplicate_candidate_rows'],2)
    def test_excluded_zero_requires_explicit_confirmation(self):
        dispatch(self.db,self.review(status='exclude'))
        with self.assertRaises(ImportErrorDetail):dispatch(self.db,self.run_args())
        r=dispatch(self.db,{**self.run_args(),'zero_confirmed':True})
        self.assertEqual(r['result']['allocated'],0)
    def test_sales_month_missing_or_different_blocks(self):
        dispatch(self.db,self.review())
        for date in ['2026-09-01','unknown']:
            rows=json.loads(self.db.execute('SELECT records FROM source_rows WHERE batch_id=?',(self.sales,)).fetchone()[0])
            rows[0]['source_date']=date
            self.db.execute('UPDATE source_rows SET records=? WHERE batch_id=?',(json.dumps(rows),self.sales)); self.db.commit()
            with self.assertRaises(ImportErrorDetail):dispatch(self.db,self.run_args())
    def test_stale_fingerprint_rejected(self):
        payload=self.run_args();dispatch(self.db,self.review())
        with self.assertRaises(ImportErrorDetail) as cm:dispatch(self.db,payload)
        self.assertEqual(cm.exception.status,409)
    def test_concurrent_review_only_one_wins(self):
        p=self.review()
        def run(_):
            db=connect(self.tmp.name)
            try: dispatch(db,p); return 200
            except ImportErrorDetail as e:return e.status
            finally:db.close()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: outcomes=list(pool.map(run,range(2)))
        self.assertEqual(sorted(outcomes),[200,409])
    def test_restart_preserves_reviews_and_allocations(self):
        dispatch(self.db,self.review());dispatch(self.db,self.run_args())
        self.db.close();self.db=connect(self.tmp.name)
        state=dispatch(self.db,dict(action='review_state',actor='admin'))
        self.assertEqual(len(state['reviews']),1);self.assertFalse(state['allocations'][0]['stale'])
    def test_two_stage_rounding_and_negative_sales(self):
        rows=[{'code':c,'net':str(v),'tax':'1'} for c,v in [('a',100),('b',200),('c',300)]]
        categories={'a':'EVERYDAY','b':'EVERYDAY','c':'COOLING'}
        r=allocate(101,rows,categories)
        self.assertEqual(r['difference'],0)
        self.assertEqual(r['categories'],{'EVERYDAY':50,'COOLING':51})
        self.assertEqual([p['allocated'] for p in r['products']],[17,33,51])
        rows[0]['net']='-100'
        with self.assertRaises(ImportErrorDetail): allocate(101,rows,categories)
    def test_zero_denominator_and_unknown_category(self):
        for rows,cats in [([{'code':'a','net':'0','tax':'0'}],{'a':'EVERYDAY'}),([{'code':'a','net':'100','tax':'0'}],{})]:
            with self.assertRaises(ImportErrorDetail):allocate(100,rows,cats)
        with self.assertRaises(ImportErrorDetail):
            allocate(100,[{'code':'a','net':'0','tax':'0'},{'code':'b','net':'110','tax':'0'}],{'a':'EVERYDAY','b':'COOLING'})
    def test_private_database_backup_restore(self):
        dispatch(self.db,self.review());dispatch(self.db,self.run_args())
        with tempfile.TemporaryDirectory() as restored:
            target=connect(restored);self.db.backup(target)
            restored_state=dispatch(target,dict(action='review_state',actor='admin'))
            self.assertFalse(restored_state['allocations'][0]['stale'])
            self.assertEqual(fingerprint(self.db),fingerprint(target))
            self.assertEqual(self.db.execute('SELECT original FROM batches WHERE id=?',(self.card,)).fetchone()[0],target.execute('SELECT original FROM batches WHERE id=?',(self.card,)).fetchone()[0])
            target.close()


if __name__=='__main__': unittest.main()
