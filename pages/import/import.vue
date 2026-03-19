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

export default {
  data() {
    return {
      webviewUrl: "https://vpn.tzc.edu.cn/",
      importing: false,
      tipText: "登录后进入课表页面，点右上角「导入课表」按钮",
    };
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

      // 注入 JS：获取课表数据，通过 document.title 传回
      const jsCode = `
                (function() {
                    try {
                        var xnm = '';
                        var xqm = '';
                        var xnmSelect = document.getElementById('xnm');
                        var xqmSelect = document.getElementById('xqm');
                        if (xnmSelect) xnm = xnmSelect.value;
                        if (xqmSelect) xqm = xqmSelect.value;

                        if (!xnm) {
                            var now = new Date();
                            var year = now.getFullYear();
                            var month = now.getMonth() + 1;
                            if (month >= 9) { xnm = year.toString(); xqm = '3'; }
                            else if (month >= 2) { xnm = (year - 1).toString(); xqm = '12'; }
                            else { xnm = (year - 1).toString(); xqm = '3'; }
                        }

                        // 检查是否在教务系统页面
                        if (window.location.href.indexOf('jwglxt') === -1) {
                            document.title = 'KEBIAO_ERR:请先进入教务系统的课表查询页面后再点击导入';
                            return;
                        }

                        // 构建 API 路径（兼容 VPN 代理 URL 结构）
                        var basePath = window.location.pathname;
                        var kbcxIdx = basePath.indexOf('/kbcx/');
                        var apiPath = '';
                        if (kbcxIdx !== -1) {
                            apiPath = basePath.substring(0, kbcxIdx) + '/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N253508';
                        } else {
                            var jwIdx = basePath.indexOf('/jwglxt/');
                            if (jwIdx !== -1) {
                                apiPath = basePath.substring(0, jwIdx) + '/jwglxt/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N253508';
                            } else {
                                apiPath = '/jwglxt/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N253508';
                            }
                        }

                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', apiPath, true);
                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                        xhr.withCredentials = true;
                        xhr.onreadystatechange = function() {
                            if (xhr.readyState === 4) {
                                if (xhr.status === 200) {
                                    // 在 WebView 内解析，只传紧凑数据
                                    try {
                                        var resp = JSON.parse(xhr.responseText);
                                        var list = resp.kbList || [];
                                        if (list.length === 0) {
                                            document.title = 'KEBIAO_ERR:未查询到课程数据';
                                            return;
                                        }
                                        // 紧凑格式: name~day~jcs~room~weeks~teacher 用 | 分隔课程
                                        var parts = [];
                                        for (var i = 0; i < list.length; i++) {
                                            var c = list[i];
                                            parts.push([
                                                (c.kcmc || '').replace(/[~|]/g, ' '),
                                                c.xqj || '',
                                                (c.jcs || '').replace(/[~|]/g, ' '),
                                                (c.cdmc || '').replace(/[~|]/g, ' '),
                                                (c.zcd || '').replace(/[~|]/g, ' '),
                                                (c.xm || '').replace(/[~|]/g, ' ')
                                            ].join('~'));
                                        }
                                        document.title = 'KEBIAO_OK:' + parts.join('|');
                                    } catch(pe) {
                                        document.title = 'KEBIAO_ERR:数据解析失败 ' + pe.message;
                                    }
                                } else {
                                    document.title = 'KEBIAO_ERR:请求失败 (HTTP ' + xhr.status + ')';
                                }
                            }
                        };
                        xhr.onerror = function() {
                            document.title = 'KEBIAO_ERR:网络请求失败';
                        };
                        xhr.send('xnm=' + xnm + '&xqm=' + xqm);
                    } catch(e) {
                        document.title = 'KEBIAO_ERR:' + e.message;
                    }
                })();
            `;
      wv.evalJS(jsCode);
      // #endif

      // #ifdef H5
      uni.showToast({ title: "请在 App 中使用此功能", icon: "none" });
      this.importing = false;
      // #endif
    },

    // 兼容旧的 onMessage
    onMessage(e) { },

    // 导入成功：解析紧凑格式数据
    handleImportSuccess(compactStr) {
      try {
        // 紧凑格式: name~day~jcs~room~weeks~teacher  用 | 分隔
        const items = compactStr.split("|");
        const courses = [];
        let id = 0;
        for (const item of items) {
          const parts = item.split("~");
          if (parts.length < 3) continue;
          const [name, dayStr, jcsStr, room, weeksStr, teacher] = parts;
          const day = parseInt(dayStr);
          if (!day || day < 1 || day > 7) continue;

          // 解析节次 "1-2" -> startNode=1, endNode=2
          const jcsMatch = jcsStr.match(/(\d+)-(\d+)/);
          if (!jcsMatch) continue;
          const startNode = parseInt(jcsMatch[1]);
          const endNode = parseInt(jcsMatch[2]);

          // 解析周次
          const weeks = parseWeeks(weeksStr || "");

          courses.push({
            id: id++,
            name: name || "",
            day,
            startNode,
            endNode,
            room: room || "",
            teacher: teacher || "",
            weeks,
            weeksText: weeksStr || "",
          });
        }

        if (courses.length === 0) {
          uni.showToast({ title: "未解析到课程", icon: "none" });
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
