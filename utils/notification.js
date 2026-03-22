/**
 * 原生安卓常驻通知栏模块
 * 利用 plus.android 调用底层 NotificationManager
 * 支持后台保活：WakeLock + 原生 Handler 定时器
 */

let notificationManager = null;
let notifyId = 10086; // 固定ID，保证覆盖更新而不是重复创建
let channelId = "school_timetable_channel";
let channelName = "下节啥课提醒";

// ===== 后台保活相关变量 =====
let wakeLock = null;       // CPU 唤醒锁
let nativeHandler = null;  // 原生 Handler（替代 JS setInterval）
let nativeRunnable = null; // 原生 Runnable
let updateCallback = null; // 存储 JS 回调函数
let isTimerRunning = false;

/**
 * 初始化通知渠道 (Android 8.0+)
 */
function initChannel() {
  // #ifdef APP-PLUS
  if (plus.os.name !== "Android") return;

  try {
    const Build = plus.android.importClass("android.os.Build");
    if (Build.VERSION.SDK_INT >= 26) {
      // Build.VERSION_CODES.O
      const NotificationManager = plus.android.importClass(
        "android.app.NotificationManager",
      );
      const NotificationChannel = plus.android.importClass(
        "android.app.NotificationChannel",
      );

      const Context = plus.android.runtimeMainActivity();
      notificationManager = Context.getSystemService(
        Context.NOTIFICATION_SERVICE,
      );

      // IMPORTANCE_LOW (2): 显示在通知栏，但不发声、不弹横幅
      const channel = new NotificationChannel(channelId, channelName, 2);
      channel.setDescription("用于显示当前的课程进度与下节课提醒");
      channel.enableLights(false);
      channel.enableVibration(false);
      channel.setShowBadge(false); // 不在桌面图标右上角显示小红点

      notificationManager.createNotificationChannel(channel);
    }
  } catch (e) {
    console.error("创建通知渠道失败:", e);
  }
  // #endif
}

/**
 * 显示或更新常驻通知
 * @param {String} title 标题，例如 "📚 下节课：密码学基础"
 * @param {String} content 主内容，例如 "📍 K-708机房 ｜ 第 3-4 节"
 * @param {String} subText 顶部小字，例如 "25分钟后上课"
 */
export function showPersistentNotification(title, content, subText) {
  // #ifdef APP-PLUS
  if (plus.os.name !== "Android") return;

  try {
    if (!notificationManager) initChannel();

    const Context = plus.android.runtimeMainActivity();
    const Notification = plus.android.importClass("android.app.Notification");
    const PendingIntent = plus.android.importClass("android.app.PendingIntent");
    const Intent = plus.android.importClass("android.content.Intent");
    const Color = plus.android.importClass("android.graphics.Color");

    // 1. 构建点击通知栏跳转回 App 的 Intent
    const intent = new Intent(Context, Context.getClass());
    // FLAG_ACTIVITY_SINGLE_TOP: 如果App在前端就直接恢复，不重新启动
    intent.addFlags(
      Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP,
    );

    let pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
    const Build = plus.android.importClass("android.os.Build");
    if (Build.VERSION.SDK_INT >= 23) {
      // Build.VERSION_CODES.M
      pendingIntentFlags |= 67108864; // PendingIntent.FLAG_IMMUTABLE (安卓12强制要求)
    }

    const pendingIntent = PendingIntent.getActivity(
      Context,
      0,
      intent,
      pendingIntentFlags,
    );

    // 2. 构建 Notification
    const builder = new Notification.Builder(Context, channelId);

    // 获取系统默认的小图标 (ic_launcher 或者直接传 17301651 android.R.drawable.sym_def_app_icon)
    // 这里为了省事，直接用系统定义的基础铃铛图标，如果后续配置了具体白底透底小图标可换 R.drawable.xxx
    const iconId = 17301651;

    builder
      .setContentTitle(title)
      .setContentText(content)
      .setSmallIcon(iconId)
      .setContentIntent(pendingIntent)
      .setOngoing(true) // 核心：常驻通知，不可滑动清除
      .setAutoCancel(false); // 点击后不消失

    if (subText) {
      builder.setSubText(subText);
    }

    // 3. UI 色彩设计 (利用 Skill 中的统一主色 #0891B2)
    if (Build.VERSION.SDK_INT >= 21) {
      // Build.VERSION_CODES.LOLLIPOP
      builder.setColor(Color.parseColor("#0891B2"));
    }

    // 4. 发送通知
    if (!notificationManager) {
      notificationManager = Context.getSystemService(
        Context.NOTIFICATION_SERVICE,
      );
    }
    notificationManager.notify(notifyId, builder.build());
  } catch (e) {
    console.error("发送原生通知失败:", e);
  }
  // #endif
}

/**
 * 隐藏通知 (例如今天没课了，或者用户关闭了开关)
 */
export function hideNotification() {
  // #ifdef APP-PLUS
  if (plus.os.name !== "Android") return;
  try {
    const Context = plus.android.runtimeMainActivity();
    if (!notificationManager) {
      notificationManager = Context.getSystemService(
        Context.NOTIFICATION_SERVICE,
      );
    }
    notificationManager.cancel(notifyId);
  } catch (e) {
    console.error("取消通知失败:", e);
  }
  // #endif
}

// =============================================
// ===== 后台保活：WakeLock + 原生定时器 =====
// =============================================

/**
 * 获取 CPU 唤醒锁，防止系统休眠后 JS 停止执行
 */
function acquireWakeLock() {
  // #ifdef APP-PLUS
  if (plus.os.name !== "Android") return;
  if (wakeLock) return; // 已持有

  try {
    const PowerManager = plus.android.importClass("android.os.PowerManager");
    const Context = plus.android.runtimeMainActivity();
    const pm = Context.getSystemService(Context.POWER_SERVICE);
    // PARTIAL_WAKE_LOCK: 保持 CPU 运行，屏幕和键盘背光可关闭
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "timetable:bg_notify");
    wakeLock.setReferenceCounted(false);
    wakeLock.acquire();
    console.log("[保活] WakeLock 已获取");
  } catch (e) {
    console.error("[保活] 获取 WakeLock 失败:", e);
  }
  // #endif
}

/**
 * 释放 CPU 唤醒锁
 */
function releaseWakeLock() {
  // #ifdef APP-PLUS
  if (wakeLock) {
    try {
      wakeLock.release();
      console.log("[保活] WakeLock 已释放");
    } catch (e) {
      console.error("[保活] 释放 WakeLock 失败:", e);
    }
    wakeLock = null;
  }
  // #endif
}

/**
 * 启动原生后台定时器
 * 使用 Android Handler + Runnable 代替 JS setInterval
 * Handler 运行在 Android 主线程 Looper 上，比 WebView 的 setInterval 更可靠
 *
 * @param {Function} callback - 每次触发时执行的回调函数（即 updateNotification）
 * @param {Number} intervalMs - 间隔毫秒数，默认 60000（1分钟）
 */
export function startBackgroundTimer(callback, intervalMs = 60000) {
  // #ifdef APP-PLUS
  if (plus.os.name !== "Android") return;
  if (isTimerRunning) return; // 防止重复启动

  updateCallback = callback;

  try {
    // 1. 获取 WakeLock，防止 CPU 休眠
    acquireWakeLock();

    // 2. 创建原生 Handler（绑定主线程 Looper）
    const Handler = plus.android.importClass("android.os.Handler");
    const Looper = plus.android.importClass("android.os.Looper");
    nativeHandler = new Handler(Looper.getMainLooper());

    // 3. 创建 Runnable，作为定时任务的载体
    nativeRunnable = plus.android.implements("java.lang.Runnable", {
      run: function () {
        try {
          // 执行通知更新回调
          if (updateCallback) {
            updateCallback();
          }
        } catch (e) {
          console.error("[保活] 定时回调执行失败:", e);
        }
        // 重新调度自身，形成循环
        if (isTimerRunning && nativeHandler && nativeRunnable) {
          nativeHandler.postDelayed(nativeRunnable, intervalMs);
        }
      },
    });

    // 4. 启动第一次调度
    isTimerRunning = true;
    nativeHandler.postDelayed(nativeRunnable, intervalMs);
    console.log("[保活] 原生定时器已启动，间隔:", intervalMs, "ms");
  } catch (e) {
    console.error("[保活] 启动原生定时器失败:", e);
    // 回退到 JS setInterval
    isTimerRunning = true;
    console.log("[保活] 回退到 JS setInterval");
  }
  // #endif
}

/**
 * 停止原生后台定时器并释放资源
 */
export function stopBackgroundTimer() {
  // #ifdef APP-PLUS
  isTimerRunning = false;

  if (nativeHandler && nativeRunnable) {
    try {
      nativeHandler.removeCallbacks(nativeRunnable);
      console.log("[保活] 原生定时器已停止");
    } catch (e) {
      console.error("[保活] 停止定时器失败:", e);
    }
  }
  nativeHandler = null;
  nativeRunnable = null;
  updateCallback = null;

  releaseWakeLock();
  // #endif
}

/**
 * 请求忽略电池优化（针对 Android 6.0+ Doze 模式）
 * 会弹出系统对话框询问用户，只需请求一次
 */
export function requestIgnoreBatteryOptimization() {
  // #ifdef APP-PLUS
  if (plus.os.name !== "Android") return;

  try {
    const Build = plus.android.importClass("android.os.Build");
    if (Build.VERSION.SDK_INT < 23) return; // Android 6.0 以下不需要

    const Context = plus.android.runtimeMainActivity();
    const PowerManager = plus.android.importClass("android.os.PowerManager");
    const pm = Context.getSystemService(Context.POWER_SERVICE);
    const packageName = Context.getPackageName();

    // 检查是否已经在白名单中
    if (pm.isIgnoringBatteryOptimizations(packageName)) {
      console.log("[保活] 已在电池优化白名单中");
      return;
    }

    // 请求加入白名单
    const Intent = plus.android.importClass("android.content.Intent");
    const Settings = plus.android.importClass("android.provider.Settings");
    const Uri = plus.android.importClass("android.net.Uri");

    const intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
    intent.setData(Uri.parse("package:" + packageName));
    Context.startActivity(intent);
    console.log("[保活] 已请求忽略电池优化");
  } catch (e) {
    console.error("[保活] 请求电池优化白名单失败:", e);
  }
  // #endif
}

// =============================================
// ===== 待办事项：本地延时推送功能 =====
// =============================================

const PUSH_MAP_KEY = "timetable_push_map";

function getPushMap() {
    try {
        const val = uni.getStorageSync(PUSH_MAP_KEY);
        return val ? JSON.parse(val) : {};
    } catch (e) {
        return {};
    }
}

function savePushMap(map) {
    uni.setStorageSync(PUSH_MAP_KEY, JSON.stringify(map));
}

/**
 * 调度一个新的待办提醒
 * @param {Object} todo - 待办对象
 * @param {Number} targetTimestamp - 预估要触发提醒的绝对时间戳 (毫秒)
 */
export function scheduleReminder(todo, targetTimestamp) {
    const now = Date.now();
    const delaySeconds = Math.floor((targetTimestamp - now) / 1000);
    
    // 如果设定时间已经过期，直接忽略
    if (delaySeconds <= 0) return;

    // #ifdef APP-PLUS
    // 仅在 App 环境下有 plus API
    if (typeof plus !== 'undefined' && plus.push) {
        const title = "待办提醒";
        const content = `您有一个待办事项即将开始：${todo.title}`;
        const payload = { type: 'todo', id: todo.id };
        
        // 创建带有 delay 的本地定时消息 
        const msg = plus.push.createMessage(content, JSON.stringify(payload), {
            title: title,
            delay: delaySeconds
        });
        
        const map = getPushMap();
        map[todo.id] = { timestamp: targetTimestamp };
        savePushMap(map);
        
        console.log(`[Notification] 已通过 App 底层注册本地延时推送，延迟 ${delaySeconds} 秒: ${todo.title}`);
        return;
    }
    // #endif

    console.log(`[Notification] 待办 "${todo.title}" 将于延后 ${delaySeconds} 秒提醒。`);
}

/**
 * 取消待办提醒
 */
export function cancelReminder(todoId) {
    // #ifdef APP-PLUS
    if (typeof plus !== 'undefined' && plus.push) {
        const map = getPushMap();
        if (map[todoId]) {
            delete map[todoId];
            savePushMap(map);
            console.log(`[Notification] 撤销待办提醒 ${todoId}`);
        }
    }
    // #endif
}
