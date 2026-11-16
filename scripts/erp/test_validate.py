import tempfile
import unittest
from pathlib import Path
from decimal import Decimal
import openpyxl
from validate import read_sheet, number, compare

class ValidationTests(unittest.TestCase):
 def test_number(self):
  self.assertEqual(number('1,200.50'),Decimal('1200.50'))
  for x in ['NaN','abc',True]:
   with self.assertRaises(ValueError):number(x)
 def test_totals_and_returns(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'sample.xlsx';w=openpyxl.Workbook();s=w.active
   s.append(['export']);s.append(['日','품목코드코드','수량','공급가액','부가세','합 계'])
   s.append(['08/01-1','001',2,200,20,220]);s.append(['08/02-1','001',-1,-100,-10,-110])
   s.append(['08 계',None,1,100,10,110]);s.append(['총합계',None,1,100,10,110]);w.save(p)
   r,c=read_sheet(p,None,'sales');self.assertTrue(c['validated']);self.assertEqual(len(r),2)
   self.assertEqual(r[0]['code'],'001')
   s.cell(6,4,999);w.save(p);self.assertFalse(read_sheet(p,None,'sales')[1]['validated'])
 def test_unpriced_not_zero(self):
  c=compare([{'code':'a'},{'code':'b'}],[{'code':'a','qty':1,'price':0}],[])
  self.assertEqual(c['priced_codes'],0);self.assertEqual(c['unpriced_codes'],['a','b'])

if __name__=='__main__':unittest.main()
