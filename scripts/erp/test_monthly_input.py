"""Exercise monthly file validation and retry behavior with synthetic workbooks."""
import concurrent.futures
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing

import openpyxl
from import_store import connect
from test_dashboard import sample_workbook


class MonthlyInputTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.store = self.root / "db"
        with closing(connect(self.store)):
            pass
        self.job = dict(period="2026-08", actor="fixture", expectedRevision=0)
        for kind in ("sales", "purchases"):
            filename = kind + ".xlsx"
            (self.root / filename).write_bytes(sample_workbook(kind))
            self.job[kind] = dict(path=filename, sheet=kind)
        self.jobfile = self.root / "job.json"
        self.jobfile.write_text(json.dumps(self.job))

    def invoke(self):
        proc = subprocess.run([sys.executable, Path(__file__).with_name("refresh_month.py").resolve(), self.jobfile],
                              env={**os.environ, "ERP_IMPORT_DIR": str(self.store)},
                              capture_output=True, text=True, timeout=30)
        self.assertFalse(proc.stderr)
        return proc.returncode, json.loads(proc.stdout)

    def test_wrong_month_or_year(self):
        for kind, date in [("sales", "2026-09-01"), ("purchases", "2025-08-01"),
                           ("purchases", "09/01"), ("purchases", "08/32")]:
            with self.subTest(kind=kind, date=date):
                path = self.root / self.job[kind]["path"]
                original = path.read_bytes()
                wb = openpyxl.load_workbook(io.BytesIO(original))
                wb.active["A3"] = date
                wb.save(path)
                wb.close()
                self.assertEqual(self.invoke(), (1, {"outcome": "rejected", "status": 422}))
                path.write_bytes(original)
        with closing(connect(self.store)) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM monthly_previews").fetchone()[0], 0)

    def test_partial_then_concurrent_retry(self):
        path = self.root / self.job["purchases"]["path"]
        data = path.read_bytes()
        path.write_bytes(data[:len(data)//2])
        self.assertEqual(self.invoke()[0], 1)
        path.write_bytes(data)
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda _: self.invoke(), range(2)))
        self.assertCountEqual([(code, result["outcome"], result["revision"]) for code, result in results],
                              [(0, "selected", 1), (0, "already_selected", 1)])

    def test_wrong_intact_file_with_expected_hash(self):
        self.job["sales"]["sha256"] = hashlib.sha256((self.root/"sales.xlsx").read_bytes()).hexdigest()
        self.jobfile.write_text(json.dumps(self.job))
        (self.root/"sales.xlsx").write_bytes(sample_workbook("sales", amount=440))
        self.assertEqual(self.invoke()[0], 1)
        with closing(connect(self.store)) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM monthly_previews").fetchone()[0], 0)
