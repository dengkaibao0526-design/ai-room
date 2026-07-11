package xyz.xiaokb.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

class MainActivity : AppCompatActivity(), SensorEventListener {
    private lateinit var webView: WebView
    private lateinit var splashView: CoreSplashView
    private lateinit var sensorManager: SensorManager
    private var gravitySensor: Sensor? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var firstPageReadyAt = 0L
    private var lastMotionDispatchAt = 0L
    private var sharedText: String? = null

    private val filePicker = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        fileCallback?.onReceiveValue(uris.toTypedArray())
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        splashView = findViewById(R.id.coreSplash)
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        gravitySensor = sensorManager.getDefaultSensor(Sensor.TYPE_GRAVITY)
            ?: sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        sharedText = extractSharedText(intent)

        webView.setBackgroundColor(0xFF050409.toInt())
        webView.overScrollMode = View.OVER_SCROLL_NEVER
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            userAgentString = "$userAgentString XiaoKBAndroid/0.1"
        }
        webView.addJavascriptInterface(NativeBridge(this), "XiaoKBNative")
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?,
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = filePathCallback
                val mimeTypes = fileChooserParams?.acceptTypes
                    ?.filter { it.isNotBlank() }
                    ?.toTypedArray()
                    ?.takeIf { it.isNotEmpty() }
                    ?: arrayOf("*/*")
                filePicker.launch(mimeTypes)
                return true
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val host = uri.host.orEmpty()
                if (host == "xiaokb.xyz" || host.endsWith(".xiaokb.xyz")) return false
                startActivity(Intent(Intent.ACTION_VIEW, uri))
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                injectNativeBootstrap()
                dispatchSharedTextIfNeeded()
                if (firstPageReadyAt == 0L) firstPageReadyAt = SystemClock.elapsedRealtime()
                val hold = max(0L, 1050L - (SystemClock.elapsedRealtime() - firstPageReadyAt))
                splashView.postDelayed({ splashView.dismiss() }, hold)
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        webView.loadUrl("https://xiaokb.xyz/")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        sharedText = extractSharedText(intent)
        dispatchSharedTextIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        gravitySensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
    }

    override fun onPause() {
        sensorManager.unregisterListener(this)
        super.onPause()
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        fileCallback = null
        webView.removeJavascriptInterface("XiaoKBNative")
        webView.destroy()
        super.onDestroy()
    }

    override fun onSensorChanged(event: SensorEvent) {
        val now = SystemClock.elapsedRealtime()
        if (now - lastMotionDispatchAt < 33L || event.values.size < 2) return
        lastMotionDispatchAt = now
        val x = clamp(event.values[0] / 7.2f, -1f, 1f)
        val y = clamp(-event.values[1] / 7.2f, -1f, 1f)
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('kb-native-motion',{detail:{x:$x,y:$y}}));",
            null,
        )
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    private fun injectNativeBootstrap() {
        val script = """
            (() => {
              window.__XIAOKB_ANDROID_APP__ = true;
              window.__XIAOKB_NATIVE_APP__ = true;
              window.xiaokbNative = window.xiaokbNative || {};
              window.xiaokbNative.haptic = (style = 'light') => {
                try { window.XiaoKBNative?.haptic(String(style)); } catch (_) {}
              };
              if (!window.__xiaokbAndroidHapticBound) {
                window.__xiaokbAndroidHapticBound = true;
                document.addEventListener('click', (event) => {
                  const button = event.target?.closest?.('button');
                  if (!button) return;
                  const name = `${button.className || ''} ${button.getAttribute('aria-label') || ''}`.toLowerCase();
                  if (name.includes('send') || name.includes('发送')) window.xiaokbNative.haptic('medium');
                  else if (name.includes('stop') || name.includes('停止')) window.xiaokbNative.haptic('rigid');
                  else window.xiaokbNative.haptic('light');
                }, { passive: true });
              }
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    private fun dispatchSharedTextIfNeeded() {
        val text = sharedText?.takeIf { it.isNotBlank() } ?: return
        sharedText = null
        val quoted = JSONObject.quote(text)
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('kb-native-share',{detail:{text:$quoted}}));",
            null,
        )
    }

    private fun extractSharedText(source: Intent?): String? {
        if (source?.action != Intent.ACTION_SEND || source.type != "text/plain") return null
        return source.getStringExtra(Intent.EXTRA_TEXT)
    }

    private fun clamp(value: Float, low: Float, high: Float): Float = min(high, max(low, value))

    private class NativeBridge(private val context: Context) {
        @JavascriptInterface
        fun haptic(style: String) {
            val duration = when (style) {
                "medium" -> 22L
                "rigid" -> 30L
                "soft" -> 10L
                else -> 14L
            }
            val vibrator = if (android.os.Build.VERSION.SDK_INT >= 31) {
                context.getSystemService(VibratorManager::class.java).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(duration)
            }
        }
    }
}
