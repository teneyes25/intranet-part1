"""Record or verify a closed standalone ERP backup, using a separately held SHA-256 file."""
import argparse
from contextlib import closing
import hashlib
import os
from pathlib import Path
import sqlite3


def require_standalone(path):
    if any(Path(str(path) + suffix).exists() for suffix in ("-wal", "-shm", "-journal")):
        raise ValueError("backup has sidecar files")


def checksum(path):
    require_standalone(path)
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    require_standalone(path)
    return digest.hexdigest() + "\n"


def record(backup, reference):
    before = checksum(backup)
    uri = backup.as_uri() + "?mode=ro&immutable=1"
    with closing(sqlite3.connect(uri, uri=True)) as db:
        if db.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise ValueError("damaged database")
        for original, expected in db.execute("SELECT original, digest FROM batches"):
            if hashlib.sha256(original).hexdigest() != expected:
                raise ValueError("original digest mismatch")
    if checksum(backup) != before:
        raise ValueError("backup changed during validation")
    with reference.open("x", encoding="ascii", newline="\n") as stream:
        stream.write(before)
        stream.flush()
        os.fsync(stream.fileno())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("record", "verify"))
    parser.add_argument("backup", type=Path)
    parser.add_argument("reference", type=Path)
    args = parser.parse_args()
    try:
        backup = args.backup.resolve(strict=True)
        if args.action == "record":
            record(backup, args.reference)
        elif args.reference.read_bytes() != checksum(backup).encode("ascii"):
            raise ValueError("backup mismatch")
    except (OSError, sqlite3.Error, ValueError, TypeError):
        print("failed")
        return 1
    print("recorded" if args.action == "record" else "verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
