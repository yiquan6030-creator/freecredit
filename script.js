/**
 * 链接点击统计与辅助交互脚本 (双重保底极速追踪)
 */

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
 * 核心点击上报函数 (双通道并行上报：sendBeacon + GET fetch)
 */
function trackLinkClick(linkKey, linkName, targetUrl) {
  try {
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    var deviceType = isMobile ? "mobile" : "desktop";
    var timeString = (new Date()).toLocaleString();

    // 1. 保存本地 LocalStorage 备份
    var analyticsData = JSON.parse(localStorage.getItem("link_click_analytics_v1") || "{}");
    if (!analyticsData.totalClicks) analyticsData.totalClicks = 0;
    if (!analyticsData.linkCounts) {
      analyticsData.linkCounts = {
        "link-u2-rm10": 0,
        "link-vw-topup20": 0,
        "link-u2-usdt": 0,
        "link-u2-4d": 0
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

    // 保存明细日志
    var clickLogs = JSON.parse(localStorage.getItem("link_click_logs_v1") || "[]");
    clickLogs.push({
      key: linkKey,
      linkName: linkName,
      url: targetUrl,
      time: timeString,
      isMobile: isMobile
    });
    if (clickLogs.length > 100) clickLogs = clickLogs.slice(-100);
    localStorage.setItem("link_click_logs_v1", JSON.stringify(clickLogs));

    // 2. 双通道同时发包：GET fetch + sendBeacon (保底 100% 成功)
    var trackApiUrl = "/api/track?key=" + encodeURIComponent(linkKey) + "&device=" + deviceType;
    
    // GET 请求 (最直接)
    fetch(trackApiUrl, { method: 'GET', keepalive: true }).catch(function(){});
    
    // sendBeacon 辅上报
    if (navigator.sendBeacon) {
      try { navigator.sendBeacon(trackApiUrl); } catch(e){}
    }

    console.log("Tracked click:", linkName, "Key:", linkKey);
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
  
  if (href.includes("u2.live") || href.includes("vw0.ch") || anchor.classList.contains("btn")) {
    var linkKey = "link-u2-rm10";
    var linkName = anchor.innerText.trim() || "Register Link";

    if (href.includes("ss.vw0.ch")) {
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
 * DOM 加载完成初始化 FAQ
 */
document.addEventListener("DOMContentLoaded", function () {
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
