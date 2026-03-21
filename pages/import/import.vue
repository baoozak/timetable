<template>
  <view class="page">
    <!-- 提示栏 -->
    <view class="tip-bar" v-if="!importing">
      <view class="tip-inner">
        <view class="tip-dot"></view>
        <text class="tip-text">{{ tipText }}</text>
      </view>
    </view>

    <!-- 加载中遮罩 -->
    <view class="loading-mask" v-if="importing">
      <view class="loading-card">
        <view class="loading-spinner"></view>
        <text class="loading-title">正在导入课表</text>
        <text class="loading-desc">请稍候，正在解析课程数据...</text>
      </view>
    </view>

    <!-- WebView -->
    <web-view :src="webviewUrl" @message="onMessage" ref="webview"></web-view>
  </view>
</template>

<script>
import { saveCourses } from "@/utils/storage.js";
import { parseWeeks } from "@/utils/parser.js";
import { getAdapter } from "@/utils/parsers/index.js";

export default {
  data() {
    return {
      webviewUrl: "",
      adapterType: "",
      importing: false,
      tipText: "登录后进入教务系统页面，点右上角「导入课表」按钮",
    };
  },
  onLoad(options) {
    if (options.url) {
      this.webviewUrl = decodeURIComponent(options.url);
    } else {
      this.webviewUrl = "https://vpn.tzc.edu.cn/";
    }
    this.adapterType = options.type || "zhengfang_new";
  },
  // 监听原生导航栏按钮点击
  onNavigationBarButtonTap() {
    this.handleImport();
  },
  methods: {
    // 点击导入按钮
    handleImport() {
      if (this.importing) return;
      this.importing = true;
      this.tipText = "正在获取课表数据...";

      // #ifdef APP-PLUS
      const pages = getCurrentPages();
      const page = pages[pages.length - 1];
      const currentWebview = page.$getAppWebview();
      const wv = currentWebview.children()[0];

      if (!wv) {
        this.importing = false;
        uni.showToast({ title: "获取页面失败，请重试", icon: "none" });
        return;
      }

      // 监听 title 变化来接收数据（替代 uni.postMessage）
      const self = this;
      const onTitle = function (e) {
        const title = e.title || "";
        if (title.indexOf("KEBIAO_OK:") === 0) {
          wv.removeEventListener("titleUpdate", onTitle);
          const jsonStr = title.substring("KEBIAO_OK:".length);
          self.handleImportSuccess(jsonStr);
        } else if (title.indexOf("KEBIAO_ERR:") === 0) {
          wv.removeEventListener("titleUpdate", onTitle);
          const errMsg = title.substring("KEBIAO_ERR:".length);
          self.handleImportError(errMsg);
        }
      };
      wv.addEventListener("titleUpdate", onTitle);

      // 注入 JS：从适配器获取 provider
      const adapter = getAdapter(this.adapterType);
      if (!adapter) {
          this.importing = false;
          uni.showToast({ title: "未找到对应的解析器", icon: "none" });
          return;
      }
      const jsCode = adapter.provider;
      wv.evalJS(jsCode);
      // #endif

      // #ifdef H5
      uni.showToast({ title: "请在 App 中使用此功能", icon: "none" });
      this.importing = false;
      // #endif
    },

    // 兼容旧的 onMessage
    onMessage(e) { },

    // 导入成功：调用适配器的解析器
    handleImportSuccess(compactStr) {
      try {
        const adapter = getAdapter(this.adapterType);
        if (!adapter || typeof adapter.parser !== 'function') {
            throw new Error("解析器不可用");
        }
        
        const courses = adapter.parser(compactStr);

        if (!courses || courses.length === 0) {
          uni.showToast({ title: "未解析到课程或格式不支持", icon: "none" });
          this.importing = false;
          return;
        }

        // 保存到当前激活的 Profile
        saveCourses(courses);

        this.importing = false;
        uni.showModal({
          title: "导入成功",
          content: `已成功导入 ${courses.length} 门课程`,
          showCancel: false,
          success: () => {
            // 触发 App 实例上的更新通知方法
            const app = getApp();
            if (app && app.updateNotification) {
              app.updateNotification();
            }

            uni.reLaunch({
              url: "/pages/index/index",
            });
          },
        });
      } catch (e) {
        console.error("解析课表数据失败:", e);
        this.importing = false;
        uni.showToast({ title: "数据解析失败", icon: "none" });
      }
    },

    // 导入失败
    handleImportError(errMsg) {
      this.importing = false;
      uni.showModal({
        title: "导入失败",
        content: errMsg || "未知错误，请重试",
        showCancel: false,
      });
    },


  },
};
</script>

<style scoped>
.page {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 提示栏 */
.tip-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
}

.tip-inner {
  background: rgba(22, 78, 99, 0.85);
  padding: 20rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.tip-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #22d3ee;
  flex-shrink: 0;
}

.tip-text {
  color: #ffffff;
  font-size: 24rpx;
  line-height: 1.5;
  flex: 1;
}

/* 加载遮罩 */
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(22, 78, 99, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-card {
  background: #ffffff;
  border-radius: 28rpx;
  padding: 48rpx 56rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 12rpx 40rpx rgba(8, 145, 178, 0.16);
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid #e0f7fa;
  border-top-color: #0891b2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #164e63;
}

.loading-desc {
  font-size: 24rpx;
  color: #4b8b9b;
}
</style>
