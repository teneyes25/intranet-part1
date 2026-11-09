"""Select a validated monthly preview without rewriting imported originals."""
import hashlib
import json

from dashboard import snapshot
from erp_errors import ImportErrorDetail
from monthly_candidate import monthly_candidate


def latest(db, period):
    return db.execute(
        "SELECT * FROM monthly_previews WHERE period=? ORDER BY revision DESC LIMIT 1",
        (period,),
    ).fetchone()


def read_dashboard(db, payload):
    if not payload.get("actor"):
        raise ImportErrorDetail("인증이 필요합니다.", 401)
    selected = latest(db, payload.get("period", ""))
    if selected is None:
        return snapshot(db, payload)
    return json.loads(selected["report"])


def select_preview(db, payload):
    period, actor = payload["period"], payload.get("actor")
    parent = payload.get("expectedRevision")
    if not actor:
        raise ImportErrorDetail("인증이 필요합니다.", 401)
    if type(parent) is not int or parent < 0:
        raise ImportErrorDetail("직전 선택 번호를 확인하십시오.", 422)
    inputs = payload["inputs"]
    encoded = json.dumps([period, parent, actor, inputs], sort_keys=True, separators=(",", ":"))
    request_hash = hashlib.sha256(encoded.encode()).hexdigest()
    stamp = db.execute("PRAGMA data_version").fetchone()[0]
    previous = latest(db, period)
    if previous and previous["request_hash"] == request_hash:
        return {"revision": previous["revision"], "duplicate": True}
    report = monthly_candidate(db, period, actor, inputs)
    with db:
        db.execute("BEGIN IMMEDIATE")
        current = latest(db, period)
        if current and current["request_hash"] == request_hash:
            return {"revision": current["revision"], "duplicate": True}
        revision = current["revision"] if current else 0
        if revision != parent or stamp != db.execute("PRAGMA data_version").fetchone()[0]:
            raise ImportErrorDetail("자료 또는 선택 버전이 변경됐습니다. 다시 조회하십시오.", 409)
        report["selection_revision"] = revision + 1
        db.execute("INSERT INTO monthly_previews(period,revision,request_hash,report) VALUES(?,?,?,?)",
                   (period, revision + 1, request_hash, json.dumps(report, ensure_ascii=False)))
    return {"revision": revision + 1, "duplicate": False}
