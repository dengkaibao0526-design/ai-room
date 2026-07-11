package xyz.xiaokb.app

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import kotlin.math.min

class CoreSplashView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var phase = 0f
    private val animator = ValueAnimator.ofFloat(0f, 1f).apply {
        duration = 2200L
        repeatCount = ValueAnimator.INFINITE
        interpolator = AccelerateDecelerateInterpolator()
        addUpdateListener {
            phase = it.animatedValue as Float
            invalidate()
        }
        start()
    }

    init {
        setBackgroundColor(Color.rgb(5, 4, 9))
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height / 2f
        val base = min(width, height) * 0.105f
        val breath = 0.94f + phase * 0.08f

        paint.style = Paint.Style.FILL
        paint.shader = RadialGradient(
            cx,
            cy,
            base * 2.7f,
            intArrayOf(Color.argb(120, 154, 91, 255), Color.argb(32, 102, 45, 205), Color.TRANSPARENT),
            floatArrayOf(0f, 0.45f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, base * 2.7f * breath, paint)

        paint.shader = null
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 2.2f
        paint.color = Color.argb(145, 194, 155, 255)
        canvas.save()
        canvas.rotate(phase * 18f, cx, cy)
        canvas.scale(1.34f, 0.62f, cx, cy)
        canvas.drawCircle(cx, cy, base * 1.28f, paint)
        canvas.restore()

        paint.strokeWidth = 1.4f
        paint.color = Color.argb(90, 134, 84, 236)
        canvas.save()
        canvas.rotate(-phase * 14f + 58f, cx, cy)
        canvas.scale(1.18f, 0.72f, cx, cy)
        canvas.drawCircle(cx, cy, base * 1.48f, paint)
        canvas.restore()

        paint.style = Paint.Style.FILL
        paint.shader = RadialGradient(
            cx,
            cy,
            base * breath,
            intArrayOf(Color.rgb(224, 205, 255), Color.rgb(137, 75, 245), Color.rgb(45, 20, 82)),
            floatArrayOf(0f, 0.42f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, base * 0.62f * breath, paint)
        paint.shader = null
    }

    fun dismiss() {
        animate()
            .alpha(0f)
            .setDuration(320L)
            .withEndAction {
                animator.cancel()
                visibility = GONE
            }
            .start()
    }

    override fun onDetachedFromWindow() {
        animator.cancel()
        super.onDetachedFromWindow()
    }
}
