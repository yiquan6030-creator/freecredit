/**
 * 链接点击统计、页面浏览量 (PV) 与全网访客 IP 归属地实时追踪引擎 (Global Real-Time Cloud DB Engine)
 */

var DB_OBJECT_ID = "ff808181a058d43f01a05ce71bfe0e02";

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
    var successful = document.execCommand('copy');
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
 * 获取访客真实 IP 地址与国家/城市/运营商归属地 (带缓存与多重容灾)
 */
async function getVisitorIpInfo() {
  try {
    var cached = sessionStorage.getItem("visitor_ip_info_v1");
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  var info = {
    ip: "Unknown IP",
    location: "Malaysia / Global"
  };

  try {
    var res = await fetch("https://ipwho.is/");
    if (res.ok) {
      var data = await res.json();
      if (data && data.ip) {
        var flag = (data.flag && data.flag.emoji) ? data.flag.emoji + " " : "";
        var city = data.city || data.region || "";
        var country = data.country || "";
        var isp = (data.connection && data.connection.isp) ? " (" + data.connection.isp + ")" : "";
        info.ip = data.ip;
        info.location = flag + (city ? city + ", " : "") + country + isp;
        try {
          sessionStorage.setItem("visitor_ip_info_v1", JSON.stringify(info));
        } catch (e) {}
        return info;
      }
    }
  } catch (err) {}

  try {
    var res2 = await fetch("https://ipapi.co/json/");
    if (res2.ok) {
      var data2 = await res2.json();
      if (data2 && data2.ip) {
        info.ip = data2.ip;
        info.location = (data2.city ? data2.city + ", " : "") + (data2.country_name || "Malaysia") + (data2.org ? " (" + data2.org + ")" : "");
        try {
          sessionStorage.setItem("visitor_ip_info_v1", JSON.stringify(info));
        } catch (e) {}
        return info;
      }
    }
  } catch (err2) {}

  try {
    var res3 = await fetch("https://api.ipify.org?format=json");
    if (res3.ok) {
      var data3 = await res3.json();
      if (data3 && data3.ip) {
        info.ip = data3.ip;
      }
    }
  } catch (err3) {}

  return info;
}

/**
 * 识别访客流量来源：区分 Google/Bing 自然搜索 (Organic Search) vs 社交裂变 vs 直接访问
 */
function getTrafficSource() {
  try {
    var cachedSource = sessionStorage.getItem("visitor_traffic_source_v1");
    var ref = (document.referrer || "").toLowerCase();
    var ua = (navigator.userAgent || "").toLowerCase();

    // 如果当前页面有外部 referrer（非本站内部跳转），优先解析并缓存该会话最初来源
    if (ref && !ref.includes("4d88.lol")) {
      var detected = { label: "🌐 External Referral", isOrganic: false };
      if (ref.includes("google.")) {
        detected = { label: "🔍 Google Search (谷歌自然搜索)", isOrganic: true };
      } else if (ref.includes("bing.")) {
        detected = { label: "🔍 Bing Search (必应自然搜索)", isOrganic: true };
      } else if (ref.includes("yahoo.") || ref.includes("duckduckgo.") || ref.includes("yandex.") || ref.includes("baidu.")) {
        detected = { label: "🔍 Organic Search (自然搜索)", isOrganic: true };
      } else if (ref.includes("t.me") || ref.includes("telegram") || ref.includes("tdesktop")) {
        detected = { label: "✈️ Telegram (TG频道/群组)", isOrganic: false };
      } else if (ref.includes("whatsapp") || ref.includes("wa.me")) {
        detected = { label: "💬 WhatsApp (群组转发)", isOrganic: false };
      } else if (ref.includes("facebook.") || ref.includes("fb.") || ref.includes("instagram.")) {
        detected = { label: "📘 Facebook / IG (社交引流)", isOrganic: false };
      } else if (ref.includes("tiktok.")) {
        detected = { label: "🎵 TikTok (短视频引流)", isOrganic: false };
      } else {
        try {
          var host = (new URL(document.referrer)).hostname;
          detected = { label: "🌐 Referral (" + host + ")", isOrganic: false };
        } catch (e) {}
      }
      try {
        sessionStorage.setItem("visitor_traffic_source_v1", JSON.stringify(detected));
      } catch (e) {}
      return detected;
    }

    if (cachedSource) {
      return JSON.parse(cachedSource);
    }

    // 针对 App 内置浏览器无 Referrer 的智能识别
    if (ua.includes("telegram")) {
      return { label: "✈️ Telegram App (TG内置打开)", isOrganic: false };
    } else if (ua.includes("whatsapp")) {
      return { label: "💬 WhatsApp App (WA内置打开)", isOrganic: false };
    } else if (ua.includes("fban") || ua.includes("fbav") || ua.includes("instagram")) {
      return { label: "📘 FB / IG App (社交内置打开)", isOrganic: false };
    } else if (ua.includes("musical_ly") || ua.includes("tiktok") || ua.includes("bytedance")) {
      return { label: "🎵 TikTok App (内置打开)", isOrganic: false };
    } else if (ua.includes("micromessenger")) {
      return { label: "💚 WeChat (微信内置打开)", isOrganic: false };
    }

    var fallback = { label: "⚡ Direct / Bookmark (直接输入网址)", isOrganic: false };
    try {
      sessionStorage.setItem("visitor_traffic_source_v1", JSON.stringify(fallback));
    } catch (e) {}
    return fallback;
  } catch (e) {
    return { label: "⚡ Direct Visit", isOrganic: false };
  }
}

/**
 * 核心页面浏览量 (PV) + 访客 IP + 流量来源实时上报函数
 */
async function trackPageView() {
  try {
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    var timeString = (new Date()).toLocaleString();
    var sourceInfo = getTrafficSource();

    var analyticsData = JSON.parse(localStorage.getItem("link_click_analytics_v1") || "{}");
    analyticsData.pageViews = (analyticsData.pageViews || 0) + 1;
    if (sourceInfo.isOrganic) {
      analyticsData.organicViews = (analyticsData.organicViews || 0) + 1;
    }
    localStorage.setItem("link_click_analytics_v1", JSON.stringify(analyticsData));

    var ipInfo = await getVisitorIpInfo();
    var pagePath = window.location.pathname || "/";
    var visitLog = {
      key: "page-view",
      linkName: "👁️ Page View (" + pagePath + ")",
      url: window.location.href,
      ip: ipInfo.ip,
      location: ipInfo.location,
      source: sourceInfo.label,
      isOrganic: sourceInfo.isOrganic,
      time: timeString,
      isMobile: isMobile
    };

    var clickLogs = JSON.parse(localStorage.getItem("link_click_logs_v1") || "[]");
    clickLogs.push(visitLog);
    if (clickLogs.length > 50) clickLogs = clickLogs.slice(-50);
    localStorage.setItem("link_click_logs_v1", JSON.stringify(clickLogs));

    fetch("https://api.restful-api.dev/objects/" + DB_OBJECT_ID)
      .then(function(res) { return res.json(); })
      .then(function(resJson) {
        var data = resJson.data || { totalClicks: 0, pageViews: 0, organicViews: 0, link_rm10: 0, link_vworld: 0, link_usdt: 0, link_4d: 0, link_telegram: 0, mobile: 0, desktop: 0, recentLogs: [] };
        data.pageViews = (data.pageViews || 0) + 1;
        if (sourceInfo.isOrganic) {
          data.organicViews = (data.organicViews || 0) + 1;
        }
        if (!Array.isArray(data.recentLogs)) data.recentLogs = [];
        data.recentLogs.push(visitLog);
        if (data.recentLogs.length > 50) {
          data.recentLogs = data.recentLogs.slice(-50);
        }

        return fetch("https://api.restful-api.dev/objects/" + DB_OBJECT_ID, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "4d88_analytics", data: data })
        });
      })
      .catch(function(err) {
        console.error("Page View Cloud Sync Error:", err);
      });

    // 自动向 IndexNow 搜索引擎集群提交 URL
    pingIndexNow();
  } catch (e) {
    console.error("Page View Error:", e);
  }
}

function pingIndexNow() {
  try {
    var payload = {
      host: "4d88.lol",
      key: "75f3a0937a514d59ab5d606132d7335d",
      keyLocation: "https://4d88.lol/75f3a0937a514d59ab5d606132d7335d.txt",
      urlList: [
        "https://4d88.lol/",
        "https://4d88.lol/free-credit-rm10.html",
        "https://4d88.lol/918kiss-free-credit.html",
        "https://4d88.lol/4d-result-malaysia.html",
        "https://4d88.lol/usdt-casino-malaysia.html"
      ]
    };

    var endpoints = [
      "https://api.indexnow.org/IndexNow",
      "https://www.bing.com/indexnow",
      "https://yandex.com/indexnow"
    ];

    endpoints.forEach(function(ep) {
      fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload)
      }).catch(function() {});
    });
  } catch (e) {}
}

/**
 * 核心点击上报函数 + 访客 IP 归属地实时同步 (LocalStorage + Global Real-Time Cloud DB Sync)
 */
async function trackLinkClick(linkKey, linkName, targetUrl) {
  try {
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    var timeString = (new Date()).toLocaleString();

    // 1. 保存本地 LocalStorage
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

    var ipInfo = await getVisitorIpInfo();
    var sourceInfo = getTrafficSource();
    var clickLogEntry = {
      key: linkKey,
      linkName: "👆 " + linkName,
      url: targetUrl,
      ip: ipInfo.ip,
      location: ipInfo.location,
      source: sourceInfo.label,
      isOrganic: sourceInfo.isOrganic,
      time: timeString,
      isMobile: isMobile
    };

    // 保存明细日志
    var clickLogs = JSON.parse(localStorage.getItem("link_click_logs_v1") || "[]");
    clickLogs.push(clickLogEntry);
    if (clickLogs.length > 50) clickLogs = clickLogs.slice(-50);
    localStorage.setItem("link_click_logs_v1", JSON.stringify(clickLogs));

    // 2. 异步实时更新全网 Cloud DB (包含 IP 与归属地日志)
    fetch("https://api.restful-api.dev/objects/" + DB_OBJECT_ID)
      .then(function(res) { return res.json(); })
      .then(function(resJson) {
        var data = resJson.data || { totalClicks: 0, pageViews: 0, link_rm10: 0, link_vworld: 0, link_usdt: 0, link_4d: 0, link_telegram: 0, mobile: 0, desktop: 0, recentLogs: [] };
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
        if (data.recentLogs.length > 50) {
          data.recentLogs = data.recentLogs.slice(-50);
        }

        return fetch("https://api.restful-api.dev/objects/" + DB_OBJECT_ID, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "4d88_analytics", data: data })
        });
      })
      .catch(function(err) {
        console.error("Cloud Sync Error:", err);
      });

    console.log("Tracked click:", linkName, "IP:", ipInfo.ip, "Location:", ipInfo.location);
  } catch (err) {
    console.error("Tracking Error:", err);
  }
}

/**
 * 全局点击监听委托
 */
document.addEventListener("click", function (e) {
  var anchor = e.target.closest("a");
  if (!anchor) return;

  var href = anchor.getAttribute("href") || "";
  
  if (href.includes("u2.live") || href.includes("vw0.ch") || href.includes("t.me") || anchor.classList.contains("btn")) {
    var linkKey = "link-u2-rm10";
    var linkName = anchor.innerText.trim() || "Register Link";

    if (href.includes("t.me")) {
      linkKey = "link-telegram";
      linkName = "Join Telegram Official Channel (@freerm10_4d168)";
    } else if (href.includes("ss.vw0.ch")) {
      linkKey = "link-vw-topup20";
      linkName = "VWorld Deposit RM20 Get RM20";
    } else if (href.includes("pplu.u2.live")) {
      linkKey = "link-u2-usdt";
      linkName = "U2 USDT Crypto Portal";
    } else if (linkName.toLowerCase().includes("4d") || href.includes("4d")) {
      linkKey = "link-u2-4d";
      linkName = "U2 4D Lottery Portal";
    } else {
      linkKey = "link-u2-rm10";
      linkName = "U2 Free Credit RM10";
    }

    trackLinkClick(linkKey, linkName, href);
  }
});

/**
 * DOM 加载完成初始化 FAQ & 自动上报 PV
 */
document.addEventListener("DOMContentLoaded", function () {
  // 自动上报页面浏览量 (PV) 与访客 IP
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
