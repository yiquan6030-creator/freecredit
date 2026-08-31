// Vercel Serverless Function: /api/track.js
// 100% 极速多通道 Serverless 点击上报

export default async function handler(req, res) {
  // 设置 CORS 跨域头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 稳健提取 URL 参数 (兼容 GET / POST sendBeacon)
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

  const NAMESPACE = '4d88_lol_analytics_v4';

  try {
    // 双重云端请求并行上报
    await Promise.allSettled([
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${key}/up`),
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/total/up`),
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${device}/up`),
      // 备用通道 2: countapi
      fetch(`https://api.countapi.xyz/hit/${NAMESPACE}/${key}`).catch(() => {}),
      fetch(`https://api.countapi.xyz/hit/${NAMESPACE}/total`).catch(() => {})
    ]);

    return res.status(200).json({ success: true, trackedKey: key, device: device });
  } catch (error) {
    return res.status(200).json({ success: true, warning: error.message });
  }
}
