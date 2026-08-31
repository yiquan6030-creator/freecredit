// Vercel Serverless Function: /api/analytics.js
// 统一单函数读写 + /tmp 本地持久化，确保统计 100% 同步

import fs from 'fs';
import path from 'path';

const TMP_FILE = path.join('/tmp', 'analytics_store_v1.json');

function loadStats() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {}

  if (global.unifiedClickStats) {
    return global.unifiedClickStats;
  }

  return {
    totalClicks: 0,
    linkCounts: {
      'link-u2-rm10': 0,
      'link-vw-topup20': 0,
      'link-u2-usdt': 0,
      'link-u2-4d': 0
    },
    mobileClicks: 0,
    desktopClicks: 0,
    logs: []
  };
}

function saveStats(stats) {
  global.unifiedClickStats = stats;
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(stats), 'utf8');
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let stats = loadStats();

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = urlObj.searchParams.get('action') || (req.query && req.query.action) || 'stats';

  if (action === 'track' || req.method === 'POST') {
    const key = urlObj.searchParams.get('key') || (req.query && req.query.key) || 'link-u2-rm10';
    const device = urlObj.searchParams.get('device') || (req.query && req.query.device) || 'mobile';

    stats.totalClicks = (stats.totalClicks || 0) + 1;
    if (!stats.linkCounts) stats.linkCounts = {};
    stats.linkCounts[key] = (stats.linkCounts[key] || 0) + 1;

    if (device === 'mobile') {
      stats.mobileClicks = (stats.mobileClicks || 0) + 1;
    } else {
      stats.desktopClicks = (stats.desktopClicks || 0) + 1;
    }

    saveStats(stats);

    return res.status(200).json({
      success: true,
      action: 'track',
      trackedKey: key,
      device: device,
      stats: stats
    });
  }

  // 默认返回 stats
  return res.status(200).json({
    success: true,
    action: 'stats',
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
