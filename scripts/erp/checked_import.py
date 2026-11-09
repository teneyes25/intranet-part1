"""Stage one import from the import_store JSON stdin format. Exit 0 only for an active batch."""
import base64
import json
import os
import sys

from import_store import ImportErrorDetail, connect, ingest


def stage(db, request):
    if request.get("action") != "import":
        raise ValueError("expected import action")
    data = base64.b64decode(request["data"], validate=True)
    result = ingest(db, data, request)
    row = db.execute("""
        SELECT b.valid, b.kind, b.period, b.sheet, a.batch_id AS active_id
        FROM batches b LEFT JOIN active a
          ON (a.kind, a.period, a.sheet) = (b.kind, b.period, b.sheet)
        WHERE b.id = ?
    """, (result["id"],)).fetchone()
    if row is None:
        return "unverified"
    if not row["valid"]:
        return "quarantined"
    if any(row[key] != request[key] for key in ("kind", "period", "sheet")):
        return "different_source_slot"
    if row["active_id"] != result["id"]:
        return "superseded"
    return "already_active" if result["duplicate"] else "activated"


def main():
    try:
        raw = sys.stdin.buffer.read(30 * 1024 * 1024 + 1)
        if len(raw) > 30 * 1024 * 1024:
            raise ValueError("oversized request")
        payload = json.loads(raw)
        if not isinstance(payload, dict) or not os.environ.get("ERP_IMPORT_DIR"):
            raise ValueError("missing request or staging directory")
        db = connect(os.environ["ERP_IMPORT_DIR"])
        try:
            outcome = stage(db, payload)
        finally:
            db.close()
    except ImportErrorDetail as exc:
        print(json.dumps({"outcome": "rejected", "status": exc.status}))
        return 1
    except Exception:
        print(json.dumps({"outcome": "failed"}))
        return 1
    print(json.dumps({"outcome": outcome}))
    return 0 if outcome in {"activated", "already_active"} else 1


if __name__ == "__main__":
    sys.exit(main())
