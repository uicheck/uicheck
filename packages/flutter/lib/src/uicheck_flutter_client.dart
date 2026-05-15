import 'dart:async';
import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

typedef UiCheckScreenshotProvider = FutureOr<UiCheckScreenshotResult> Function(Map<String, Object?> params);

class UiCheckSocketOptions {
  const UiCheckSocketOptions({
    this.url,
    this.clientId,
    this.reconnectMs = 1000,
    this.enabled = true,
  });

  final String? url;
  final String? clientId;
  final int reconnectMs;
  final bool enabled;
}

class UiCheckViewportInfo {
  const UiCheckViewportInfo({
    required this.width,
    required this.height,
    required this.devicePixelRatio,
    this.scrollX = 0,
    this.scrollY = 0,
  });

  final int width;
  final int height;
  final double devicePixelRatio;
  final int scrollX;
  final int scrollY;

  Map<String, Object?> toJson() => {
        'width': width,
        'height': height,
        'devicePixelRatio': devicePixelRatio,
        'scrollX': scrollX,
        'scrollY': scrollY,
      };
}

class UiCheckScreenshotResult {
  const UiCheckScreenshotResult({
    required this.mimeType,
    required this.base64,
    this.url,
    this.title,
    this.width,
    this.height,
  });

  final String mimeType;
  final String base64;
  final String? url;
  final String? title;
  final int? width;
  final int? height;

  Map<String, Object?> toJson() => {
        'url': url,
        'title': title,
        'width': width,
        'height': height,
        'mimeType': mimeType,
        'base64': base64,
      };
}

class UiCheckFlutterOptions {
  const UiCheckFlutterOptions({
    this.socket,
    this.title,
    this.route,
    this.screenshot,
  });

  final UiCheckSocketOptions? socket;
  final String? title;
  final String? route;
  final UiCheckScreenshotProvider? screenshot;
}

class UiCheckFlutterElementRegistration {
  const UiCheckFlutterElementRegistration({
    required this.key,
    this.id,
    this.tag,
    this.selector,
    this.testID,
    this.text,
    this.semanticsLabel,
    this.className,
    this.visible = true,
    this.dataset,
  });

  final GlobalKey key;
  final String? id;
  final String? tag;
  final String? selector;
  final String? testID;
  final String? text;
  final String? semanticsLabel;
  final String? className;
  final bool visible;
  final Map<String, Object?>? dataset;
}

class UiCheckFlutterElementInfo {
  const UiCheckFlutterElementInfo({
    required this.tag,
    required this.selector,
    required this.classes,
    required this.visible,
    required this.box,
    this.id,
    this.testID,
    this.semanticsLabel,
    this.text,
    this.dataset,
  });

  final String tag;
  final String selector;
  final String? id;
  final String? testID;
  final String? semanticsLabel;
  final List<String> classes;
  final String? text;
  final bool visible;
  final Map<String, num> box;
  final Map<String, Object?>? dataset;

  Map<String, Object?> toJson() => {
        'tag': tag,
        'selector': selector,
        'id': id,
        'testID': testID,
        'semanticsLabel': semanticsLabel,
        'classes': classes,
        'text': text,
        'visible': visible,
        'box': box,
        'dataset': dataset,
      };
}

class UiCheckFlutterClient with WidgetsBindingObserver {
  UiCheckFlutterClient({
    UiCheckFlutterOptions options = const UiCheckFlutterOptions(),
    WebSocketChannel Function(Uri uri)? connectSocket,
  })  : _options = options,
        _connectSocket = connectSocket ?? WebSocketChannel.connect;

  final UiCheckFlutterOptions _options;
  final WebSocketChannel Function(Uri uri) _connectSocket;
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;
  bool _closed = false;

  static int _nextUid = 1;
  static final Set<_RegisteredFlutterElement> _registry = <_RegisteredFlutterElement>{};

  static VoidCallback registerElement(UiCheckFlutterElementRegistration registration) {
    final item = _RegisteredFlutterElement(registration, _nextUid++);
    _registry.add(item);
    return () => _registry.remove(item);
  }

  void connect() {
    final socket = _options.socket;
    if (socket == null || socket.enabled == false || socket.url == null || socket.url!.isEmpty) return;
    _closed = false;
    WidgetsBinding.instance.addObserver(this);
    _openSocket();
  }

  void dispose() {
    _closed = true;
    WidgetsBinding.instance.removeObserver(this);
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _sendClientInfo('update');
    }
  }

  @override
  void didChangeMetrics() {
    _sendClientInfo('update');
  }

  void _openSocket() {
    if (_closed) return;
    final socket = _options.socket;
    if (socket == null || socket.url == null) return;

    _subscription?.cancel();
    _channel?.sink.close();
    final uri = Uri.parse(_appendClientId(socket.url!, socket.clientId));
    final channel = _connectSocket(uri);
    _channel = channel;
    _subscription = channel.stream.listen(
      _handleSocketMessage,
      onDone: _scheduleReconnect,
      onError: (_) => _scheduleReconnect(),
      cancelOnError: true,
    );
    _sendClientInfo('hello');
  }

  void _scheduleReconnect() {
    if (_closed) return;
    _reconnectTimer?.cancel();
    final reconnectMs = _options.socket?.reconnectMs ?? 1000;
    _reconnectTimer = Timer(Duration(milliseconds: reconnectMs), _openSocket);
  }

  void _send(Object? value) {
    _channel?.sink.add(jsonEncode(value));
  }

  void _sendClientInfo(String type) {
    _send({
      'type': type,
      ..._clientInfo(),
    });
  }

  Map<String, Object?> _clientInfo() => {
        'url': _options.route,
        'title': _options.title,
        'userAgent': 'flutter',
        'viewport': _viewportInfo().toJson(),
      };

  void _handleSocketMessage(dynamic raw) {
    unawaited(_handleRequest(raw));
  }

  Future<void> _handleRequest(dynamic raw) async {
    final dynamic decoded;
    try {
      decoded = jsonDecode(raw.toString());
    } catch (_) {
      return;
    }
    if (decoded is! Map<String, dynamic>) return;
    if (decoded['type'] != 'request' || decoded['id'] is! String) return;

    final id = decoded['id'] as String;
    final method = decoded['method'];
    final params = decoded['params'] is Map<String, dynamic> ? decoded['params'] as Map<String, dynamic> : <String, dynamic>{};

    try {
      final result = await _callTool(method, params);
      _send({'type': 'response', 'id': id, 'result': result});
    } catch (error) {
      _send({'type': 'response', 'id': id, 'error': error.toString()});
    }
  }

  Future<Object?> _callTool(Object? method, Map<String, Object?> params) async {
    if (method == 'capture_page') return (await _capturePage(params)).toJson();
    if (method == 'inspect_elements') return inspectElements(params);
    if (method == 'get_element_at_point') return getElementAtPoint(params);
    throw StateError('Unknown uicheck method: $method');
  }

  Future<UiCheckScreenshotResult> _capturePage(Map<String, Object?> params) async {
    final screenshot = _options.screenshot;
    if (screenshot == null) {
      throw StateError('capture_page requires a Flutter screenshot option');
    }
    return screenshot(params);
  }

  Map<String, Object?> inspectElements([Map<String, Object?> params = const {}]) {
    final selector = params['selector'] is String ? params['selector'] as String : '*';
    final includeHidden = params['includeHidden'] == true;
    final limit = _clampLimit(params['limit']);
    final elements = _registry
        .where((item) => _matchesSelector(item, selector))
        .map(_normalizeElement)
        .whereType<UiCheckFlutterElementInfo>()
        .where((element) => includeHidden || element.visible)
        .take(limit)
        .map((element) => element.toJson())
        .toList();

    return {
      'platform': 'flutter',
      'url': _options.route,
      'title': _options.title,
      'viewport': _viewportInfo().toJson(),
      'count': elements.length,
      'elements': elements,
    };
  }

  Map<String, Object?> getElementAtPoint([Map<String, Object?> params = const {}]) {
    final x = params['x'] is num ? (params['x'] as num).toDouble() : 0.0;
    final y = params['y'] is num ? (params['y'] as num).toDouble() : 0.0;
    final result = inspectElements({
      'selector': params['selector'],
      'includeHidden': false,
      'limit': 500,
    });
    final elements = (result['elements'] as List<Object?>)
        .whereType<Map<String, Object?>>()
        .where((element) => _containsPoint(element, x, y))
        .toList()
      ..sort((a, b) => _boxArea(a).compareTo(_boxArea(b)));

    return {
      'platform': 'flutter',
      'url': _options.route,
      'title': _options.title,
      'viewport': result['viewport'],
      'point': {'x': x, 'y': y},
      'element': elements.isEmpty ? null : elements.first,
      'ancestors': <Object?>[],
    };
  }

  UiCheckViewportInfo _viewportInfo() {
    final view = WidgetsBinding.instance.platformDispatcher.views.firstOrNull;
    if (view == null) {
      return const UiCheckViewportInfo(width: 0, height: 0, devicePixelRatio: 1);
    }
    final size = view.physicalSize / view.devicePixelRatio;
    return UiCheckViewportInfo(
      width: size.width.round(),
      height: size.height.round(),
      devicePixelRatio: view.devicePixelRatio,
    );
  }
}

UiCheckFlutterClient installFlutterUiCheck({
  UiCheckFlutterOptions options = const UiCheckFlutterOptions(),
  WebSocketChannel Function(Uri uri)? connectSocket,
}) {
  final client = UiCheckFlutterClient(options: options, connectSocket: connectSocket);
  client.connect();
  return client;
}

VoidCallback registerFlutterUiCheckElement(UiCheckFlutterElementRegistration registration) {
  return UiCheckFlutterClient.registerElement(registration);
}

Future<UiCheckScreenshotResult> captureRepaintBoundaryAsPng({
  required GlobalKey repaintBoundaryKey,
  String? url,
  String? title,
  double? pixelRatio,
}) async {
  final context = repaintBoundaryKey.currentContext;
  final renderObject = context?.findRenderObject();
  if (renderObject is! RenderRepaintBoundary) {
    throw StateError('repaintBoundaryKey must reference a RepaintBoundary');
  }

  final image = await renderObject.toImage(pixelRatio: pixelRatio ?? ui.PlatformDispatcher.instance.views.first.devicePixelRatio);
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  if (byteData == null) throw StateError('Unable to encode RepaintBoundary image');
  final bytes = byteData.buffer.asUint8List();
  return UiCheckScreenshotResult(
    url: url,
    title: title,
    width: image.width,
    height: image.height,
    mimeType: 'image/png',
    base64: base64Encode(bytes),
  );
}

class _RegisteredFlutterElement {
  const _RegisteredFlutterElement(this.registration, this.uid);

  final UiCheckFlutterElementRegistration registration;
  final int uid;
}

UiCheckFlutterElementInfo? _normalizeElement(_RegisteredFlutterElement item) {
  final registration = item.registration;
  final context = registration.key.currentContext;
  final renderObject = context?.findRenderObject();
  if (renderObject is! RenderBox || !renderObject.hasSize) return null;

  final offset = renderObject.localToGlobal(Offset.zero);
  final size = renderObject.size;
  final box = {
    'x': offset.dx.round(),
    'y': offset.dy.round(),
    'width': size.width.round(),
    'height': size.height.round(),
    'top': offset.dy.round(),
    'left': offset.dx.round(),
  };
  final visible = registration.visible && size.width > 0 && size.height > 0;

  return UiCheckFlutterElementInfo(
    tag: registration.tag ?? 'Widget',
    selector: _createSelector(item),
    id: registration.id,
    testID: registration.testID,
    semanticsLabel: registration.semanticsLabel,
    classes: _toClasses(registration.className),
    text: _compactText(registration.text ?? registration.semanticsLabel),
    visible: visible,
    box: box,
    dataset: registration.dataset,
  );
}

String _createSelector(_RegisteredFlutterElement item) {
  final registration = item.registration;
  if (registration.selector != null && registration.selector!.isNotEmpty) return registration.selector!;
  if (registration.id != null && registration.id!.isNotEmpty) return '#${registration.id}';
  if (registration.testID != null && registration.testID!.isNotEmpty) return '[testID="${registration.testID}"]';
  if (registration.semanticsLabel != null && registration.semanticsLabel!.isNotEmpty) {
    return '[semanticsLabel="${registration.semanticsLabel}"]';
  }
  return '${registration.tag ?? 'Widget'}:registered(${item.uid})';
}

bool _matchesSelector(_RegisteredFlutterElement item, String selector) {
  final registration = item.registration;
  if (selector.isEmpty || selector == '*') return true;
  return registration.selector == selector ||
      registration.id == selector.replaceFirst(RegExp(r'^#'), '') ||
      registration.testID == selector ||
      registration.tag == selector ||
      _createSelector(item) == selector;
}

bool _containsPoint(Map<String, Object?> element, double x, double y) {
  final box = element['box'];
  if (box is! Map<String, Object?>) return false;
  final left = (box['x'] as num?)?.toDouble() ?? 0;
  final top = (box['y'] as num?)?.toDouble() ?? 0;
  final width = (box['width'] as num?)?.toDouble() ?? 0;
  final height = (box['height'] as num?)?.toDouble() ?? 0;
  return x >= left && x <= left + width && y >= top && y <= top + height;
}

double _boxArea(Map<String, Object?> element) {
  final box = element['box'];
  if (box is! Map<String, Object?>) return 0;
  final width = (box['width'] as num?)?.toDouble() ?? 0;
  final height = (box['height'] as num?)?.toDouble() ?? 0;
  return width * height;
}

int _clampLimit(Object? value) {
  if (value is num) return value.floor().clamp(1, 500).toInt();
  return 80;
}

String? _compactText(String? value) {
  final text = value?.replaceAll(RegExp(r'\s+'), ' ').trim();
  if (text == null || text.isEmpty) return null;
  return text.length > 160 ? '${text.substring(0, 157)}...' : text;
}

List<String> _toClasses(String? className) {
  if (className == null || className.trim().isEmpty) return const [];
  return className.split(RegExp(r'\s+')).where((part) => part.isNotEmpty).toList();
}

String _appendClientId(String rawUrl, String? clientId) {
  if (clientId == null || clientId.isEmpty) return rawUrl;
  final joiner = rawUrl.contains('?') ? '&' : '?';
  return '$rawUrl${joiner}clientId=${Uri.encodeComponent(clientId)}';
}
