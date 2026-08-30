/**
 * 链接点击统计与辅助交互脚本
 */

/**
 * 复制文本到剪贴板并弹出提示
 */
function copyCode(elementId, text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(function () {
      showToast("Link/Code Copied: " + text);
    }).catch(function (err) {
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
 * 核心点击统计记录引擎
 * 针对 4 大卡片进行精确捕获并持久化到本地与后台
 */
function trackLinkClick(linkKey, linkName, targetUrl) {
  try {
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    var now = new Date();
    var timeString = now.toLocaleDateString() + " " + now.toLocaleTimeString();

    // 1. 获取现有统计数据
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

    // 2. 更新累加数值
    analyticsData.totalClicks += 1;
    if (!analyticsData.linkCounts[linkKey]) analyticsData.linkCounts[linkKey] = 0;
    analyticsData.linkCounts[linkKey] += 1;

    if (isMobile) {
      analyticsData.mobileClicks += 1;
    } else {
      analyticsData.desktopClicks += 1;
    }

    localStorage.setItem("link_click_analytics_v1", JSON.stringify(analyticsData));

    // 3. 记录日志明细 (保留最近 100 条)
    var clickLogs = JSON.parse(localStorage.getItem("link_click_logs_v1") || "[]");
    clickLogs.push({
      key: linkKey,
      linkName: linkName,
      url: targetUrl,
      time: timeString,
      isMobile: isMobile
    });

    if (clickLogs.length > 100) {
      clickLogs = clickLogs.slice(-100);
    }
    localStorage.setItem("link_click_logs_v1", JSON.stringify(clickLogs));

    console.log("Recorded Link Click:", linkName, "Total:", analyticsData.totalClicks);
  } catch (err) {
    console.error("Tracking Error:", err);
  }
}

/**
 * DOM 加载完成初始化
 */
document.addEventListener("DOMContentLoaded", function () {
  // FAQ 手风琴效果
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

  // 绑定 4 大卡片与底部 4D 按钮的点击事件
  var registerButtons = document.querySelectorAll('.card-footer a, .payout-cta a');
  registerButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var href = this.getAttribute('href');
      var card = this.closest('.card');
      var linkName = "Default Link";
      var linkKey = "link-u2-rm10";

      if (card) {
        var h3 = card.querySelector('h3');
        if (h3) linkName = h3.innerText;

        if (href.includes("ss.vw0.ch")) {
          linkKey = "link-vw-topup20";
        } else if (href.includes("pplu.u2.live")) {
          linkKey = "link-u2-usdt";
        } else if (linkName.toLowerCase().includes("4d")) {
          linkKey = "link-u2-4d";
        } else {
          linkKey = "link-u2-rm10";
        }
      } else if (this.closest('.payout-cta')) {
        linkName = "4D Table Payout CTA Button";
        linkKey = "link-u2-4d";
      }

      trackLinkClick(linkKey, linkName, href);
    });
  });
});
