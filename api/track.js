// Vercel Serverless Function: /api/track.js
// 100% 同域后端上报，无视广告拦截与跨域限制

export default async function handler(req, res) {
  // 设置 CORS 跨域头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { key = 'link-u2-rm10', device = 'mobile' } = req.query;
  const NAMESPACE = '4d88_lol_analytics_v3';

  try {
    // 后端对后端请求云端 CounterAPI（不受浏览器跨域和插件影响）
    await Promise.allSettled([
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${key}/up`),
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/total/up`),
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${device}/up`)
    ]);

    return res.status(200).json({ success: true, trackedKey: key, device: device });
  } catch (error) {
    return res.status(200).json({ success: false, error: error.message });
  }
}
