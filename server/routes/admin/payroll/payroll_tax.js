const express = require('express');
const router = express.Router();
const db = require('../../../db/mysql');

// 날짜 지정하여 레코드 조회 (기본 페이지 진입 시)
router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
    const [employees] = await db.query(
      'SELECT eid, name, jcode, jtitle, work1 FROM employees WHERE status = "active"'
    );

    const selectedPdate = req.session.lastPayDate || new Date().toISOString().split('T')[0];
    const selectedEidName = req.session.lastEidName || '';
    delete req.session.lastPayDate;
    delete req.session.lastEidName;

    const [paylist] = await db.query('SELECT * FROM payroll_tax WHERE pdate = ?', [selectedPdate]);

    res.render('admin/payroll/payroll_tax', {
      layout: 'layout',
      title: 'Payroll Management',
      isAuthenticated: true,
      name: req.session.user.name,
      employees,
      selectedPdate,
      selectedEidName,
      paylist,
      now: new Date().toString()
    });
  } catch (err) {
    console.error('DB 조회 오류:', err);
    res.status(500).send('DB 오류');
  }
});

// 최신 급여 기록 가져오기 (Reference 버튼)
router.get('/paylist/latest', async (req, res) => {
  const { eid } = req.query;
  if (!eid) return res.json({ success: false, message: 'eid 누락' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM payroll_tax WHERE eid = ? ORDER BY pdate DESC LIMIT 1',
      [eid]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: '이전 기록 없음' });
    }

    const latest = rows[0];
    return res.json({ success: true, ...latest });
  } catch (err) {
    console.error('Reference 조회 오류:', err);
    return res.json({ success: false, message: 'DB 오류' });
  }
});

// 데이터 저장
router.post('/add', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const {
    eid, name, jcode, jtitle, work1,
    pdate, ckno_table, rtime, otime, dtime,
    fw, sse, me, caw, cade, adv, d1, dd,
    gross, tax, net, remark
  } = req.body;

  req.session.lastPayDate = pdate;
  req.session.lastEidName = `eid: ${eid} / ${name}`;

  try {
    await db.query(
      `INSERT INTO payroll_tax (
        eid, name, jcode, jtitle, work1,
        pdate, ckno, rtime, otime, dtime,
        fw, sse, me, caw, cade, adv, csp, dd,
        gross, tax, net, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eid, name, jcode, jtitle, work1,
        pdate, ckno_table,
        toNumber(rtime), toNumber(otime), toNumber(dtime),
        toNumber(fw), toNumber(sse), toNumber(me), toNumber(caw), toNumber(cade),
        toNumber(adv), toNumber(d1), toNumber(dd),
        toNumber(gross), toNumber(tax), toNumber(net), remark
      ]
    );

    res.redirect('/admin/payroll/payroll_tax');
  } catch (err) {
    console.error('급여 저장 오류:', err);
    res.status(500).send('급여 저장 실패');
  }
});

// 도우미 숫자 변환 함수
function toNumber(val) {
  if (typeof val === 'string') {
    val = val.replace(/,/g, '');
  }
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

module.exports = router;
