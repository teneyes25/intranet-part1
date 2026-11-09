"""Process-level staging recovery tests using synthetic workbooks and a private DB."""
import base64
import concurrent.futures
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import threading
import unittest

from test_import_store import workbook

HERE = Path(__file__).resolve().parent
# Fault injection only in the disposable child. ingest returns after commit.
EXIT_AFTER_COMMIT = """
import os
import checked_import
original = checked_import.ingest
def interrupt(*args):
    original(*args)
    os._exit(73)
checked_import.ingest = interrupt
raise SystemExit(checked_import.main())
"""


class CheckedImportTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.env = {**os.environ, "ERP_IMPORT_DIR": str(self.root)}
        self.assertEqual(self.submit(workbook()), (0, {"outcome": "activated"}))
        self.db = sqlite3.connect(self.root / "imports.sqlite3")
        self.addCleanup(self.db.close)
        self.initial_id = self.active_id()

    def active_id(self):
        return self.db.execute("SELECT batch_id FROM active").fetchone()[0]

    def submit(self, data, parent=None, interrupt=False):
        request = dict(action="import", kind="sales", period="2026-08",
                       sheet="판매", filename="fixture.xlsx", actor="test",
                       data=base64.b64encode(data).decode(), expectedActive=parent)
        args = ["-c", EXIT_AFTER_COMMIT] if interrupt else ["checked_import.py"]
        run = subprocess.run([sys.executable, *args], cwd=HERE, env=self.env,
                             input=json.dumps(request), capture_output=True,
                             text=True, timeout=25)
        return run.returncode, json.loads(run.stdout) if run.stdout else None

    def check_state(self, expected_bytes, count):
        row = self.db.execute(
            "SELECT b.original FROM active a JOIN batches b ON b.id=a.batch_id"
        ).fetchall()
        self.assertEqual(row, [(expected_bytes,)])
        for table in ("batches", "source_rows"):
            self.assertEqual(self.db.execute(f"SELECT count(*) FROM {table}").fetchone(), (count,))
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone(), ("ok",))

    def test_competing_replacements(self):
        inputs = [workbook(200), workbook(300)]
        gate = threading.Barrier(2)
        def replace(data):
            gate.wait(timeout=10)
            return self.submit(data, self.initial_id)
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = list(pool.map(replace, inputs))
        success = (0, {"outcome": "activated"})
        self.assertCountEqual(results, [success, (1, {"outcome": "rejected", "status": 409})])
        self.check_state(inputs[results.index(success)], 2)

    def test_lost_reply_and_late_retry(self):
        replacement = workbook(200)
        self.assertEqual(self.submit(replacement, self.initial_id, interrupt=True), (73, None))
        self.check_state(replacement, 2)
        self.assertEqual(self.submit(replacement, self.initial_id), (0, {"outcome": "already_active"}))
        self.check_state(replacement, 2)
        newer = workbook(300)
        self.assertEqual(self.submit(newer, self.active_id()), (0, {"outcome": "activated"}))
        self.assertEqual(self.submit(replacement, self.initial_id), (1, {"outcome": "superseded"}))
        self.check_state(newer, 3)


if __name__ == "__main__":
    unittest.main()
