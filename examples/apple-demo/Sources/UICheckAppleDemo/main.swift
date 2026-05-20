import AppKit
import UICheckApple
import UICheckAppleDemoSupport

final class DemoController: NSObject, NSApplicationDelegate {
  private var client: UiCheckAppleClient?
  private var demo: UICheckAppleDemoView?

  func applicationDidFinishLaunching(_ notification: Notification) {
    demo = createUICheckAppleDemoView()

    if let socketUrl = ProcessInfo.processInfo.environment["UICHECK_SOCKET_URL"], !socketUrl.isEmpty {
      client = initUiCheck(
        UiCheckAppleOptions(
          socket: UiCheckAppleSocketOptions(
            url: socketUrl,
            clientId: "apple-demo",
            reconnectMs: 500
          )
        )
      )
    }
  }

  func applicationWillTerminate(_ notification: Notification) {
    client?.close()
  }

}

let app = NSApplication.shared
let delegate = DemoController()
app.delegate = delegate
app.run()
