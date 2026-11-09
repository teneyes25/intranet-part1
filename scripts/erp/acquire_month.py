"""Collect a pair of exports into a private run directory and return its ready job.

The exporter callback receives (kind, period, destination). It must write the
requested XLSX at that destination and return only after closing the file.
Propagate exporter failures. Only ready.json is eligible for refresh_month.
"""
import hashlib
import json
from pathlib import Path
import tempfile

from import_store import MAX_BYTES
from prepare_month import prepare


def acquire_month(root, job, export):
    run_dir = Path(tempfile.mkdtemp(prefix="export-", dir=root)).resolve()
    manifest = {key: job[key] for key in ("period", "actor", "expectedRevision")}
    for kind in ("sales", "purchases"):
        path = run_dir / (kind + ".xlsx")
        export(kind, manifest["period"], path)
        with path.open("rb") as stream:
            data = stream.read(MAX_BYTES + 1)
        if not 0 < len(data) <= MAX_BYTES:
            raise ValueError("invalid export size")
        descriptor = dict(path=path.name, sheet=job[kind]["sheet"],
                          sha256=hashlib.sha256(data).hexdigest())
        if "expectedActive" in job[kind]:
            descriptor["expectedActive"] = job[kind]["expectedActive"]
        manifest[kind] = descriptor
    template = run_dir / "captured.json"
    template.write_text(json.dumps(manifest), encoding="utf-8")
    ready = run_dir / "ready.json"
    prepare(template, ready, run_dir=run_dir)
    return ready
