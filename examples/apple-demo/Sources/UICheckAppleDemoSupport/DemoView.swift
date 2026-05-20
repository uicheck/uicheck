import AppKit

public struct UICheckAppleDemoView {
  public let window: NSWindow
  public let content: UICheckAppleDemoContent
}

public struct UICheckAppleDemoContent {
  public let screen: NSView
  public let title: NSTextField
  public let summary: NSView
  public let items: NSView
  public let status: NSView
  public let details: NSView
  public let submit: NSButton
}

@MainActor
public func createUICheckAppleDemoView() -> UICheckAppleDemoView {
  let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 390, height: 844), styleMask: [.titled, .closable], backing: .buffered, defer: false)
  window.title = "UICheck Apple Demo"
  let content = createUICheckAppleDemoContent()
  window.contentView = content.screen
  window.makeKeyAndOrderFront(nil)
  return UICheckAppleDemoView(window: window, content: content)
}

@MainActor
public func createUICheckAppleDemoContent() -> UICheckAppleDemoContent {
  let screen = NSView(frame: NSRect(x: 0, y: 0, width: 390, height: 844))
  screen.identifier = NSUserInterfaceItemIdentifier("screen")
  screen.wantsLayer = true
  screen.layer?.backgroundColor = NSColor(calibratedRed: 0.97, green: 0.98, blue: 0.99, alpha: 1).cgColor

  let header = NSView(frame: NSRect(x: 0, y: 766, width: 390, height: 78))
  header.wantsLayer = true
  header.layer?.backgroundColor = NSColor(calibratedRed: 0.067, green: 0.094, blue: 0.153, alpha: 1).cgColor
  let eyebrow = label("UICheck Apple", frame: NSRect(x: 24, y: 44, width: 180, height: 18), size: 13, color: NSColor(calibratedRed: 0.576, green: 0.773, blue: 0.992, alpha: 1), bold: true)
  let title = label("Checkout screen", frame: NSRect(x: 24, y: 12, width: 248, height: 28), size: 22, color: .white, bold: true)
  let badge = label("apple", frame: NSRect(x: 310, y: 23, width: 56, height: 24), size: 12, color: .white, bold: true)
  badge.alignment = .center
  badge.wantsLayer = true
  badge.layer?.borderColor = NSColor(calibratedWhite: 1, alpha: 0.36).cgColor
  badge.layer?.borderWidth = 1
  badge.layer?.cornerRadius = 12
  header.addSubview(eyebrow)
  header.addSubview(title)
  header.addSubview(badge)

  let summary = card(frame: NSRect(x: 14, y: 686, width: 362, height: 66), title: "Registered ref summary", text: "MCP reads runtime boxes, text, testID and labels.")
  let items = orderCard(frame: NSRect(x: 14, y: 586, width: 362, height: 92))
  let status = card(frame: NSRect(x: 14, y: 512, width: 362, height: 66), title: "Ready for MCP inspection", text: "This real demo has 100+ inspectable nodes.")
  let details = detailsPanel(frame: NSRect(x: 14, y: 134, width: 362, height: 370))
  let hint = label("MCP can inspect all elements or a selected target.", frame: NSRect(x: 24, y: 90, width: 342, height: 18), size: 11, color: NSColor(calibratedRed: 0.059, green: 0.463, blue: 0.431, alpha: 1), bold: true)
  let hintBox = NSView(frame: NSRect(x: 14, y: 82, width: 362, height: 34))
  hintBox.wantsLayer = true
  hintBox.layer?.backgroundColor = NSColor(calibratedRed: 0.925, green: 0.996, blue: 1, alpha: 1).cgColor
  hintBox.layer?.cornerRadius = 12
  hintBox.addSubview(hint)
  let submit = NSButton(title: "Submit order", target: nil, action: nil)
  submit.identifier = NSUserInterfaceItemIdentifier("submit-button")
  submit.frame = NSRect(x: 14, y: 28, width: 362, height: 40)
  submit.isBordered = false
  submit.wantsLayer = true
  submit.layer?.backgroundColor = NSColor(calibratedRed: 0.659, green: 0.333, blue: 0.969, alpha: 1).cgColor
  submit.layer?.cornerRadius = 10
  submit.attributedTitle = NSAttributedString(
    string: "Submit order",
    attributes: [
      .foregroundColor: NSColor.white,
      .font: NSFont.boldSystemFont(ofSize: 14)
    ]
  )

  [header, summary, items, status, details, hintBox, submit].forEach(screen.addSubview)
  return UICheckAppleDemoContent(screen: screen, title: title, summary: summary, items: items, status: status, details: details, submit: submit)
}

@MainActor
private func card(frame: NSRect, title: String, text: String) -> NSView {
  let view = shell(frame)
  view.addSubview(label(title, frame: NSRect(x: 10, y: 38, width: frame.width - 20, height: 18), size: 13, color: dark, bold: true))
  view.addSubview(label(text, frame: NSRect(x: 10, y: 14, width: frame.width - 20, height: 18), size: 11, color: muted, bold: false))
  return view
}

@MainActor
private func orderCard(frame: NSRect) -> NSView {
  let view = shell(frame)
  view.addSubview(label("Order items", frame: NSRect(x: 10, y: 64, width: frame.width - 20, height: 18), size: 13, color: dark, bold: true))
  view.addSubview(orderRow("Starter license", "$19", y: 44, width: frame.width))
  view.addSubview(orderRow("Team add-on", "$8", y: 28, width: frame.width))
  view.addSubview(orderRow("Total", "$27", y: 10, width: frame.width, bold: true))
  return view
}

@MainActor
private func detailsPanel(frame: NSRect) -> NSView {
  let view = shell(frame, padding: 8)
  view.addSubview(label("Runtime detail matrix", frame: NSRect(x: 8, y: 344, width: frame.width - 16, height: 18), size: 13, color: dark, bold: true))
  for line in 0..<17 {
    for column in 0..<2 {
      let number = line * 2 + column + 1
      let x = 8 + CGFloat(column) * 174
      let y = 322 - CGFloat(line) * 19
      view.addSubview(detailCell(number, frame: NSRect(x: x, y: y, width: 166, height: 16)))
    }
  }
  return view
}

@MainActor
private func detailCell(_ number: Int, frame: NSRect) -> NSView {
  let cell = NSView(frame: frame)
  cell.wantsLayer = true
  cell.layer?.backgroundColor = NSColor(calibratedRed: 0.973, green: 0.98, blue: 0.988, alpha: 1).cgColor
  cell.layer?.cornerRadius = 4
  let padded = String(format: "%02d", number)
  let value = number % 3 == 0 ? "ok" : number % 3 == 1 ? "warn" : "trace"
  cell.addSubview(label("Runtime check \(padded)", frame: NSRect(x: 4, y: 2, width: 108, height: 12), size: 9, color: muted, bold: false))
  cell.addSubview(label(value, frame: NSRect(x: 124, y: 2, width: 34, height: 12), size: 9, color: NSColor(calibratedRed: 0.059, green: 0.463, blue: 0.431, alpha: 1), bold: true))
  return cell
}

@MainActor
private func orderRow(_ left: String, _ right: String, y: CGFloat, width: CGFloat, bold: Bool = false) -> NSView {
  let row = NSView(frame: NSRect(x: 10, y: y, width: width - 20, height: 15))
  row.addSubview(label(left, frame: NSRect(x: 0, y: 0, width: width - 80, height: 15), size: 11, color: dark, bold: bold))
  row.addSubview(label(right, frame: NSRect(x: width - 82, y: 0, width: 60, height: 15), size: 11, color: dark, bold: true))
  return row
}

@MainActor
private func shell(_ frame: NSRect, padding: CGFloat = 10) -> NSView {
  let view = NSView(frame: frame)
  view.wantsLayer = true
  view.layer?.backgroundColor = NSColor.white.cgColor
  view.layer?.cornerRadius = 10
  view.layer?.borderColor = NSColor(calibratedRed: 0.859, green: 0.89, blue: 0.937, alpha: 1).cgColor
  view.layer?.borderWidth = 1
  return view
}

@MainActor
private func label(_ value: String, frame: NSRect, size: CGFloat, color: NSColor, bold: Bool) -> NSTextField {
  let field = NSTextField(labelWithString: value)
  field.frame = frame
  field.font = bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
  field.textColor = color
  field.lineBreakMode = .byTruncatingTail
  field.identifier = NSUserInterfaceItemIdentifier(value.lowercased().replacingOccurrences(of: " ", with: "-"))
  return field
}

private let dark = NSColor(calibratedRed: 0.067, green: 0.094, blue: 0.153, alpha: 1)
private let muted = NSColor(calibratedRed: 0.278, green: 0.333, blue: 0.412, alpha: 1)
