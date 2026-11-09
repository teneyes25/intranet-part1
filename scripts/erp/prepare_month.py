"""Prepare a refresh_month job after the exporter has closed both workbooks.

Usage: python prepare_month.py template.json ready.json
The template uses the refresh_month job fields. Relative workbook paths start
beside the template. The ready file can be in a different local directory.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
import zipfile

from import_store import MAX_BYTES


def prepare(template, destination):
    template = template.resolve(strict=True)
    destination = destination.absolute()
    if destination.suffix.lower() != ".json" or destination.resolve() == template:
        raise ValueError("expected separate JSON destination")
    job = json.loads(template.read_text(encoding="utf-8-sig"))
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", job["period"]):
        raise ValueError("invalid month")
    if type(job["expectedRevision"]) is not int or job["expectedRevision"] < 0:
        raise ValueError("invalid revision")
    if not isinstance(job["actor"], str) or not job["actor"].strip():
        raise ValueError("missing actor")
    for kind in ("sales", "purchases"):
        spec = job[kind]
        path = (template.parent / spec["path"]).resolve(strict=True)
        if path.suffix.lower() != ".xlsx" or not isinstance(spec["sheet"], str) or not spec["sheet"]:
            raise ValueError("invalid workbook descriptor")
        with path.open("rb") as stream:
            data = stream.read(MAX_BYTES + 1)
        if not 0 < len(data) <= MAX_BYTES:
            raise ValueError("invalid workbook size")
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            archive.getinfo("xl/workbook.xml")
        digest = hashlib.sha256(data).hexdigest()
        if "sha256" in spec and spec["sha256"] != digest:
            raise ValueError("export digest mismatch")
        spec.update(path=str(path), sha256=digest)

    pending = tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=destination.parent,
                                          prefix=".monthly-job-", suffix=".tmp", delete=False)
    temporary_path = Path(pending.name)
    try:
        with pending:
            json.dump(job, pending, ensure_ascii=False)
            pending.flush()
            os.fsync(pending.fileno())
        os.replace(temporary_path, destination)
    finally:
        temporary_path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("template", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    try:
        prepare(args.template, args.destination)
    except (OSError, ValueError, TypeError, KeyError, zipfile.BadZipFile):
        print('{"outcome":"failed"}')
        return 1
    print('{"outcome":"prepared"}')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
