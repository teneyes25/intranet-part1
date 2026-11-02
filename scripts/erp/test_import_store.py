import concurrent.futures
import io
import json
import tempfile
import unittest
from pathlib import Path
import openpyxl
from import_store import connect, ingest, history, ImportErrorDetail

def workbook(value=100, bad=False):
    w=openpyxl.Workbook(); s=w.active; s.title='판매'
    s.append(['export']); s.append(['일자','품목코드코드','수량','공급가액','부가세','합 계'])
    s.append(['08/01','001',2,value,0,value]); s.append(['08/02','001',-1,-10,0,-10])
    s.append(['소계',None,1,value-10,0,value-10])
    s.append(['총합계',None,1,999 if bad else value-10,0,value-10])
    out=io.BytesIO(); w.save(out); return out.getvalue()

class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.db=connect(self.tmp.name)
        self.p=dict(kind='sales',period='2026-08',sheet='판매',filename='sample.xlsx',actor='admin')
    def tearDown(self): self.db.close(); self.tmp.cleanup()
    def test_duplicate_and_original(self):
        data=workbook(); first=ingest(self.db,data,self.p)
        self.assertTrue(ingest(self.db,data,self.p)['duplicate'])
        self.assertEqual(len(history(self.db)),1)
        self.assertEqual(self.db.execute('SELECT original FROM batches').fetchone()[0],data)
        report=json.loads(history(self.db)[0]['report'])
        self.assertEqual(report['rows'],2); self.assertEqual(report['totals']['qty'],'1')
    def test_revision_and_invalid_preserve_active(self):
        first=ingest(self.db,workbook(),self.p)['id']
        p={**self.p,'expectedActive':first}
        invalid=ingest(self.db,workbook(bad=True),p)
        self.assertFalse(invalid['active'])
        self.assertEqual(self.db.execute('SELECT batch_id FROM active').fetchone()[0],first)
        second=ingest(self.db,workbook(200),p)['id']
        self.assertEqual(self.db.execute('SELECT supersedes FROM batches WHERE id=?',(second,)).fetchone()[0],first)
        with self.assertRaises(ImportErrorDetail) as cm: ingest(self.db,workbook(300),p)
        self.assertEqual(cm.exception.status,409)
        self.assertEqual(len(history(self.db)),3)
    def test_concurrent_duplicate(self):
        data=workbook()
        def run(_):
            db=connect(self.tmp.name)
            try:return ingest(db,data,self.p)
            finally:db.close()
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(run,range(4)))
        self.assertEqual(sum(not r['duplicate'] for r in results),1)
        self.assertEqual(len(history(self.db)),1)
    def test_crash_rollback(self):
        self.db.execute("CREATE TRIGGER fail_activation BEFORE INSERT ON active BEGIN SELECT RAISE(ABORT, 'test interruption'); END")
        with self.assertRaises(Exception): ingest(self.db,workbook(),self.p)
        self.assertEqual(len(history(self.db)),0)
    def test_bad_input_is_quarantined(self):
        result=ingest(self.db,b'not a zip',self.p)
        self.assertFalse(result['active']); self.assertEqual(len(history(self.db)),1)
        self.assertEqual(self.db.execute('SELECT count(*) FROM active').fetchone()[0],0)
    def test_invalid_metadata(self):
        for change in [dict(actor=''),dict(period='2026-99'),dict(sheet=''),dict(kind='costs'),dict(filename='a.xlsm')]:
            with self.assertRaises(ImportErrorDetail): ingest(self.db,workbook(),{**self.p,**change})
        self.assertEqual(len(history(self.db)),0)
    def test_restart_preserves_history(self):
        ingest(self.db,workbook(),self.p)
        self.db.close(); self.db=connect(self.tmp.name)
        self.assertEqual(len(history(self.db)),1)
        self.assertEqual(history(self.db)[0]['active'],1)

if __name__=='__main__':unittest.main()
