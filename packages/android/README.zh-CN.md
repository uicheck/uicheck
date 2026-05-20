# UICheckAndroid

Android 原生运行时客户端。它把真实 Android 应用通过 WebSocket 接到 `@uicheck/mcp`，让 AI 请求截图并检查 Android view tree。

## 安装

把这个仓库作为 Android library 依赖添加：

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

在应用启动时安装客户端：

```kotlin
import ai.uicheck.android.UiCheckAndroidOptions
import ai.uicheck.android.UiCheckAndroidSocketOptions
import ai.uicheck.android.createAndroidViewScreenshotProvider
import ai.uicheck.android.initUiCheck

val client = initUiCheck(
  UiCheckAndroidOptions(
    socket = UiCheckAndroidSocketOptions(
      url = "ws://127.0.0.1:17322/socket",
      clientId = "android-demo"
    ),
    rootView = { rootView },
    screenshot = createAndroidViewScreenshotProvider(rootView)
  )
)
```

不再需要时释放：

```kotlin
client.close()
```

## MCP 工具

| 工具 | 说明 |
| --- | --- |
| `capture_page` | 使用配置的截图 provider 返回 PNG 截图。 |
| `inspect_elements` | 返回 view tree 元数据、文本、布局盒和可见性。 |
