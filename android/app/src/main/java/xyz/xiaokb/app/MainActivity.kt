package xyz.xiaokb.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

class MainActivity : AppCompatActivity(), SensorEventListener {
    private lateinit var webView: WebView
    private lateinit var splashView: CoreSplashView
    private lateinit var errorPanel: View
    private lateinit var sensorManager: SensorManager
    private var gravitySensor: Sensor? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var firstPageReadyAt = 0L
    private var lastMotionDispatchAt = 0L
    private var sharedText: String? = null
    private var mainPageLoaded = false
    private var lastSafeTop = 0
    private var lastSafeBottom = 0

    private val filePicker = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        fileCallback?.onReceiveValue(uris.toTypedArray())
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        configureSystemBars()
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        splashView = findViewById(R.id.coreSplash)
        errorPanel = findViewById(R.id.errorPanel)
        findViewById<Button>(R.id.retryButton).setOnClickListener { retryConnection() }

        installAndroid16Insets()

        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        gravitySensor = sensorManager.getDefaultSensor(Sensor.TYPE_GRAVITY)
            ?: sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        sharedText = extractSharedText(intent)

        configureWebView()
        installBackBehavior()

        if (savedInstanceState == null) {
            webView.loadUrl(HOME_URL)
        } else {
            webView.restoreState(savedInstanceState) ?: webView.loadUrl(HOME_URL)
        }
    }

    private fun configureSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (Build.VERSION.SDK_INT >= 29) {
            window.isNavigationBarContrastEnforced = false
            window.isStatusBarContrastEnforced = false
        }
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private fun installAndroid16Insets() {
        val root = findViewById<View>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())

            val safeLeft = max(bars.left, cutout.left)
            val safeTop = max(bars.top, cutout.top)
            val safeRight = max(bars.right, cutout.right)
            val safeBottom = if (imeVisible) 0 else max(bars.bottom, cutout.bottom)

            webView.setPadding(safeLeft, safeTop, safeRight, safeBottom)
            errorPanel.setPadding(safeLeft, safeTop, safeRight, safeBottom)
            lastSafeTop = safeTop
            lastSafeBottom = safeBottom
            dispatchNativeInsetsIfReady()
            insets
        }
        ViewCompat.requestApplyInsets(root)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.setBackgroundColor(0xFF050409.toInt())
        webView.overScrollMode = View.OVER_SCROLL_NEVER
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        webView.clipToPadding = false
        webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            userAgentString = "$userAgentString XiaoKBAndroid/0.3 Android16"
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

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                errorPanel.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showConnectionError()
            }

            override fun onPageFinished(view: WebView, url: String) {
                mainPageLoaded = true
                injectNativeBootstrap()
                dispatchNativeInsetsIfReady()
                dispatchSharedTextIfNeeded()
                if (firstPageReadyAt == 0L) firstPageReadyAt = SystemClock.elapsedRealtime()
                val hold = max(0L, 1050L - (SystemClock.elapsedRealtime() - firstPageReadyAt))
                splashView.postDelayed({ splashView.dismiss() }, hold)
            }
        }
    }

    private fun installBackBehavior() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    errorPanel.visibility == View.VISIBLE -> retryConnection()
                    webView.canGoBack() -> webView.goBack()
                    else -> finishAfterTransition()
                }
            }
        })
    }

    private fun showConnectionError() {
        mainPageLoaded = false
        splashView.dismiss()
        webView.visibility = View.INVISIBLE
        errorPanel.visibility = View.VISIBLE
    }

    private fun retryConnection() {
        errorPanel.visibility = View.GONE
        webView.visibility = View.VISIBLE
        webView.loadUrl(HOME_URL)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        sharedText = extractSharedText(intent)
        if (mainPageLoaded) dispatchSharedTextIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        gravitySensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
        ViewCompat.requestApplyInsets(findViewById(R.id.root))
    }

    override fun onPause() {
        sensorManager.unregisterListener(this)
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        fileCallback = null
        webView.removeJavascriptInterface("XiaoKBNative")
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    override fun onSensorChanged(event: SensorEvent) {
        val now = SystemClock.elapsedRealtime()
        if (!mainPageLoaded || now - lastMotionDispatchAt < 33L || event.values.size < 2) return
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
              window.__XIAOKB_ANDROID_16_SHELL__ = true;
              window.xiaokbNative = window.xiaokbNative || {};
              window.xiaokbNative.haptic = (style = 'light') => {
                try { window.XiaoKBNative?.haptic(String(style)); } catch (_) {}
              };
              if (!window.__xiaokbAndroidHapticBound) {
                window.__xiaokbAndroidHapticBound = true;
                document.addEventListener('click', (event) => {
                  const button = event.target?.closest?.('button');
                  if (!button) return;
                  const name = (String(button.className || '') + ' ' + String(button.getAttribute('aria-label') || '')).toLowerCase();
                  if (name.includes('send') || name.includes('发送')) window.xiaokbNative.haptic('medium');
                  else if (name.includes('stop') || name.includes('停止')) window.xiaokbNative.haptic('rigid');
                  else window.xiaokbNative.haptic('light');
                }, { passive: true });
              }
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    private fun dispatchNativeInsetsIfReady() {
        if (!mainPageLoaded) return
        val density = resources.displayMetrics.density.coerceAtLeast(1f)
        val topDp = lastSafeTop / density
        val bottomDp = lastSafeBottom / density
        webView.evaluateJavascript(
            "document.documentElement.style.setProperty('--kb-native-safe-top','${topDp}px');" +
                "document.documentElement.style.setProperty('--kb-native-safe-bottom','${bottomDp}px');" +
                "window.dispatchEvent(new CustomEvent('kb-native-insets',{detail:{top:$topDp,bottom:$bottomDp}}));",
            null,
        )
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
            val vibrator = if (Build.VERSION.SDK_INT >= 31) {
                context.getSystemService(VibratorManager::class.java).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            if (Build.VERSION.SDK_INT >= 26) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(duration)
            }
        }
    }

    companion object {
        private const val HOME_URL = "https://xiaokb.xyz/"
    }
}
