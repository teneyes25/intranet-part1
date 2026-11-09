"""Select one monthly management preview from a trusted local JSON job file.

Set ERP_IMPORT_DIR to the existing staging directory. A job gives period, actor,
expectedRevision, and sales and purchases objects with path, sheet and optional
expectedActive. Set sha256 to the completed export digest when available. Relative input paths resolve beside the job. Retry with the
same job and files. Exit 0 means the preview was selected or already selected.
"""
import argparse
import base64
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3

from erp_errors import ImportErrorDetail
from import_store import MAX_BYTES, connect
from preview_history import select_preview


def execute(job_path, storage):
    if not storage.is_absolute() or not (storage / "imports.sqlite3").is_file():
        raise ValueError("missing staging store")
    job = json.loads(job_path.read_text(encoding="utf-8-sig"))
    period = job["period"]
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", period):
        raise ValueError("invalid period")
    inputs = []
    for kind in ("sales", "purchases"):
        spec = job[kind]
        file = job_path.parent / spec["path"]
        with file.open("rb") as stream:
            raw = stream.read(MAX_BYTES + 1)
        if not 0 < len(raw) <= MAX_BYTES:
            raise ValueError("invalid workbook size")
        if "sha256" in spec and hashlib.sha256(raw).hexdigest() != spec["sha256"]:
            raise ImportErrorDetail("입력 파일이 작업 명세의 해시와 일치하지 않습니다.", 422)
        inputs.append(dict(kind=kind, period=period, sheet=spec["sheet"],
                           filename=file.name, expectedActive=spec.get("expectedActive"),
                           data=base64.b64encode(raw).decode("ascii")))
    with closing(connect(storage)) as db:
        result = select_preview(db, dict(period=period, actor=job["actor"], inputs=inputs,
                                         expectedRevision=job["expectedRevision"]))
    return {"outcome": "already_selected" if result["duplicate"] else "selected",
            "period": period, "revision": result["revision"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("job", type=Path)
    args = parser.parse_args()
    try:
        result = execute(args.job.resolve(), Path(os.environ["ERP_IMPORT_DIR"]))
    except ImportErrorDetail as error:
        print(json.dumps({"outcome": "rejected", "status": error.status}))
        return 1
    except (OSError, sqlite3.Error, ValueError, KeyError, TypeError):
        print('{"outcome":"failed"}')
        return 1
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
