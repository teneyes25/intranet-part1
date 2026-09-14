/** 전자결재 본문 양식 (seed · 서버 공용, server-only 금지) */

const cell =
  "border:1px solid #444;padding:6px 8px;font-size:14px;vertical-align:middle";
const th = `${cell};background:#f4f4f4;font-weight:600;text-align:left;width:18%`;
const td = cell;

export const TEMPLATE_HTML = {
  budget: `
<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <tbody>
    <tr>
      <th style="${th}">문서 번호</th>
      <td style="${td}">[문서번호]</td>
      <th style="${th}">작 성 자</th>
      <td style="${td}">[성명]</td>
    </tr>
    <tr>
      <th style="${th}">작성 일자</th>
      <td style="${td}">[YYYY. MM. DD.]</td>
      <th style="${th}">직 책</th>
      <td style="${td}">[직책]</td>
    </tr>
  </tbody>
</table>
<h2>1. 개요</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <tbody>
    <tr>
      <th style="${th}">건&emsp;명</th>
      <td style="${td}" colspan="3">[건명]</td>
    </tr>
    <tr>
      <th style="${th}">집행 목적</th>
      <td style="${td}" colspan="3">[목적]</td>
    </tr>
    <tr>
      <th style="${th}">지출 일자</th>
      <td style="${td}">[YYYY. MM. DD.]</td>
      <th style="${th}">비&emsp;용</th>
      <td style="${td}">[금액] 원</td>
    </tr>
    <tr>
      <th style="${th}">지출 근거</th>
      <td style="${td}" colspan="3">[계약·견적·내부 근거]</td>
    </tr>
  </tbody>
</table>
<h2>2. 예산 검토</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <tbody>
    <tr>
      <th style="${th}">예산 과목</th>
      <td style="${td}" colspan="3">[과목 / 세부항목]</td>
    </tr>
    <tr>
      <th style="${th}">배정 예산</th>
      <td style="${td}">[금액] 원</td>
      <th style="${th}">가용 금액</th>
      <td style="${td}">[금액] 원</td>
    </tr>
  </tbody>
</table>
<h2>3. 적요</h2>
<p>[집행 내역·산출 근거를 기입]</p>
<h2>4. 결재 상신</h2>
<p>작성자 → 지출 담당 → 관리 이사 → 대표이사 (승인일자)</p>
<p><strong>* 위임전결 사항</strong></p>
<p>1) 500만원 이상 : 대표이사 결재</p>
<p>2) 50만원 이상 : 관리 이사 전결</p>
<p>3) 50만원 미만 : 지출 담당 전결</p>
<p>(첨부파일 등록)</p>
`.trim(),

  official: `
<table style="width:100%;border-collapse:collapse;margin-bottom:14px">
  <tbody>
    <tr>
      <th style="${th}">수&emsp;신</th>
      <td style="${td}" colspan="3">[수신처] 귀하</td>
    </tr>
    <tr>
      <th style="${th}">참&emsp;조</th>
      <td style="${td}" colspan="3">[참조]</td>
    </tr>
    <tr>
      <th style="${th}">제&emsp;목</th>
      <td style="${td}" colspan="3">[제목]</td>
    </tr>
  </tbody>
</table>
<p>1. 귀하의 무궁한 발전을 기원합니다.</p>
<p>2. [관련 근거 및 요청 사항을 기입합니다.]</p>
<p style="text-align:center;letter-spacing:0.4em;margin:16px 0"><strong>- 아&emsp;래 -</strong></p>
<p>가. [안건]</p>
<p>나. [일시] &nbsp;년 &nbsp;월 &nbsp;일 &nbsp;시</p>
<p>다. [장소]</p>
<p>붙임: 1부. 끝.</p>
<p style="text-align:right;margin-top:28px">㈜프렌치 메종 대표이사</p>
`.trim(),

  officialInternal: `
<table style="width:100%;border-collapse:collapse;margin-bottom:14px">
  <tbody>
    <tr>
      <th style="${th}">수&emsp;신</th>
      <td style="${td}" colspan="3">내부 각 부서 책임자</td>
    </tr>
    <tr>
      <th style="${th}">참&emsp;조</th>
      <td style="${td}" colspan="3">[참조]</td>
    </tr>
    <tr>
      <th style="${th}">제&emsp;목</th>
      <td style="${td}" colspan="3">[제목]</td>
    </tr>
  </tbody>
</table>
<p>1. 관련 업무 추진을 위해 아래와 같이 알리오니 협조하여 주시기 바랍니다.</p>
<p>2. [지시·협조 사항]</p>
<p style="text-align:center;letter-spacing:0.4em;margin:16px 0"><strong>- 아&emsp;래 -</strong></p>
<p>가. [내용]</p>
<p>나. [일정]</p>
<p>다. [담당]</p>
<p>붙임: 1부. 끝.</p>
<p style="text-align:right;margin-top:28px">㈜프렌치 메종 대표이사</p>
`.trim(),

  general: `
<p style="text-align:right">[YYYY.MM.DD.]</p>
<h2 style="text-align:center">[제목] 알림</h2>
<p><strong>□ 개요</strong></p>
<p>◌ [현행 제도·문서를 언제부터 운영 중인지 기입]</p>
<p>◌ [개정·시행이 필요한 이유]</p>
<p>- [배경 및 문제점]</p>
<p>- [관련 법령·사규]</p>
<p><strong>□ 주요 내용</strong></p>
<p>◌ [변경 요지]</p>
<table style="width:100%;border-collapse:collapse;margin:8px 0 12px">
  <tbody>
    <tr>
      <th style="${th}">구분</th>
      <th style="${th}">현행</th>
      <th style="${th}">변경</th>
    </tr>
    <tr>
      <td style="${td}">[항목]</td>
      <td style="${td}">[현행]</td>
      <td style="${td}">[변경]</td>
    </tr>
    <tr>
      <td style="${td}"></td>
      <td style="${td}"></td>
      <td style="${td}"></td>
    </tr>
  </tbody>
</table>
<p><strong>□ 시행 절차</strong></p>
<p>◌ [의견 청취 기간]</p>
<p>◌ [신고·결재·시행일]</p>
<p>별첨 : 1부. 끝.</p>
`.trim(),
} as const;

