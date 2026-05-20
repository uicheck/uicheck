package ai.uicheck.demo

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

data class UICheckAndroidDemoView(
  val screen: LinearLayout,
  val title: TextView,
  val summary: LinearLayout,
  val items: LinearLayout,
  val status: LinearLayout,
  val details: LinearLayout,
  val submit: Button
)

fun createUICheckAndroidDemoView(context: Context): UICheckAndroidDemoView {
  val screen = LinearLayout(context).apply {
    id = View.generateViewId()
    orientation = LinearLayout.VERTICAL
    setBackgroundColor(Color.rgb(248, 250, 252))
    contentDescription = "Checkout screen"
  }
  val header = LinearLayout(context).apply {
    orientation = LinearLayout.HORIZONTAL
    setPadding(dp(context, 24), dp(context, 12), dp(context, 24), dp(context, 12))
    setBackgroundColor(Color.rgb(17, 24, 39))
  }
  val headerText = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL
  }
  val eyebrow = label(context, "UICheck Android", 13f, Color.rgb(147, 197, 253), true)
  val title = label(context, "Checkout screen", 22f, Color.WHITE, true)
  val badge = TextView(context).apply {
    text = "android"
    textSize = 12f
    setTypeface(typeface, Typeface.BOLD)
    setTextColor(Color.WHITE)
    gravity = android.view.Gravity.CENTER
    setPadding(dp(context, 12), 0, dp(context, 12), 0)
    background = roundedBorder(Color.TRANSPARENT, Color.argb(92, 255, 255, 255), dp(context, 999), dp(context, 1))
  }
  headerText.addView(eyebrow, LinearLayout.LayoutParams(-1, -2))
  headerText.addView(title, LinearLayout.LayoutParams(-1, -2))
  header.addView(headerText, LinearLayout.LayoutParams(0, -2, 1f))
  header.addView(badge, LinearLayout.LayoutParams(-2, dp(context, 32)))

  val content = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL
    setPadding(dp(context, 14), dp(context, 14), dp(context, 14), dp(context, 14))
  }
  val summary = card(context, "Registered ref summary", "MCP reads runtime boxes, text, testID and labels.")
  val items = orderCard(context)
  val status = card(context, "Ready for MCP inspection", "This real demo has 100+ inspectable nodes.")
  val details = detailsPanel(context)
  val hint = TextView(context).apply {
    text = "MCP can inspect all elements or a selected target."
    textSize = 11f
    setTypeface(typeface, Typeface.BOLD)
    setTextColor(Color.rgb(15, 118, 110))
    setPadding(dp(context, 10), dp(context, 8), dp(context, 10), dp(context, 8))
    background = roundedFill(Color.rgb(236, 254, 255), dp(context, 10))
  }
  val submit = Button(context).apply {
    id = View.generateViewId()
    text = "Submit order"
    isAllCaps = false
    contentDescription = "Submit order"
    background = roundedFill(Color.rgb(168, 85, 247), dp(context, 10))
    setTextColor(Color.WHITE)
    textSize = 14f
  }

  content.addView(summary, LinearLayout.LayoutParams(-1, dp(context, 66)))
  content.addView(items, LinearLayout.LayoutParams(-1, dp(context, 92)).withTop(context, 8))
  content.addView(status, LinearLayout.LayoutParams(-1, dp(context, 66)).withTop(context, 8))
  content.addView(details, LinearLayout.LayoutParams(-1, dp(context, 370)).withTop(context, 8))
  content.addView(hint, LinearLayout.LayoutParams(-1, dp(context, 34)).withTop(context, 8))
  content.addView(View(context), LinearLayout.LayoutParams(-1, 0, 1f))
  content.addView(submit, LinearLayout.LayoutParams(-1, dp(context, 40)).withTop(context, 8))

  screen.addView(header, LinearLayout.LayoutParams(-1, dp(context, 78)))
  screen.addView(content, LinearLayout.LayoutParams(-1, 0, 1f))
  return UICheckAndroidDemoView(screen, title, summary, items, status, details, submit)
}

private fun card(context: Context, title: String, text: String): LinearLayout =
  shell(context).apply {
    addView(label(context, title, 13f, Color.rgb(17, 24, 39), true), LinearLayout.LayoutParams(-1, dp(context, 18)))
    addView(label(context, text, 11f, Color.rgb(71, 85, 105), false), LinearLayout.LayoutParams(-1, dp(context, 30)))
  }

private fun orderCard(context: Context): LinearLayout =
  shell(context).apply {
    addView(label(context, "Order items", 13f, Color.rgb(17, 24, 39), true), LinearLayout.LayoutParams(-1, dp(context, 18)))
    addView(orderRow(context, "Starter license", "$19"), LinearLayout.LayoutParams(-1, dp(context, 15)))
    addView(orderRow(context, "Team add-on", "$8"), LinearLayout.LayoutParams(-1, dp(context, 15)))
    addView(orderRow(context, "Total", "$27", true), LinearLayout.LayoutParams(-1, dp(context, 16)).withTop(context, 4))
  }

private fun detailsPanel(context: Context): LinearLayout =
  shell(context, padding = 8).apply {
    addView(label(context, "Runtime detail matrix", 13f, Color.rgb(17, 24, 39), true), LinearLayout.LayoutParams(-1, dp(context, 18)))
    val grid = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
    for (line in 0 until 17) {
      val row = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
      for (column in 0 until 2) {
        val number = line * 2 + column + 1
        row.addView(detailCell(context, number), LinearLayout.LayoutParams(0, dp(context, 16), 1f).withRight(context, if (column == 0) 6 else 0))
      }
      grid.addView(row, LinearLayout.LayoutParams(-1, dp(context, 19)))
    }
    addView(grid, LinearLayout.LayoutParams(-1, dp(context, 330)).withTop(context, 4))
  }

private fun detailCell(context: Context, number: Int): LinearLayout {
  val padded = number.toString().padStart(2, '0')
  val value = when (number % 3) {
    0 -> "ok"
    1 -> "warn"
    else -> "trace"
  }
  return LinearLayout(context).apply {
    orientation = LinearLayout.HORIZONTAL
    setPadding(dp(context, 4), dp(context, 1), dp(context, 4), dp(context, 1))
    background = roundedBorder(Color.rgb(248, 250, 252), Color.rgb(226, 232, 240), dp(context, 4), dp(context, 1))
    addView(label(context, "Runtime check $padded", 9f, Color.rgb(51, 65, 85), false), LinearLayout.LayoutParams(0, -1, 1f))
    addView(label(context, value, 9f, Color.rgb(15, 118, 110), true), LinearLayout.LayoutParams(dp(context, 42), -1))
  }
}

private fun orderRow(context: Context, label: String, value: String, strong: Boolean = false): LinearLayout =
  LinearLayout(context).apply {
    orientation = LinearLayout.HORIZONTAL
    addView(label(context, label, 11f, Color.rgb(17, 24, 39), strong), LinearLayout.LayoutParams(0, -1, 1f))
    addView(label(context, value, 11f, Color.rgb(17, 24, 39), true), LinearLayout.LayoutParams(dp(context, 60), -1))
  }

private fun shell(context: Context, padding: Int = 10): LinearLayout =
  LinearLayout(context).apply {
    id = View.generateViewId()
    orientation = LinearLayout.VERTICAL
    val resolvedPadding = dp(context, padding)
    setPadding(resolvedPadding, resolvedPadding, resolvedPadding, resolvedPadding)
    background = roundedBorder(Color.WHITE, Color.rgb(219, 227, 239), dp(context, 10), dp(context, 1))
  }

private fun roundedFill(color: Int, radius: Int): GradientDrawable =
  GradientDrawable().apply {
    setColor(color)
    cornerRadius = radius.toFloat()
  }

private fun roundedBorder(color: Int, strokeColor: Int, radius: Int, strokeWidth: Int): GradientDrawable =
  GradientDrawable().apply {
    setColor(color)
    cornerRadius = radius.toFloat()
    setStroke(strokeWidth, strokeColor)
  }

private fun label(context: Context, value: String, size: Float, color: Int, bold: Boolean): TextView =
  TextView(context).apply {
    text = value
    textSize = size
    setTextColor(color)
    if (bold) setTypeface(typeface, Typeface.BOLD)
    includeFontPadding = false
  }

private fun dp(context: Context, value: Int): Int =
  (value * context.resources.displayMetrics.density).toInt()

private fun LinearLayout.LayoutParams.withTop(context: Context, value: Int): LinearLayout.LayoutParams {
  topMargin = dp(context, value)
  return this
}

private fun LinearLayout.LayoutParams.withRight(context: Context, value: Int): LinearLayout.LayoutParams {
  rightMargin = dp(context, value)
  return this
}
