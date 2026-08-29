/**
 * 复制邀请码到剪贴板并弹出 Toast 提示
 * @param {string} elementId - 包含邀请码文本的元素ID
 * @param {string} text - 邀请码文本
 */
function copyCode(elementId, text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(function () {
      showToast("已成功复制邀请码：" + text);
    }).catch(function (err) {
      fallbackCopyTextToClipboard(text);
    });
  } else {
    fallbackCopyTextToClipboard(text);
  }
}

/**
 * 降级版剪贴板复制逻辑
 */
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
      showToast("已成功复制邀请码：" + text);
    } else {
      showToast("复制失败，请手动选择复制");
    }
  } catch (err) {
    showToast("复制失败，请手动选择复制");
  }

  document.body.removeChild(textArea);
}

/**
 * 显示提示弹窗
 */
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
 * 初始化 FAQ 手风琴展开与收起
 */
document.addEventListener("DOMContentLoaded", function () {
  var faqQuestions = document.querySelectorAll(".faq-question");

  faqQuestions.forEach(function (button) {
    button.addEventListener("click", function () {
      var faqItem = this.parentElement;
      var isActive = faqItem.classList.contains("active");

      // 关闭其他已打开的 FAQ 项
      document.querySelectorAll(".faq-item").forEach(function (item) {
        item.classList.remove("active");
      });

      // 如果原本未激活则展开
      if (!isActive) {
        faqItem.classList.add("active");
      }
    });
  });

  // 注册链接点击统计或自定义事件（可选扩展）
  var registerButtons = document.querySelectorAll('.card-footer a');
  registerButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var platformName = this.closest('.card').querySelector('h3').innerText;
      console.log("用户点击了注册通道：", platformName);
      // 可在此处接入 Google Analytics, Baidu Tongji 或自定义点击事件上报
    });
  });
});
