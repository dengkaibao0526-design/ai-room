package xyz.xiaokb.app

import android.os.Build
import android.view.Choreographer
import android.view.Display
import android.view.Surface
import android.webkit.WebView
import kotlin.math.abs

class MotionFrameEngine(
    private val webView: WebView,
) : Choreographer.FrameCallback {
    private val choreographer = Choreographer.getInstance()
    private var running = false
    private var pageReady = false

    private var targetX = 0f
    private var targetY = 0f
    private var currentX = 0f
    private var currentY = 0f
    private var sentX = Float.NaN
    private var sentY = Float.NaN

    fun setPageReady(ready: Boolean) {
        pageReady = ready
    }

    fun updateSensor(x: Float, y: Float) {
        targetX = x.coerceIn(-1f, 1f)
        targetY = y.coerceIn(-1f, 1f)
    }

    fun start() {
        if (running) return
        running = true
        choreographer.postFrameCallback(this)
    }

    fun stop() {
        running = false
        choreographer.removeFrameCallback(this)
    }

    override fun doFrame(frameTimeNanos: Long) {
        if (!running) return

        // Frame-rate independent smoothing. On 120 Hz this takes smaller, more frequent steps;
        // on 60 Hz it still converges quickly without overshoot.
        currentX += (targetX - currentX) * 0.34f
        currentY += (targetY - currentY) * 0.34f

        val changed = sentX.isNaN() || abs(currentX - sentX) > 0.0012f || abs(currentY - sentY) > 0.0012f
        if (pageReady && changed) {
            sentX = currentX
            sentY = currentY
            webView.evaluateJavascript(
                "window.__kbNativeMotionLatest={x:$currentX,y:$currentY};" +
                    "window.dispatchEvent(new CustomEvent('kb-native-motion',{detail:window.__kbNativeMotionLatest}));",
                null,
            )
        }

        choreographer.postFrameCallback(this)
    }

    companion object {
        fun requestHighestRefresh(display: Display?, surfaceView: WebView) {
            val modes = display?.supportedModes.orEmpty()
            val best = modes.maxByOrNull { it.refreshRate }
            if (best != null && Build.VERSION.SDK_INT >= 23) {
                surfaceView.post {
                    val params = surfaceView.rootView.layoutParams
                    // preferredDisplayModeId belongs to Window.LayoutParams, configured by the Activity.
                    // The WebView itself still advertises its desired frame rate below.
                    if (Build.VERSION.SDK_INT >= 30) {
                        surfaceView.setFrameRate(best.refreshRate, Surface.FRAME_RATE_COMPATIBILITY_DEFAULT)
                    }
                }
            }
        }
    }
}
