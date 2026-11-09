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
from preview_history import read_dashboard
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

    def replace_closed_file(self, path, data):
        pending = path.with_suffix(".part")
        pending.write_bytes(data)
        os.replace(pending, path)

    def selected_state(self):
        with closing(connect(self.store)) as db:
            count = db.execute("SELECT count(*) FROM monthly_previews").fetchone()[0]
            return count, read_dashboard(db, self.job)

    def exercise_pair_delivery(self, manifest_first):
        files = {kind: self.root / self.job[kind]["path"] for kind in ("sales", "purchases")}
        for kind, path in files.items():
            self.job[kind]["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        self.replace_closed_file(self.jobfile, json.dumps(self.job).encode())
        self.assertEqual(self.invoke()[1]["revision"], 1)
        baseline = self.selected_state()
        self.assertEqual(baseline[0], 1)

        # Change a cell in each workbook so the two generations have distinct digests.
        purchases = openpyxl.load_workbook(files["purchases"])
        purchases.active["A3"] = "2026-08-02"
        output = io.BytesIO()
        purchases.save(output)
        purchases.close()
        new_files = {"sales": sample_workbook("sales", amount=440), "purchases": output.getvalue()}
        self.job["expectedRevision"] = 1
        for kind, data in new_files.items():
            self.job[kind]["sha256"] = hashlib.sha256(data).hexdigest()
        new_manifest = json.dumps(self.job).encode()
        if manifest_first:
            self.replace_closed_file(self.jobfile, new_manifest)
            self.assertEqual(self.invoke(), (1, {"outcome": "rejected", "status": 422}))
            self.assertEqual(self.selected_state(), baseline)

        self.replace_closed_file(files["sales"], new_files["sales"])
        self.assertEqual(self.invoke(), (1, {"outcome": "rejected", "status": 422}))
        self.assertEqual(self.selected_state(), baseline)
        self.replace_closed_file(files["purchases"], new_files["purchases"])

        if not manifest_first:
            self.assertEqual(self.invoke(), (1, {"outcome": "rejected", "status": 422}))
            self.assertEqual(self.selected_state(), baseline)
            self.replace_closed_file(self.jobfile, new_manifest)
        self.assertEqual(self.invoke(), (0, {"outcome": "selected", "period": "2026-08", "revision": 2}))
        count, report = self.selected_state()
        self.assertEqual(count, 2)
        self.assertEqual(report["selection_revision"], 2)
        self.assertEqual({src["kind"]: src["digest"] for src in report["sources"]},
                         {kind: self.job[kind]["sha256"] for kind in files})
        self.assertEqual(self.invoke()[1]["outcome"], "already_selected")
        self.assertEqual(self.selected_state(), (count, report))

    def test_manifest_delivered_last(self):
        self.exercise_pair_delivery(manifest_first=False)

    def test_manifest_delivered_first(self):
        self.exercise_pair_delivery(manifest_first=True)

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
