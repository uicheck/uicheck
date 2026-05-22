# UICheckAndroid

Android native runtime client for UI Check. It connects native Android apps to `@uicheck/mcp` over WebSocket so AI agents can request screenshots and inspect the live Android view tree.

## Install

Add this repository as an Android library dependency:

```txt
https://github.com/uicheck/uicheck
```

Package path:

```txt
packages/android
```

Start the MCP server separately:

```sh
npx @uicheck/mcp
```

## Usage

Install the client near app startup:

```kotlin
import ai.uicheck.android.UiCheckAndroidOptions
import ai.uicheck.android.UiCheckAndroidSocketOptions
import ai.uicheck.android.initUiCheck

val client = initUiCheck(
  UiCheckAndroidOptions(
    socket = UiCheckAndroidSocketOptions(
      url = "ws://127.0.0.1:17322/socket",
      clientId = "android-demo"
    ),
    activity = this
  )
)
```

Dispose when no longer needed:

```kotlin
client.close()
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `socket.url` | `String` | - | `@uicheck/mcp` WebSocket URL |
| `socket.clientId` | `String` | - | Optional stable client id |
| `socket.reconnectMs` | `Long` | `1000` | Reconnect interval |
| `activity` | `Activity` | - | Current Activity used to read the root View and capture screenshots |
| `screenshot` | `function` | - | Optional screenshot provider that returns PNG base64 |
