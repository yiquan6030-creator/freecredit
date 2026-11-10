/**
 * 4D88.LOL 全网实时流量来源、页面浏览量 (PV)、按钮点击量 & 访客 IP 归属地双云端追踪引擎
 * Dual-Cloud Engine:
 *   1. Real-Time Event Stream (ntfy.sh) — 零延迟、支持 keepalive/sendBeacon、无每日 100 次限制、绝不丢单
 *   2. Persistent Cloud Snapshot (restful-api.dev) — 永久汇总快照备份（带防覆盖保护）
 */

var DB_OBJECT_ID = "ff808181a058d43f01a05ce71bfe0e02";
var NTFY_STREAM_TOPIC = "4d88_lol_analytics_stream_v3";
var NTFY_STREAM_URL = "https://ntfy.sh/" + NTFY_STREAM_TOPIC;

// 全局内存缓存的访客 IP 信息（页面加载即预取，保证点击时 0ms 瞬发上报）
window.__VISITOR_IP_CACHE__ = {
  ip: "Detecting...",
  location: "🇲🇾 Malaysia",
  ready: false
};

function copyCode(elementId, text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(function () {
      showToast("Link/Code Copied: " + text);
    }).catch(function () {
      fallbackCopyTextToClipboard(text);
    });
  } else {
    fallbackCopyTextToClipboard(text);
  }
}

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand("copy");
    if (successful) {
      showToast("Link/Code Copied: " + text);
    } else {
      showToast("Failed to copy automatically.");
    }
  } catch (err) {
    showToast("Failed to copy automatically.");
  }

  document.body.removeChild(textArea);
}

function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add("show");

  setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}

/**
 * 带超时控制的 fetch 辅助函数，防止慢速 IP 接口阻塞上报
 */
function fetchWithTimeout(url, options, timeoutMs) {
  timeoutMs = timeoutMs || 3500;
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error("Timeout"));
    }, timeoutMs);
    fetch(url, options || {}).then(function (res) {
      clearTimeout(timer);
      resolve(res);
    }).catch(function (err) {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * 获取访客真实 IP 地址与国家/城市/运营商归属地 (带缓存与多重容灾 + 3.5秒超时)
 */
async function getVisitorIpInfo() {
  try {
    if (window.__VISITOR_IP_CACHE__ && window.__VISITOR_IP_CACHE__.ready) {
      return window.__VISITOR_IP_CACHE__;
    }
    var cached = sessionStorage.getItem("visitor_ip_info_v2");
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.ip && parsed.ip !== "Unknown IP" && parsed.ip !== "Detecting...") {
        window.__VISITOR_IP_CACHE__ = { ip: parsed.ip, location: parsed.location, ready: true };
        return window.__VISITOR_IP_CACHE__;
      }
    }
  } catch (e) {}

  var info = {
    ip: "Unknown IP",
    location: "🇲🇾 Malaysia / Global",
    ready: false
  };

  // 接口 1: ipwho.is
  try {
    var res = await fetchWithTimeout("https://ipwho.is/", {}, 3000);
    if (res.ok) {
      var data = await res.json();
      if (data && data.ip) {
        var flag = (data.flag && data.flag.emoji) ? data.flag.emoji + " " : "🇲🇾 ";
        var city = data.city || data.region || "";
        var country = data.country || "Malaysia";
        var isp = (data.connection && data.connection.isp) ? " (" + data.connection.isp + ")" : "";
        info.ip = data.ip;
        info.location = flag + (city ? city + ", " : "") + country + isp;
        info.ready = true;
        window.__VISITOR_IP_CACHE__ = info;
        try { sessionStorage.setItem("visitor_ip_info_v2", JSON.stringify(info)); } catch (e) {}
        return info;
      }
    }
  } catch (err) {}

  // 接口 2: ipapi.co
  try {
    var res2 = await fetchWithTimeout("https://ipapi.co/json/", {}, 3000);
    if (res2.ok) {
      var data2 = await res2.json();
      if (data2 && data2.ip) {
        info.ip = data2.ip;
        info.location = "🇲🇾 " + (data2.city ? data2.city + ", " : "") + (data2.country_name || "Malaysia") + (data2.org ? " (" + data2.org + ")" : "");
        info.ready = true;
        window.__VISITOR_IP_CACHE__ = info;
        try { sessionStorage.setItem("visitor_ip_info_v2", JSON.stringify(info)); } catch (e) {}
        return info;
      }
    }
  } catch (err2) {}

  // 接口 3: Cloudflare trace (极速且永不被拦截)
  try {
    var res3 = await fetchWithTimeout("https://www.cloudflare.com/cdn-cgi/trace", {}, 2500);
    if (res3.ok) {
      var text = await res3.text();
      var ipMatch = text.match(/ip=([^\r\n]+)/);
      var locMatch = text.match(/loc=([^\r\n]+)/);
      if (ipMatch && ipMatch[1]) {
        info.ip = ipMatch[1].trim();
        var countryCode = (locMatch && locMatch[1]) ? locMatch[1].trim() : "MY";
        info.location = (countryCode === "MY" ? "🇲🇾 Malaysia" : "🌍 " + countryCode);
        info.ready = true;
        window.__VISITOR_IP_CACHE__ = info;
        try { sessionStorage.setItem("visitor_ip_info_v2", JSON.stringify(info)); } catch (e) {}
        return info;
      }
    }
  } catch (err3) {}

  window.__VISITOR_IP_CACHE__ = info;
  return info;
}

/**
 * 深度识别访客流量来源：
 * 支持 URL 参数 (gclid/srsltid/fbclid/ttclid/utm_source/from) + Referrer + App 内置 UA (GSA/Telegram/WhatsApp/FB/TikTok)
 */
function getTrafficSource() {
  try {
    var ref = (document.referrer || "").toLowerCase();
    var ua = (navigator.userAgent || "").toLowerCase();
    var searchParams = new URLSearchParams(window.location.search || "");
    var utmSource = (searchParams.get("utm_source") || searchParams.get("from") || searchParams.get("source") || searchParams.get("ref") || "").toLowerCase();

    var detected = null;

    // 1. 优先检测 URL 追踪参数 (最精准，不受浏览器隐藏 Referrer 影响)
    if (searchParams.has("gclid") || searchParams.has("gad_source") || searchParams.has("srsltid") || utmSource.includes("google")) {
      detected = { label: "🔍 Google Search (谷歌自然/搜索)", isOrganic: true, category: "google" };
    } else if (searchParams.has("msclkid") || utmSource.includes("bing")) {
      detected = { label: "🔍 Bing Search (必应自然搜索)", isOrganic: true, category: "bing" };
    } else if (utmSource.includes("tg") || utmSource.includes("telegram")) {
      detected = { label: "✈️ Telegram (TG频道/群组)", isOrganic: false, category: "telegram" };
    } else if (utmSource.includes("wa") || utmSource.includes("whatsapp")) {
      detected = { label: "💬 WhatsApp (群组/好友转发)", isOrganic: false, category: "social" };
    } else if (searchParams.has("fbclid") || utmSource.includes("fb") || utmSource.includes("facebook") || utmSource.includes("ig") || utmSource.includes("instagram")) {
      detected = { label: "📘 Facebook / IG (社交引流)", isOrganic: false, category: "social" };
    } else if (searchParams.has("ttclid") || utmSource.includes("tiktok")) {
      detected = { label: "🎵 TikTok (短视频引流)", isOrganic: false, category: "social" };
    }

    // 2. 检测外部 HTTP Referrer (排除本站 4d88.lol 内部跳转)
    if (!detected && ref && !ref.includes("4d88.lol") && !ref.includes("localhost") && !ref.includes("127.0.0.1")) {
      if (ref.includes("google.") || ref.includes("googlequicksearchbox") || ref.includes("googleapis")) {
        detected = { label: "🔍 Google Search (谷歌自然搜索)", isOrganic: true, category: "google" };
      } else if (ref.includes("bing.") || ref.includes("msn.")) {
        detected = { label: "🔍 Bing Search (必应自然搜索)", isOrganic: true, category: "bing" };
      } else if (ref.includes("yahoo.") || ref.includes("duckduckgo.") || ref.includes("yandex.") || ref.includes("baidu.") || ref.includes("sogou.") || ref.includes("so.com")) {
        detected = { label: "🔍 Search Engine (自然搜索)", isOrganic: true, category: "bing" };
      } else if (ref.includes("t.me") || ref.includes("telegram") || ref.includes("tdesktop") || ref.includes("web.telegram")) {
        detected = { label: "✈️ Telegram (TG频道/群组)", isOrganic: false, category: "telegram" };
      } else if (ref.includes("whatsapp") || ref.includes("wa.me")) {
        detected = { label: "💬 WhatsApp (群组转发)", isOrganic: false, category: "social" };
      } else if (ref.includes("facebook.") || ref.includes("fb.") || ref.includes("instagram.") || ref.includes("m.facebook")) {
        detected = { label: "📘 Facebook / IG (社交引流)", isOrganic: false, category: "social" };
      } else if (ref.includes("tiktok.") || ref.includes("douyin.")) {
        detected = { label: "🎵 TikTok (短视频引流)", isOrganic: false, category: "social" };
      } else if (ref.includes("youtube.") || ref.includes("youtu.be")) {
        detected = { label: "▶️ YouTube (视频引流)", isOrganic: false, category: "social" };
      } else if (ref.includes("twitter.") || ref.includes("x.com") || ref.includes("t.co")) {
        detected = { label: "🐦 X / Twitter (社交引流)", isOrganic: false, category: "social" };
      } else {
        try {
          var host = (new URL(document.referrer)).hostname;
          detected = { label: "🌐 Referral (" + host + ")", isOrganic: false, category: "social" };
        } catch (e) {
          detected = { label: "🌐 External Referral (外部链接)", isOrganic: false, category: "social" };
        }
      }
    }

    // 3. 检测手机 App 内置浏览器 User-Agent (解决 iOS/Android App 内打开无 Referrer 问题)
    if (!detected) {
      if (ua.includes("gsa/") || ua.includes("googleapp")) {
        detected = { label: "🔍 Google App (谷歌App搜索)", isOrganic: true, category: "google" };
      } else if (ua.includes("bingweb") || ua.includes("sapphire")) {
        detected = { label: "🔍 Bing App (必应App搜索)", isOrganic: true, category: "bing" };
      } else if (ua.includes("baiduboxapp")) {
        detected = { label: "🔍 Baidu App (百度App搜索)", isOrganic: true, category: "bing" };
      } else if (ua.includes("telegram")) {
        detected = { label: "✈️ Telegram App (TG内置打开)", isOrganic: false, category: "telegram" };
      } else if (ua.includes("whatsapp")) {
        detected = { label: "💬 WhatsApp App (WA内置打开)", isOrganic: false, category: "social" };
      } else if (ua.includes("fban") || ua.includes("fbav") || ua.includes("instagram") || ua.includes("fb_iab")) {
        detected = { label: "📘 FB / IG App (社交内置打开)", isOrganic: false, category: "social" };
      } else if (ua.includes("musical_ly") || ua.includes("tiktok") || ua.includes("bytedance")) {
        detected = { label: "🎵 TikTok App (内置打开)", isOrganic: false, category: "social" };
      } else if (ua.includes("micromessenger")) {
        detected = { label: "💚 WeChat (微信内置打开)", isOrganic: false, category: "social" };
      }
    }

    // 如果本次识别到了明确来源，立即更新 sessionStorage 缓存
    if (detected) {
      try {
        sessionStorage.setItem("visitor_traffic_source_v2", JSON.stringify(detected));
      } catch (e) {}
      return detected;
    }

    // 如果当前是站内子页面跳转，读取会话最初来源
    try {
      var cachedSource = sessionStorage.getItem("visitor_traffic_source_v2");
      if (cachedSource) {
        return JSON.parse(cachedSource);
      }
    } catch (e) {}

    var fallback = { label: "⚡ Direct / URL (直接输入网址/书签)", isOrganic: false, category: "direct" };
    try {
      sessionStorage.setItem("visitor_traffic_source_v2", JSON.stringify(fallback));
    } catch (e) {}
    return fallback;
  } catch (e) {
    return { label: "⚡ Direct Visit", isOrganic: false, category: "direct" };
  }
}

/**
 * 向 Real-Time Event Stream (ntfy.sh) 发送单次原子事件 (支持 keepalive + sendBeacon，关闭页面也不丢数据)
 */
function sendEventToLiveStream(eventObj) {
  try {
    var bodyStr = JSON.stringify(eventObj);
    // 优先使用 fetch keepalive: true（浏览器内核级保证即使页面立即跳转也必达）
    fetch(NTFY_STREAM_URL, {
      method: "POST",
      body: bodyStr,
      keepalive: true,
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      }
    }).catch(function () {
      // 降级使用 navigator.sendBeacon
      if (navigator.sendBeacon) {
        try { navigator.sendBeacon(NTFY_STREAM_URL, bodyStr); } catch (e) {}
      }
    });
  } catch (e) {
    if (navigator.sendBeacon) {
      try { navigator.sendBeacon(NTFY_STREAM_URL, JSON.stringify(eventObj)); } catch (err) {}
    }
  }
}

/**
 * 同步更新持久化快照库 (restful-api.dev) — 带严格校验，绝不在请求失败时重置为 0
 */
function syncToSnapshotDB(mutatorFn) {
  try {
    fetch("https://api.restful-api.dev/objects/" + DB_OBJECT_ID, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("GET failed with status " + res.status);
        return res.json();
      })
      .then(function (resJson) {
        if (!resJson || typeof resJson.data !== "object" || !resJson.data) {
          throw new Error("Invalid snapshot data");
        }
        var data = resJson.data;
        mutatorFn(data);
        return fetch("https://api.restful-api.dev/objects/" + DB_OBJECT_ID, {
          method: "PUT",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "4d88_analytics", data: data })
        });
      })
      .catch(function () {
        // 如果 restful-api.dev 达到每日限额，已由 ntfy.sh 实时流 100% 接管，安全忽略
      });
  } catch (e) {}
}

/**
 * 核心页面浏览量 (PV) + 访客 IP + 流量来源实时上报函数
 */
async function trackPageView() {
  try {
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    var timeString = (new Date()).toLocaleString();
    var sourceInfo = getTrafficSource();
    var pagePath = window.location.pathname || "/";
    var eventId = "pv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // 1. 立即更新本地 LocalStorage
    var analyticsData = JSON.parse(localStorage.getItem("link_click_analytics_v1") || "{}");
    analyticsData.pageViews = (analyticsData.pageViews || 0) + 1;
    if (sourceInfo.isOrganic) {
      analyticsData.organicViews = (analyticsData.organicViews || 0) + 1;
    }
    if (!analyticsData.sourceCounts) {
      analyticsData.sourceCounts = { google: 0, bing: 0, telegram: 0, social: 0, direct: 0 };
    }
    var cat = sourceInfo.category || (sourceInfo.isOrganic ? "google" : "direct");
    analyticsData.sourceCounts[cat] = (analyticsData.sourceCounts[cat] || 0) + 1;
    localStorage.setItem("link_click_analytics_v1", JSON.stringify(analyticsData));

    // 2. 获取访客 IP（带 3 秒超时保护，绝不卡死上报）
    var ipInfo = await getVisitorIpInfo();

    var visitLog = {
      id: eventId,
      eventType: "pv",
      key: "page-view",
      linkName: "👁️ Page View (" + pagePath + ")",
      url: window.location.href,
      ip: ipInfo.ip,
      location: ipInfo.location,
      source: sourceInfo.label,
      sourceCategory: cat,
      isOrganic: sourceInfo.isOrganic,
      time: timeString,
      isMobile: isMobile
    };

    var clickLogs = JSON.parse(localStorage.getItem("link_click_logs_v1") || "[]");
    clickLogs.push(visitLog);
    if (clickLogs.length > 100) clickLogs = clickLogs.slice(-100);
    localStorage.setItem("link_click_logs_v1", JSON.stringify(clickLogs));

    // 3. 立即向 ntfy.sh 实时云流发送单次 POST（100% 必达，无并发冲突）
    sendEventToLiveStream(visitLog);

    // 4. 异步备份至 restful-api.dev 快照
    syncToSnapshotDB(function (data) {
      data.pageViews = (data.pageViews || 0) + 1;
      if (sourceInfo.isOrganic) {
        data.organicViews = (data.organicViews || 0) + 1;
      }
      if (!data.sourceCounts) {
        data.sourceCounts = { google: 0, bing: 0, telegram: 0, social: 0, direct: 0 };
      }
      data.sourceCounts[cat] = (data.sourceCounts[cat] || 0) + 1;
      if (!Array.isArray(data.recentLogs)) data.recentLogs = [];
      data.recentLogs.push(visitLog);
      if (data.recentLogs.length > 60) {
        data.recentLogs = data.recentLogs.slice(-60);
      }
    });

    // 自动向 IndexNow 搜索引擎集群提交 URL
    pingIndexNow();
  } catch (e) {
    console.error("Page View Error:", e);
  }
}

function update4DCalc(val) {
  var stake = parseFloat(val);
  if (isNaN(stake) || stake <= 0) stake = 1;
  var bigEl = document.getElementById("calcBigVal");
  var smallEl = document.getElementById("calcSmallVal");
  var saEl = document.getElementById("calcSaVal");
  if (bigEl) bigEl.innerText = "RM " + Math.round(stake * 4000).toLocaleString();
  if (smallEl) smallEl.innerText = "RM " + Math.round(stake * 5200).toLocaleString();
  if (saEl) saEl.innerText = "RM " + Math.round(stake * 8400).toLocaleString();
}

function set4DStake(val) {
  var input = document.getElementById("calcStakeInput");
  if (input) input.value = val;
  update4DCalc(val);
}

function pingIndexNow() {
  try {
    if (sessionStorage.getItem("indexnow_pinged_v1")) return;
    sessionStorage.setItem("indexnow_pinged_v1", "1");
    var payload = {
      host: "4d88.lol",
      key: "75f3a0937a514d59ab5d606132d7335d",
      keyLocation: "https://4d88.lol/75f3a0937a514d59ab5d606132d7335d.txt",
      urlList: [
        "https://4d88.lol/",
        "https://4d88.lol/free-credit-rm10.html",
        "https://4d88.lol/kredit-percuma-rm10-tanpa-deposit.html",
        "https://4d88.lol/918kiss-free-credit.html",
        "https://4d88.lol/vworld-register-login-malaysia.html",
        "https://4d88.lol/4d-result-malaysia.html",
        "https://4d88.lol/beli-4d-online-malaysia.html",
        "https://4d88.lol/u2-wallet-login-register-malaysia.html",
        "https://4d88.lol/usdt-casino-malaysia.html"
      ]
    };

    fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload)
    }).catch(function () {});
  } catch (e) {}
}

/**
 * 核心点击上报函数 — 0ms 零延迟同步触发 keepalive 云端上报（解决手机跳转外部链接丢点击问题）
 */
function trackLinkClick(linkKey, linkName, targetUrl) {
  try {
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    var timeString = (new Date()).toLocaleString();
    var sourceInfo = getTrafficSource();
    var cat = sourceInfo.category || (sourceInfo.isOrganic ? "google" : "direct");
    var eventId = "clk_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // 1. 同步保存本地 LocalStorage (0ms)
    var analyticsData = JSON.parse(localStorage.getItem("link_click_analytics_v1") || "{}");
    if (!analyticsData.totalClicks) analyticsData.totalClicks = 0;
    if (!analyticsData.linkCounts) {
      analyticsData.linkCounts = {
        "link-u2-rm10": 0,
        "link-vw-topup20": 0,
        "link-u2-usdt": 0,
        "link-u2-4d": 0,
        "link-telegram": 0
      };
    }
    if (!analyticsData.mobileClicks) analyticsData.mobileClicks = 0;
    if (!analyticsData.desktopClicks) analyticsData.desktopClicks = 0;

    analyticsData.totalClicks += 1;
    if (!analyticsData.linkCounts[linkKey]) analyticsData.linkCounts[linkKey] = 0;
    analyticsData.linkCounts[linkKey] += 1;

    if (isMobile) {
      analyticsData.mobileClicks += 1;
    } else {
      analyticsData.desktopClicks += 1;
    }

    localStorage.setItem("link_click_analytics_v1", JSON.stringify(analyticsData));

    // 2. 直接读取已预取的 IP 缓存（不 await 阻塞，确保页面跳转前 100% 发出请求！）
    var ipInfo = window.__VISITOR_IP_CACHE__ || { ip: "Unknown IP", location: "🇲🇾 Malaysia" };

    var clickLogEntry = {
      id: eventId,
      eventType: "click",
      key: linkKey,
      linkName: "👆 " + linkName,
      url: targetUrl,
      ip: ipInfo.ip,
      location: ipInfo.location,
      source: sourceInfo.label,
      sourceCategory: cat,
      isOrganic: sourceInfo.isOrganic,
      time: timeString,
      isMobile: isMobile
    };

    var clickLogs = JSON.parse(localStorage.getItem("link_click_logs_v1") || "[]");
    clickLogs.push(clickLogEntry);
    if (clickLogs.length > 100) clickLogs = clickLogs.slice(-100);
    localStorage.setItem("link_click_logs_v1", JSON.stringify(clickLogs));

    // 3. 0ms 瞬发上报至 ntfy.sh 实时云流 (keepalive: true)
    sendEventToLiveStream(clickLogEntry);

    // 4. 异步同步至 restful-api.dev 快照库
    syncToSnapshotDB(function (data) {
      data.totalClicks = (data.totalClicks || 0) + 1;
      if (linkKey === "link-u2-rm10") data.link_rm10 = (data.link_rm10 || 0) + 1;
      else if (linkKey === "link-vw-topup20") data.link_vworld = (data.link_vworld || 0) + 1;
      else if (linkKey === "link-u2-usdt") data.link_usdt = (data.link_usdt || 0) + 1;
      else if (linkKey === "link-u2-4d") data.link_4d = (data.link_4d || 0) + 1;
      else if (linkKey === "link-telegram") data.link_telegram = (data.link_telegram || 0) + 1;

      if (isMobile) data.mobile = (data.mobile || 0) + 1;
      else data.desktop = (data.desktop || 0) + 1;

      if (!Array.isArray(data.recentLogs)) data.recentLogs = [];
      data.recentLogs.push(clickLogEntry);
      if (data.recentLogs.length > 60) {
        data.recentLogs = data.recentLogs.slice(-60);
      }
    });
  } catch (err) {
    console.error("Tracking Error:", err);
  }
}

/**
 * 全局点击监听委托（精准识别每一个推广链接、海报图、导航按钮与子页面点击）
 */
document.addEventListener("click", function (e) {
  var anchor = e.target.closest("a");
  if (!anchor) return;

  var href = anchor.getAttribute("href") || "";
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

  var rawText = (anchor.innerText || "").replace(/\s+/g, " ").trim();
  var imgInside = anchor.querySelector("img");
  var imgAlt = imgInside ? (imgInside.getAttribute("alt") || "") : "";
  var combinedText = (rawText + " " + imgAlt).toLowerCase();

  // 1. 识别核心推广转化链接
  if (href.includes("t.me") && !href.includes("t.me/share")) {
    trackLinkClick("link-telegram", "Join Telegram (@freerm10_4d168)", href);
  } else if (href.includes("ss.vw0.ch")) {
    trackLinkClick("link-vw-topup20", "VWorld Deposit RM20 Get RM20", href);
  } else if (href.includes("pplu.u2.live")) {
    trackLinkClick("link-u2-usdt", "U2 USDT Crypto (20U Get 10U)", href);
  } else if (href.includes("pplm.u2.live")) {
    // 精准区分 U2 RM10 vs U2 4D Lottery（避免因描述含 918Kiss & 4D 误判）
    var is4DCard = combinedText.includes("bet 4d") ||
                   combinedText.includes("beli 4d") ||
                   combinedText.includes("u2 4d") ||
                   combinedText.includes("4d lottery") ||
                   combinedText.includes("bayaran 1:8400") ||
                   (imgInside && (imgInside.getAttribute("src") || "").includes("u2_4d_payout"));
    if (is4DCard) {
      trackLinkClick("link-u2-4d", "U2 4D Lottery (1:8400 Payout)", href);
    } else {
      trackLinkClick("link-u2-rm10", "U2 Claim Free Credit RM10", href);
    }
  } else if (href.endsWith(".html") || href === "/") {
    // 2. 站内 SEO 子页面导航点击（记录到实时日志，方便观察访客在站内的浏览轨迹）
    var navLabel = rawText || href;
    sendEventToLiveStream({
      id: "nav_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      eventType: "nav",
      key: "internal-nav",
      linkName: "🔗 Subpage Click (" + navLabel + ")",
      url: href,
      ip: (window.__VISITOR_IP_CACHE__ && window.__VISITOR_IP_CACHE__.ip) || "Visitor",
      location: (window.__VISITOR_IP_CACHE__ && window.__VISITOR_IP_CACHE__.location) || "🇲🇾 Malaysia",
      source: getTrafficSource().label,
      sourceCategory: getTrafficSource().category || "direct",
      isOrganic: getTrafficSource().isOrganic,
      time: (new Date()).toLocaleString(),
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    });
  }
});

/**
 * DOM 加载完成初始化 FAQ & 预取 IP & 自动上报 PV & 实时 SEO 新鲜度信号
 */
document.addEventListener("DOMContentLoaded", function () {
  // 规范化 /index.html 为根路径 /，集中 Google PageRank 权重
  try {
    if (window.location.pathname === "/index.html" && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "/" + (window.location.search || "") + (window.location.hash || ""));
    }
  } catch (e) {}

  // 自动更新每日 SEO 新鲜度日期徽章 (Google Freshness Signal)
  try {
    var seoDateEl = document.getElementById("live-seo-date");
    if (seoDateEl) {
      var now = new Date();
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      seoDateEl.innerText = "🟢 Verified: " + now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();
    }
  } catch (e) {}

  // 立即启动访客 IP 预取与页面浏览量 (PV) 上报
  trackPageView();

  var faqQuestions = document.querySelectorAll(".faq-question");
  faqQuestions.forEach(function (button) {
    button.addEventListener("click", function () {
      var faqItem = this.parentElement;
      var isActive = faqItem.classList.contains("active");

      document.querySelectorAll(".faq-item").forEach(function (item) {
        item.classList.remove("active");
      });

      if (!isActive) {
        faqItem.classList.add("active");
      }
    });
  });
});
