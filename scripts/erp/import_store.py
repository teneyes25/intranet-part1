"""Private, transactional staging. No accounting publication or ERP writes."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import tempfile
import uuid
import zipfile
from validate import read_sheet, SCHEMAS
from expense_sources import read_costs
from erp_errors import ImportErrorDetail

MAX_BYTES = 20 * 1024 * 1024

def connect(root):
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    db = sqlite3.connect(root / 'imports.sqlite3', timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA synchronous=FULL')
    db.executescript('''
    CREATE TABLE IF NOT EXISTS monthly_previews (
      period TEXT NOT NULL, revision INTEGER NOT NULL, request_hash TEXT NOT NULL,
      report TEXT NOT NULL, PRIMARY KEY(period, revision));
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, period TEXT NOT NULL,
      sheet TEXT NOT NULL, digest TEXT NOT NULL, filename TEXT NOT NULL,
      actor TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      supersedes TEXT, valid INTEGER NOT NULL, report TEXT NOT NULL,
      original BLOB NOT NULL,
      UNIQUE(kind, period, sheet, digest));
    CREATE TABLE IF NOT EXISTS active (
      kind TEXT NOT NULL, period TEXT NOT NULL, sheet TEXT NOT NULL,
      batch_id TEXT NOT NULL REFERENCES batches(id), PRIMARY KEY(kind,period,sheet));
    CREATE TABLE IF NOT EXISTS source_rows (
      batch_id TEXT PRIMARY KEY, records TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL, source_row INTEGER NOT NULL,
      actor TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS allocations (
      id TEXT PRIMARY KEY, period TEXT NOT NULL, actor TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, fingerprint TEXT NOT NULL,
      inputs TEXT NOT NULL, result TEXT NOT NULL);
    ''')
    os.chmod(root / 'imports.sqlite3', 0o600)
    return db

def history(db):
    return [dict(r) for r in db.execute('''SELECT b.id,b.kind,b.period,b.sheet,b.digest,
    b.filename,b.actor,b.created_at,b.supersedes,b.valid,b.report,
    CASE WHEN a.batch_id=b.id THEN 1 ELSE 0 END AS active
    FROM batches b LEFT JOIN active a ON a.batch_id=b.id
    ORDER BY b.rowid DESC LIMIT 100''')]

def ingest(db, data, payload):
    kind, period, sheet = payload.get('kind'), payload.get('period',''), payload.get('sheet','')
    if kind not in {*SCHEMAS, 'expenses', 'cards'} or not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', period):
        raise ImportErrorDetail('자료 종류와 기준월을 확인하십시오.')
    if not isinstance(sheet,str) or len(sheet)>100:
        raise ImportErrorDetail('시트명을 확인하십시오.')
    # One canonical sheet per slot: prevents same workbook being active twice via blank/named aliases.
    if not sheet.strip():
        raise ImportErrorDetail('원본의 시트명을 명시하십시오.')
    name = str(payload.get('filename','')).replace('\\','/').split('/')[-1][:200]
    if not name.lower().endswith('.xlsx') or not 0 < len(data) <= MAX_BYTES:
        raise ImportErrorDetail('20MB 이하의 XLSX 파일만 허용합니다.')
    if not payload.get('actor'): raise ImportErrorDetail('인증이 필요합니다.',401)
    digest = hashlib.sha256(data).hexdigest()
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries=archive.infolist()
            if len(entries)>2000 or sum(e.file_size for e in entries)>(200 if kind=='expenses' else 50)*1024*1024:
                raise ImportErrorDetail('압축 해제 크기가 허용 범위를 초과합니다.')
            if any(e.filename.lower().endswith('vbaproject.bin') for e in entries):
                raise ImportErrorDetail('매크로 파일은 허용하지 않습니다.')
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'input.xlsx'; path.write_bytes(data)
            records, report = (read_costs(path, sheet, kind, period) if kind in {'expenses','cards'}
                               else read_sheet(path, sheet, kind))
    except ImportErrorDetail: raise
    except Exception:
        records=[]
        report={'validated':False,'errors':[{'issue':'invalid_workbook_or_schema'}]}
    db.execute('BEGIN IMMEDIATE')
    try:
        if kind in {'cards','expenses'}:
            prior=db.execute('SELECT id FROM batches WHERE kind=? AND digest=? AND valid=1', (kind,digest)).fetchone()
            if prior:
                db.rollback()
                return {'id':prior['id'],'duplicate':True}
        same=db.execute('SELECT id FROM batches WHERE kind=? AND period=? AND sheet=? AND digest=?',
                        (kind,period,sheet,digest)).fetchone()
        if same:
            db.rollback()
            return {'id':same['id'],'duplicate':True}
        current=db.execute('SELECT batch_id FROM active WHERE kind=? AND period=? AND sheet=?',
                           (kind,period,sheet)).fetchone()
        parent=current['batch_id'] if current else None
        if payload.get('expectedActive') != parent:
            raise ImportErrorDetail('현재 자료가 변경되었습니다. 이력을 새로 조회하고 수정 대상을 확인하십시오.',409)
        batch=str(uuid.uuid4())
        db.execute('INSERT INTO batches(id,kind,period,sheet,digest,filename,actor,supersedes,valid,report,original) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
                   (batch,kind,period,sheet,digest,name,payload['actor'],parent,int(report['validated']),json.dumps(report,ensure_ascii=False),data))
        db.execute('INSERT INTO source_rows VALUES(?,?)', (batch,json.dumps(records,ensure_ascii=False,default=str)))
        if report['validated']:
            db.execute('INSERT INTO active VALUES(?,?,?,?) ON CONFLICT(kind,period,sheet) DO UPDATE SET batch_id=excluded.batch_id',
                       (kind,period,sheet,batch))
        db.commit()
        return {'id':batch,'duplicate':False,'report':report,'active':report['validated']}
    except BaseException:
        db.rollback(); raise

def main():
    payload=json.loads(sys.stdin.read(30*1024*1024))
    root=os.environ.get('ERP_IMPORT_DIR')
    if not root: raise ImportErrorDetail('ERP 전용 보관 경로가 설정되지 않았습니다.',503)
    with connect(root) as db:
        if payload['action']=='list': result={'batches':history(db)}
        elif payload['action']=='import': result=ingest(db,base64.b64decode(payload['data'],validate=True),payload)
        elif payload['action']=='dashboard':
            from preview_history import read_dashboard
            result=read_dashboard(db,payload)
        elif payload['action']=='select_monthly_preview':
            from preview_history import select_preview
            result=select_preview(db,payload)
        elif payload['action'] in {'review_state','save_review','allocate'}:
            from review_store import dispatch
            result=dispatch(db,payload)
        else: raise ImportErrorDetail('지원하지 않는 작업입니다.')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':
    try: main()
    except ImportErrorDetail as e: print(json.dumps({'error':str(e),'status':e.status},ensure_ascii=False))
    except Exception: print(json.dumps({'error':'자료 처리 실패. 기존 정상 자료는 유지됩니다.','status':500},ensure_ascii=False))
