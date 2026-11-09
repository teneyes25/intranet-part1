"""Recovery drill with synthetic sales, a reviewed card batch and an allocation."""
import hashlib
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
import unittest

from dashboard import snapshot
from import_store import connect, ingest
from review_store import dispatch, fingerprint
from test_import_store import workbook
from test_review_store import card_workbook


def state(db):
    originals = []
    for batch_id, digest, data in db.execute("SELECT id, digest, original FROM batches ORDER BY id"):
        actual = hashlib.sha256(data).hexdigest()
        if actual != digest:
            raise ValueError("original digest mismatch")
        originals.append((batch_id, actual))
    tables = {}
    for name in ("active", "source_rows", "reviews", "allocations"):
        tables[name] = [tuple(row) for row in db.execute(f"SELECT * FROM {name} ORDER BY rowid")]
    report = snapshot(db, {"period": "2026-08", "actor": "test"})
    del report["generated_at"]
    return originals, tables, report


class BackupTests(unittest.TestCase):
    def test_restore_and_reject_damaged_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with closing(connect(root / "source")) as source:
                sales = dict(kind="sales", sheet="판매", filename="sales.xlsx", period="2026-08", actor="test")
                first = ingest(source, workbook(), sales)["id"]
                card = ingest(source, card_workbook(), dict(sales, kind="cards", sheet="카드"))["id"]
                review = dict(status="include", reason="test", period="2026-08",
                              cost_class="selling_admin", tax_type="non_deductible", tax_amount="0",
                              detail_evidence="synthetic", duplicate_evidence="synthetic",
                              cancellation_evidence="synthetic")
                dispatch(source, dict(action="save_review", actor="test", batch_id=card,
                                      source_row=2, expected_review=None, review=review))
                dispatch(source, dict(action="allocate", actor="test", period="2026-08",
                                      categories={"001": "EVERYDAY"}, fingerprint=fingerprint(source)))
                baseline = state(source)
                self.assertIsNotNone(baseline[2]["allocation_id"])
                backup_path = root / "snapshot.sqlite3"
                with closing(sqlite3.connect(backup_path)) as backup:
                    source.backup(backup)

                ingest(source, workbook(200), dict(sales, expectedActive=first))
                newer = state(source)
                self.assertNotEqual(newer[2]["version"], baseline[2]["version"])

                with closing(connect(root / "restore")) as restored:
                    with closing(sqlite3.connect(backup_path)) as backup:
                        backup.backup(restored)
                    self.assertEqual(state(restored), baseline)
                    self.assertEqual(restored.execute("PRAGMA integrity_check").fetchone()[0], "ok")

                    damaged = root / "truncated.sqlite3"
                    damaged.write_bytes(backup_path.read_bytes()[:128])
                    with closing(sqlite3.connect(damaged)) as bad:
                        with self.assertRaises(sqlite3.DatabaseError):
                            bad.backup(restored)
                    self.assertEqual(state(restored), baseline)
                self.assertEqual(state(source), newer)


if __name__ == "__main__":
    unittest.main()
