# ERP 오프라인 검증

현재 명령은 읽기 전용 검증이며 웹 업로드/자동 수집/스케줄러가 아니다. 운영 DB에 연결하지 않는다.

Python 3.10+ 및 openpyxl 3.1.5 사용. 앱 Docker에 설치된 것으로 가정하지 않는다. 입력은 ECOUNT 한국어 다운로드 양식이며 헤더가 달라지면 실패한다. 재고 시트는 현재 제공된 `7월말 재고`, `8월말 재고`, `Sheet2`로 한정되어 있다. 월별 양식 자동화는 다음 단계다.

```sh
python -m unittest discover -s scripts/erp -v
python scripts/erp/validate.py --sales /private/sales.xlsx --purchases /private/purchases.xlsx --master /private/master.xlsx --stock /private/stock.xlsx --output /private/validation.json
```

종료 1은 행/합계 오류 또는 재고 스냅샷 차이 존재, 0은 이 검증 범위 통과다. 금융 정책의 타당성/완전한 원가를 보증하지 않는다. 결과는 항상 publishable=false이며 게시 기능이 없다. 출처 행 번호와 파일 SHA256으로 추적한다. 총합계의 단가 합산은 검사하지 않는다. 음수 수량은 보존한다. 월 소계와 전체 합계는 상세에 더하지 않는다.

제한: 신뢰된 로컬 엑셀용. 악성 파일 제한/ZIP 폭탄/파일크기/행수 제한 및 업로드 인증은 웹 수집 단계에서 구현해야 한다. 실데이터 결과는 비공개 경로에 보관한다.
