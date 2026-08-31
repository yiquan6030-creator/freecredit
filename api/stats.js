// Vercel Serverless Function: /api/stats.js
// 100% 同域后端读取接口，返回实时点击数据 JSON

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const NAMESPACE = '4d88_lol_analytics_v3';

  async function getCount(key) {
    try {
      const response = await fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${key}`);
      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
    } catch (e) {}
    return 0;
  }

  try {
    const [total, rm10, topup20, usdt, lottery4d, mobile, desktop] = await Promise.all([
      getCount('total'),
      getCount('link-u2-rm10'),
      getCount('link-vw-topup20'),
      getCount('link-u2-usdt'),
      getCount('link-u2-4d'),
      getCount('mobile'),
      getCount('desktop')
    ]);

    return res.status(200).json({
      success: true,
      totalClicks: total,
      linkCounts: {
        'link-u2-rm10': rm10,
        'link-vw-topup20': topup20,
        'link-u2-usdt': usdt,
        'link-u2-4d': lottery4d
      },
      mobileClicks: mobile,
      desktopClicks: desktop
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
