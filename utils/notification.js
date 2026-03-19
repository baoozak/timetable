/**
 * 原生安卓常驻通知栏模块
 * 利用 plus.android 调用底层 NotificationManager
 */

let notificationManager = null;
let notifyId = 10086; // 固定ID，保证覆盖更新而不是重复创建
let channelId = "school_timetable_channel";
let channelName = "下节啥课提醒";

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
