const express = require('express');
const router = express.Router();
const db = require('../../../db/mysql');

// 🔍 기간별 payroll_tax 조회
router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { start, end } = req.query;
  let payrecords = [];

  try {
    if (start && end) {
      payrecords = (
        await db.query(
          `SELECT * FROM payroll_tax 
           WHERE pdate BETWEEN ? AND ? 
           ORDER BY ckno ASC`,
          [start, end]
        )
      )[0];
    }

    const today = new Date().toISOString().slice(0, 10);
    const defaultStart = start || today;
    const defaultEnd = end || today;

    res.render('admin/payroll/payroll_tax_result', {
      layout: 'layout',
      title: 'Payroll Tax Result',
      isAuthenticated: true,
      name: req.session.user.name,
      start: defaultStart,
      end: defaultEnd,
      payrecords
    });

  } catch (err) {
    console.error('payroll_tax_result DB 오류:', err);
    res.status(500).send('DB 오류');
  }
});


// 👤 개인별 HTML 보기 라우터
router.get('/viewPhtml', async (req, res) => {
  console.log('🟢 viewPhtml route triggered'); // ✅ 로그 출력되면 라우터 진입 확인
  const { start, end } = req.query;
  console.log('🟢 Query received:', start, end); // ✅ start, end 파라미터 로그
  if (!req.session.user) return res.redirect('/login');
  if (!start || !end) return res.status(400).send('기간을 입력하세요.');

  try {
    // 📦 DB에서 pdate 조건에 맞는 데이터 조회 (eid 있는 사람만)
    const [rows] = await db.query(
      `SELECT eid, name, pdate, ckno, rtime, otime, dtime,
              fw, sse, me, caw, cade, adv, csp, dd, gross, tax, net
       FROM payroll_tax
       WHERE pdate BETWEEN ? AND ?
       AND eid IS NOT NULL
       ORDER BY name ASC, pdate ASC`,
      [start, end]
    );

    const grouped = {};       // 이름 기준 그룹
    const eidMap = {};        // 이름 → eid 매핑
    const totalAll = {
      rtime: 0, otime: 0, dtime: 0,
      fw: 0, sse: 0, me: 0,
      caw: 0, cade: 0, adv: 0, csp: 0, dd: 0,
      gross: 0, tax: 0, net: 0
    };

    // 🔄 각 행 처리
    console.log('📊 rows:', rows);                      // 전체 row 배열 확인
    console.log('📏 rows.length:', rows.length);        // 0이면 문제 있음
    rows.forEach(row => {
      console.log('🔍 name:', row.name, '| eid:', row.eid);

      if (!grouped[row.name]) {
        grouped[row.name] = [];
        eidMap[row.name] = row.eid;
      }

      grouped[row.name].push(row);

      totalAll.rtime += parseFloat(row.rtime || 0);
      totalAll.otime += parseFloat(row.otime || 0);
      totalAll.dtime += parseFloat(row.dtime || 0);
      totalAll.fw += parseFloat(row.fw || 0);
      totalAll.sse += parseFloat(row.sse || 0);
      totalAll.me += parseFloat(row.me || 0);
      totalAll.caw += parseFloat(row.caw || 0);
      totalAll.cade += parseFloat(row.cade || 0);
      totalAll.adv += parseFloat(row.adv || 0);
      totalAll.csp += parseFloat(row.csp || 0);
      totalAll.dd += parseFloat(row.dd || 0);
      totalAll.gross += parseFloat(row.gross || 0);
      totalAll.tax += parseFloat(row.tax || 0);
      totalAll.net += parseFloat(row.net || 0);
    });

    // 🧾 렌더링
    res.render('admin/payroll/payroll_tax_result_viewPhtml', {
      layout: 'layout',
      title: '개인별 급여 HTML 보기',
      isAuthenticated: true,
      name: req.session.user.name,
      start,
      end,
      grouped,
      eidMap,
      totalAll
    });

  } catch (err) {
    console.error('📛 viewPhtml 오류:', err);
    res.status(500).send('DB 오류');
  }
});


module.exports = router;
