# @uicheck/rn

React Native 侧 UI 检查客户端。RN 没有 DOM 查询能力，因此需要把希望 AI 看到的组件 ref 注册给 uicheck；注册后 `@uicheck/mcp` 可以读取元素坐标、文本、`testID` 和 `accessibilityLabel`。

```ts
import { AppState, Dimensions, Platform } from 'react-native'
import {
  installReactNativeUiCheck,
  registerReactNativeUiCheckElement
} from '@uicheck/rn'

installReactNativeUiCheck(
  { AppState, Dimensions, Platform, WebSocket },
  {
    route: 'Home',
    socket: {
      url: 'ws://127.0.0.1:17322/socket'
    }
  }
)

const unregister = registerReactNativeUiCheckElement({
  ref: submitButtonRef,
  tag: 'Pressable',
  testID: 'submit-button',
  text: '提交'
})
```

## 截图

RN 截图依赖宿主应用能力。需要使用 `capture_page` 时传入 `screenshot` 方法并返回 PNG base64。

```ts
installReactNativeUiCheck(reactNative, {
  screenshot: async () => ({
    mimeType: 'image/png',
    base64: await captureAppAsBase64()
  })
})
```
