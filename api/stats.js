// Vercel Serverless Function: /api/stats.js
// 100% 原生零依赖高可靠云端 Memory 数据读取接口

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const stats = global.clickStats || {
    totalClicks: 0,
    linkCounts: {
      'link-u2-rm10': 0,
      'link-vw-topup20': 0,
      'link-u2-usdt': 0,
      'link-u2-4d': 0
    },
    mobileClicks: 0,
    desktopClicks: 0
  };

  return res.status(200).json({
    success: true,
    totalClicks: stats.totalClicks || 0,
    linkCounts: stats.linkCounts || {
      'link-u2-rm10': 0,
      'link-vw-topup20': 0,
      'link-u2-usdt': 0,
      'link-u2-4d': 0
    },
    mobileClicks: stats.mobileClicks || 0,
    desktopClicks: stats.desktopClicks || 0
  });
}
