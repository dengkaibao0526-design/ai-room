package xyz.xiaokb.app

import android.view.Choreographer
import android.view.Display
import android.view.View
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
        fun requestHighestRefresh(display: Display?, webView: WebView) {
            if (display?.supportedModes?.isNotEmpty() == true) {
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
                webView.postInvalidateOnAnimation()
            }
        }
    }
}
