# UICheckAndroid

UI Check 的 Android 原生运行环境客户端。它通过 WebSocket 连接 `@uicheck/mcp`，让 AI Agent 可以通过 MCP 工具读取截图、已注册原生 View 信息、布局盒子和坐标。

## 安装

把这个仓库作为 Android library 依赖加入项目：

```txt
https://github.com/uicheck/uicheck
```

包路径：

```txt
packages/android
```

单独启动 MCP 服务：

```sh
npm install -g @uicheck/mcp
uicheck-mcp
```

## 使用

在应用启动附近安装客户端：

```kotlin
import ai.uicheck.android.UiCheckAndroidOptions
import ai.uicheck.android.UiCheckAndroidSocketOptions
import ai.uicheck.android.UiCheckAndroidViewportInfo
import ai.uicheck.android.createAndroidViewScreenshotProvider
import ai.uicheck.android.installAndroidUiCheck

val client = installAndroidUiCheck(
  UiCheckAndroidOptions(
    socket = UiCheckAndroidSocketOptions(
      url = "ws://127.0.0.1:17322/socket",
      clientId = "android-demo"
    ),
    title = "Demo",
    route = "/home",
    platform = "android",
    viewport = {
      UiCheckAndroidViewportInfo(width = 393, height = 873, devicePixelRatio = 2.75)
    },
    screenshot = createAndroidViewScreenshotProvider(rootView)
  )
)
```

注册希望 AI 检查的 View：

```kotlin
import ai.uicheck.android.registerAndroidUiCheckView

val unregister = registerAndroidUiCheckView(
  submitButton,
  tag = "Button",
  testID = "submit-button",
  text = "Submit"
)
```

如果是 Compose 或非 View 抽象，也可以注册自定义 frame provider：

```kotlin
import ai.uicheck.android.UiCheckAndroidElementRegistration
import ai.uicheck.android.UiCheckAndroidRect
import ai.uicheck.android.registerAndroidUiCheckElement

val unregister = registerAndroidUiCheckElement(
  UiCheckAndroidElementRegistration(
    tag = "Button",
    testID = "submit-button",
    text = "Submit",
    frame = { UiCheckAndroidRect(12.0, 24.0, 120.0, 48.0) }
  )
)
```

不用时释放：

```kotlin
unregister()
client.close()
```

## MCP 工具

| 工具 | 说明 |
| --- | --- |
| `capture_page` | 使用配置的截图 provider 返回 PNG 截图。 |
| `inspect_elements` | 返回已注册原生 View 的元数据、文本、布局盒子和可见状态。 |
| `get_element_at_point` | 返回视口坐标下最小的已注册 View。 |

## 说明

Android 原生应用没有 DOM 查询 API。需要注册 AI 要检查的 View 或组件。`registerAndroidUiCheckView` 会用屏幕坐标测量原生 View。
