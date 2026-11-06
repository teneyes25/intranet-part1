"""Approved monthly two-stage largest-remainder allocation, with exact arithmetic."""
from collections import defaultdict
from decimal import Decimal, ROUND_FLOOR, ROUND_HALF_UP
from erp_errors import ImportErrorDetail
from validate import number

CATEGORIES = ('EVERYDAY', 'NATURAL WARMTH', 'COOLING', 'SOFT WARMTH')


def split(total, weights):
    denominator = sum(weights.values(), Decimal(0))
    if denominator <= 0 or any(v < 0 for v in weights.values()):
        raise ImportErrorDetail('매출이 음수이거나 배부 분모가 0입니다. 배부를 보류합니다.', 422)
    exact = {k: Decimal(total) * v / denominator for k, v in weights.items()}
    result = {k: int(v.to_integral_value(rounding=ROUND_FLOOR)) for k, v in exact.items()}
    ordered = sorted(exact, key=lambda k: (-(exact[k] - result[k]), k))
    for key in ordered[:total - sum(result.values())]: result[key] += 1
    return result


def allocate(total, sales, categories):
    if total < 0: raise ImportErrorDetail('월 순비용이 음수입니다. 검토가 필요합니다.', 422)
    products = defaultdict(Decimal)
    for row in sales:
        net = number(row['net'])
        # VAT=0 exports contain tax-inclusive final selling amounts.
        net = (net / Decimal('1.1')).quantize(Decimal(1), rounding=ROUND_HALF_UP) if number(row['tax']) == 0 else net
        products[row['code']] += net
    if not products or set(categories) != set(products) or any(c not in CATEGORIES for c in categories.values()):
        raise ImportErrorDetail('모든 판매 품목의 카테고리를 지정하십시오.', 422)
    if any(v < 0 for v in products.values()):
        raise ImportErrorDetail('음수 순매출 품목이 있어 배부를 보류합니다.', 422)
    groups = defaultdict(Decimal)
    for code, value in products.items(): groups[categories[code]] += value
    if any(value <= 0 for value in groups.values()):
        raise ImportErrorDetail('카테고리 순매출 분모가 0 이하입니다. 배부를 보류합니다.',422)
    group_amounts = split(total, groups)
    amounts = {}
    for group, amount in group_amounts.items():
        weights = {code: value for code, value in products.items() if categories[code] == group}
        if sum(weights.values()) == 0:
            amounts.update({code: 0 for code in weights})
        else: amounts.update(split(amount, weights))
    return {'total': total, 'allocated': sum(amounts.values()), 'difference': total - sum(amounts.values()),
            'categories': group_amounts, 'products': [{'code': code, 'category': categories[code],
                'net_sales': str(products[code]), 'allocated': amounts[code]} for code in sorted(products)],
            'publishable': False, 'scope': 'reviewed_cost_allocation_preview'}
