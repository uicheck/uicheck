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
    this.width,
    this.height,
  });

  final String mimeType;
  final String base64;
  final int? width;
  final int? height;

  Map<String, Object?> toJson() => {
        'width': width,
        'height': height,
        'mimeType': mimeType,
        'base64': base64,
      };
}

class UiCheckFlutterOptions {
  const UiCheckFlutterOptions({
    this.socket,
    this.screenshot,
  });

  final UiCheckSocketOptions? socket;
  final UiCheckScreenshotProvider? screenshot;
}

class UiCheckFlutterElementInfo {
  const UiCheckFlutterElementInfo({
    required this.tag,
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
    final includeHidden = params['includeHidden'] == true;
    final limit = _clampLimit(params['limit']);
    final elements = _collectRenderElements()
        .where((element) => includeHidden || element.visible)
        .take(limit)
        .map((element) => element.toJson())
        .toList();

    return {
      'platform': 'flutter',
      'viewport': _viewportInfo().toJson(),
      'count': elements.length,
      'tree': _createElementTree(elements),
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

UiCheckFlutterClient initUiCheck([UiCheckFlutterOptions options = const UiCheckFlutterOptions()]) {
  final client = UiCheckFlutterClient(options: options);
  client.connect();
  return client;
}

Future<UiCheckScreenshotResult> captureRepaintBoundaryAsPng({
  required GlobalKey repaintBoundaryKey,
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
    width: image.width,
    height: image.height,
    mimeType: 'image/png',
    base64: base64Encode(bytes),
  );
}

List<UiCheckFlutterElementInfo> _collectRenderElements() {
  final root = RendererBinding.instance.renderViews.firstOrNull;
  if (root == null) return const [];
  final elements = <UiCheckFlutterElementInfo>[];

  void visit(RenderObject object) {
    final element = _normalizeRenderObject(object);
    if (element != null) elements.add(element);
    object.visitChildren(visit);
  }

  visit(root);
  return elements;
}

UiCheckFlutterElementInfo? _normalizeRenderObject(RenderObject renderObject) {
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
  final visible = renderObject.attached && size.width > 0 && size.height > 0;
  final text = _renderObjectText(renderObject);
  final tag = renderObject.runtimeType.toString();

  return UiCheckFlutterElementInfo(
    tag: tag,
    classes: <String>[tag],
    text: _compactText(text),
    semanticsLabel: _compactText(text),
    visible: visible,
    box: box,
  );
}

String? _renderObjectText(RenderObject renderObject) {
  if (renderObject is RenderParagraph) return renderObject.text.toPlainText();
  return null;
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

List<Map<String, Object?>> _createElementTree(List<Map<String, Object?>> elements) {
  final boxes = elements.map((element) => _normalizeTreeBox(element['box'])).toList();
  final parents = List<int?>.generate(elements.length, (index) => _findTreeParent(index, boxes));
  final nodes = elements.map((element) => <String, Object?>{...element, 'children': <Map<String, Object?>>[]}).toList();
  final roots = <Map<String, Object?>>[];

  for (var index = 0; index < nodes.length; index++) {
    final parent = parents[index];
    if (parent == null) {
      roots.add(nodes[index]);
    } else {
      (nodes[parent]['children'] as List<Map<String, Object?>>).add(nodes[index]);
    }
  }

  return roots;
}

_TreeBox? _normalizeTreeBox(Object? raw) {
  if (raw is! Map) return null;
  final width = _numValue(raw['width']);
  final height = _numValue(raw['height']);
  if (width == null || height == null || width <= 0 || height <= 0) return null;
  final x = _numValue(raw['x']) ?? _numValue(raw['left']) ?? 0;
  final y = _numValue(raw['y']) ?? _numValue(raw['top']) ?? 0;
  return _TreeBox(x, y, width, height);
}

int? _findTreeParent(int index, List<_TreeBox?> boxes) {
  final child = boxes[index];
  if (child == null) return null;
  int? parentIndex;
  var parentArea = double.infinity;
  for (var candidateIndex = 0; candidateIndex < boxes.length; candidateIndex++) {
    if (candidateIndex == index) continue;
    final candidate = boxes[candidateIndex];
    if (candidate == null || candidate.area <= child.area || !candidate.contains(child)) continue;
    if (candidate.area < parentArea) {
      parentArea = candidate.area;
      parentIndex = candidateIndex;
    }
  }
  return parentIndex;
}

double? _numValue(Object? value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

class _TreeBox {
  const _TreeBox(this.x, this.y, this.width, this.height);

  final double x;
  final double y;
  final double width;
  final double height;

  double get area => width * height;

  bool contains(_TreeBox child) {
    return child.x >= x && child.y >= y && child.x + child.width <= x + width && child.y + child.height <= y + height;
  }
}

String _appendClientId(String rawUrl, String? clientId) {
  if (clientId == null || clientId.isEmpty) return rawUrl;
  final joiner = rawUrl.contains('?') ? '&' : '?';
  return '$rawUrl${joiner}clientId=${Uri.encodeComponent(clientId)}';
}
