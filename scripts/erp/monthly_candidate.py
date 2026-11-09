"""Calculate a monthly preview on a disposable copy of the staging DB."""
from contextlib import closing
import sqlite3

from checked_import import stage
from dashboard import snapshot
from erp_errors import ImportErrorDetail


def monthly_candidate(source_db, period, actor, inputs):
    """Return a preview only after both sales and purchases have been validated together.

    Each input uses the checked_import request fields, including expectedActive for
    replacements. The caller supplies the trusted period and actor.
    """
    if not actor:
        raise ImportErrorDetail("인증이 필요합니다.", 401)
    if sorted(item["kind"] for item in inputs) != ["purchases", "sales"]:
        raise ImportErrorDetail("판매 및 매입 원본이 각각 한 건 필요합니다.", 422)
    with closing(sqlite3.connect("")) as candidate:
        source_db.backup(candidate)
        candidate.row_factory = sqlite3.Row
        for item in inputs:
            if item.get("period") != period:
                raise ImportErrorDetail("자료월이 일치하지 않습니다.", 422)
            outcome = stage(candidate, {**item, "action": "import", "actor": actor})
            if outcome not in {"activated", "already_active"}:
                raise ImportErrorDetail("후보 원본의 활성 상태를 확인할 수 없습니다.", 422)
            count = candidate.execute(
                "SELECT count(*) FROM active WHERE period=? AND kind=?",
                (period, item["kind"]),
            ).fetchone()[0]
            if count != 1:
                raise ImportErrorDetail("같은 자료월에 원본 범위가 중복됩니다.", 422)
        return snapshot(candidate, {"period": period, "actor": actor})
