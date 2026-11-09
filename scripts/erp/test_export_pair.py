"""Verify preparation using two overlapping synthetic monthly exports."""
from contextlib import closing
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import openpyxl
from import_store import connect
from prepare_month import prepare
from refresh_month import execute
from test_dashboard import sample_workbook


class ExportPairTests(unittest.TestCase):
    def test_overlapping_runs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            runs = [root / "first", root / "second"]
            for index, folder in enumerate(runs):
                folder.mkdir()
                for kind in ("sales", "purchases"):
                    path = folder / (kind + ".xlsx")
                    path.write_bytes(sample_workbook(kind, amount=220 + index))
                    if kind == "purchases" and index:
                        book = openpyxl.load_workbook(path)
                        book.active["A3"] = "2026-08-02"
                        book.save(path)
                        book.close()
            job = dict(period="2026-08", actor="test", expectedRevision=0)
            for kind in ("sales", "purchases"):
                path = runs[1] / (kind + ".xlsx")
                job[kind] = dict(path=str(path), sheet=kind,
                                 sha256=hashlib.sha256(path.read_bytes()).hexdigest())
            template, ready = root / "template.json", root / "ready.json"
            def write():
                template.write_text(json.dumps(job), encoding="utf-8")

            write()
            prepare(template, ready, run_dir=runs[1])
            approved = ready.read_bytes()
            store = root / "store"
            with closing(connect(store)):
                pass
            self.assertEqual(execute(ready, store)["revision"], 1)
            # A self-consistent digest from a different run must not authorize its path.
            other = runs[0] / "purchases.xlsx"
            spec = job["purchases"]
            original = spec.copy()
            spec.update(path=str(other), sha256=hashlib.sha256(other.read_bytes()).hexdigest())
            write()
            with self.assertRaises(ValueError):
                prepare(template, ready, run_dir=runs[1])
            self.assertEqual(ready.read_bytes(), approved)
            # Copying the wrong workbook under the right directory still breaks the pinned digest.
            job["purchases"] = original
            path = Path(original["path"])
            correct = path.read_bytes()
            path.write_bytes(other.read_bytes())
            write()
            with self.assertRaises(ValueError):
                prepare(template, ready, run_dir=runs[1])
            self.assertEqual(ready.read_bytes(), approved)
            path.write_bytes(correct)
            del original["sha256"]
            write()
            with self.assertRaises(ValueError):
                prepare(template, ready, run_dir=runs[1])
            self.assertEqual(ready.read_bytes(), approved)
            self.assertEqual(execute(ready, store)["outcome"], "already_selected")
