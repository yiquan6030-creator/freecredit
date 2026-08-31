// Vercel Serverless Function: /api/track.js
// 100% 原生零依赖高可靠云端 Memory + Local Sync 点击上报

if (!global.clickStats) {
  global.clickStats = {
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
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let key = 'link-u2-rm10';
  let device = 'mobile';

  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    key = urlObj.searchParams.get('key') || (req.query && req.query.key) || 'link-u2-rm10';
    device = urlObj.searchParams.get('device') || (req.query && req.query.device) || 'mobile';
  } catch (e) {
    if (req.query) {
      key = req.query.key || key;
      device = req.query.device || device;
    }
  }

  // 累加计算
  global.clickStats.totalClicks = (global.clickStats.totalClicks || 0) + 1;
  if (!global.clickStats.linkCounts) global.clickStats.linkCounts = {};
  global.clickStats.linkCounts[key] = (global.clickStats.linkCounts[key] || 0) + 1;

  if (device === 'mobile') {
    global.clickStats.mobileClicks = (global.clickStats.mobileClicks || 0) + 1;
  } else {
    global.clickStats.desktopClicks = (global.clickStats.desktopClicks || 0) + 1;
  }

  return res.status(200).json({
    success: true,
    trackedKey: key,
    device: device,
    totalClicks: global.clickStats.totalClicks,
    linkCounts: global.clickStats.linkCounts
  });
}
