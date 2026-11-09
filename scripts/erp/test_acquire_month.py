import hashlib
import json
import multiprocessing
import os
from pathlib import Path
import tempfile
import unittest
from contextlib import closing

from acquire_month import acquire_month
from import_store import connect
from preview_history import read_dashboard
from refresh_month import execute
from test_dashboard import sample_workbook


def collect(root, job, barrier, interrupted):
    def export(kind, period, destination):
        if kind == "purchases":
            barrier.wait(timeout=20)
            if interrupted:
                os._exit(76)
        destination.write_bytes(sample_workbook(kind, amount=440 if interrupted else 220))
    acquire_month(root, job, export)


class AcquireTests(unittest.TestCase):
    def test_overlap_with_interrupted_export(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            job = dict(period="2026-08", actor="fixture", expectedRevision=0,
                       sales={"sheet": "sales"}, purchases={"sheet": "purchases"})
            context = multiprocessing.get_context("spawn")
            barrier = context.Barrier(2)
            processes = [context.Process(target=collect, args=(root, job, barrier, stop))
                         for stop in (True, False)]
            for process in processes:
                process.start()
            for process in processes:
                process.join(timeout=30)
                if process.is_alive():
                    process.kill()
                    process.join()
                    self.fail("export did not finish")
            self.assertEqual([p.exitcode for p in processes], [76, 0])
            runs = list(root.glob("export-*"))
            self.assertEqual(len(runs), 2)
            jobs = list(root.glob("export-*/ready.json"))
            self.assertEqual(len(jobs), 1)
            ready = jobs[0]
            incomplete = next(run for run in runs if run != ready.parent)
            self.assertEqual([p.name for p in incomplete.iterdir()], ["sales.xlsx"])
            store = root / "store"
            with closing(connect(store)):
                pass
            self.assertEqual(execute(ready, store)["outcome"], "selected")
            self.assertEqual(execute(ready, store)["outcome"], "already_selected")
            with closing(connect(store)) as db:
                report = read_dashboard(db, job)
                self.assertEqual(db.execute("SELECT count(*) FROM monthly_previews").fetchone()[0], 1)
            manifest = json.loads(ready.read_text())
            self.assertEqual({s["kind"] for s in report["sources"]}, {"sales", "purchases"})
            for src in report["sources"]:
                spec = manifest[src["kind"]]
                path = Path(spec["path"])
                self.assertEqual(path.parent, ready.parent)
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), spec["sha256"])
                self.assertEqual(src["digest"], spec["sha256"])
