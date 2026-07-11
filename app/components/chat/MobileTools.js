import { useEffect, useState } from "react";

const SENSOR_EVENT = "kb-spatial-sensor-change";
const SENSOR_STORAGE_KEY = "xiaokb_spatial_sensor";

export default function MobileTools({ open, settings, onClose, onFeedback, onReset, onMemory }) {
  const [sensorEnabled, setSensorEnabled] = useState(false);
  const [sensorInfoOpen, setSensorInfoOpen] = useState(false);
  const [sensorMessage, setSensorMessage] = useState("");
  const [nativeMotion, setNativeMotion] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const isAndroidApp = /XiaoKBAndroid\//i.test(navigator.userAgent || "") || window.__XIAOKB_ANDROID_APP__ === true;
    const isNative = isAndroidApp || window.__XIAOKB_NATIVE_APP__ === true || window.__XIAOKB_IOS_APP__ === true;
    setNativeMotion(isNative);
    setSensorEnabled(isNative || localStorage.getItem(SENSOR_STORAGE_KEY) === "true");
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function toggleSpatialSensor() {
    setSensorMessage("");
    if (nativeMotion) {
      setSensorMessage("原生感应已接管，空间响应会跟随设备姿态自动工作。");
      return;
    }

    if (sensorEnabled) {
      localStorage.setItem(SENSOR_STORAGE_KEY, "false");
      setSensorEnabled(false);
      window.dispatchEvent(new CustomEvent(SENSOR_EVENT, { detail: { enabled: false } }));
      return;
    }

    if (typeof window.DeviceOrientationEvent === "undefined") {
      setSensorMessage("当前设备或浏览器不支持设备方向感应。");
      return;
    }

    try {
      const requestPermission = window.DeviceOrientationEvent.requestPermission;
      if (typeof requestPermission === "function") {
        const permission = await requestPermission.call(window.DeviceOrientationEvent);
        if (permission !== "granted") {
          setSensorMessage("没有获得运动与方向权限，空间感应未开启。");
          return;
        }
      }

      localStorage.setItem(SENSOR_STORAGE_KEY, "true");
      setSensorEnabled(true);
      window.dispatchEvent(new CustomEvent(SENSOR_EVENT, { detail: { enabled: true } }));
    } catch {
      setSensorMessage("空间感应权限请求失败，请检查浏览器设置后再试。");
    }
  }

  if (!open) return null;

  return (
    <div className="mobileToolBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="mobileToolSheet" role="dialog" aria-modal="true" aria-label="小KB 工具">
        <div className="mobileToolSheetHeader">
          <strong>工具</strong>
          <button type="button" onClick={onClose} aria-label="关闭工具">×</button>
        </div>
        <div className="mobileToolGrid">
          <button type="button" onClick={() => { onClose(); onMemory(); }}><span>记忆中心<small>小KB记得的事</small></span><em>◌</em></button>
          <a href="/install"><span>下载小KB<small>iPhone / Android</small></span><em>↓</em></a>
          {settings.show_copywriter && <a href="/tool/copywriter"><span>文案工作台</span><em>↗</em></a>}
          {settings.show_mbti && <a href="/game/mbti"><span>MBTI</span><em>↗</em></a>}
          {settings.show_feedback && <button type="button" onClick={() => { onClose(); onFeedback(); }}><span>反馈</span><em>＋</em></button>}
          <div className={`mobileSensorTool${sensorEnabled ? " isEnabled" : ""}`}>
            <button className="mobileSensorToggle" type="button" onClick={toggleSpatialSensor} aria-pressed={sensorEnabled}>
              <span>空间感应<small>{nativeMotion ? "原生感应已接管" : sensorEnabled ? "已开启" : "点击开启"}</small></span>
              <em aria-hidden="true"><i /></em>
            </button>
            <button className="mobileSensorInfoButton" type="button" onClick={() => setSensorInfoOpen(true)} aria-label="查看空间感应说明">!</button>
          </div>
          <button type="button" onClick={() => { onClose(); onReset(); }}><span>新对话</span><em>＋</em></button>
        </div>
        {sensorMessage && <p className="mobileSensorMessage" role="status">{sensorMessage}</p>}

        {sensorInfoOpen && (
          <div className="mobileSensorInfoBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSensorInfoOpen(false)}>
            <section className="mobileSensorInfo" role="dialog" aria-modal="true" aria-label="空间感应说明">
              <div><strong>空间感应</strong><button type="button" onClick={() => setSensorInfoOpen(false)} aria-label="关闭说明">×</button></div>
              <p>开启后，小KB会读取手机的陀螺仪与设备方向数据，让紫色折射场、KB Core 高光和输入区空间效果跟随手机轻微倾斜。</p>
              <p>它不会读取你的位置、相机或麦克风。方向数据只用于当前页面的视觉响应，不会作为聊天内容发送。</p>
              <small>{nativeMotion ? "当前由小KB原生 App 直接提供设备姿态数据。" : "iPhone 首次开启时，Safari 可能弹出“运动与方向访问”系统权限提示。"}</small>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
