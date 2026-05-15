# @uicheck/taro

Taro Mini Program client for uicheck.

```ts
import Taro from '@tarojs/taro'
import { installTaroUiCheck } from '@uicheck/taro'

installTaroUiCheck(Taro, {
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})
```
