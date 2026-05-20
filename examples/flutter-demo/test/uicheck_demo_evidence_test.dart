import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:uicheck_flutter/uicheck_flutter.dart';
import 'package:uicheck_flutter_demo/main.dart';

void main() {
  testWidgets('captures the real Flutter demo with UiCheck', (tester) async {
    await loadRobotoFont();
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final boundaryKey = GlobalKey();
    await tester.pumpWidget(UiCheckFlutterDemoApp(boundaryKey: boundaryKey));
    await tester.pump(const Duration(milliseconds: 100));

    final client = UiCheckFlutterClient();
    final inspected = client.inspectElements({'limit': 500});
    final inspectedJson = prettyJson(inspected);
    expect(inspectedJson, contains('Runtime check 34'));
    expect(inspectedJson, contains('Submit order'));
    writeTextArtifact('flutter-demo-inspect-elements.snapshot.json', inspectedJson);

    final screenshot = (await tester.runAsync(
      () => captureRepaintBoundaryAsPng(
        repaintBoundaryKey: boundaryKey,
        pixelRatio: 1,
      ),
    ))!;
    expect(screenshot.width, 390);
    expect(screenshot.height, 844);
    writePngArtifact('flutter-example-demo.png', screenshot.base64);
  });
}

Future<void> loadRobotoFont() async {
  final root = Platform.environment['FLUTTER_ROOT'] ?? flutterRootFromDartExecutable();
  final regular = File('$root/bin/cache/artifacts/material_fonts/Roboto-Regular.ttf');
  final bold = File('$root/bin/cache/artifacts/material_fonts/Roboto-Bold.ttf');
  if (!regular.existsSync() || !bold.existsSync()) return;

  final loader = FontLoader('Roboto')
    ..addFont(Future.value(ByteData.sublistView(regular.readAsBytesSync())))
    ..addFont(Future.value(ByteData.sublistView(bold.readAsBytesSync())));
  await loader.load();
}

String flutterRootFromDartExecutable() {
  var dir = File(Platform.resolvedExecutable).parent;
  while (dir.path != dir.parent.path) {
    final candidate = Directory('${dir.path}/artifacts/material_fonts');
    if (candidate.existsSync()) return dir.parent.parent.path;
    dir = dir.parent;
  }
  return '';
}

String prettyJson(Object? value) => const JsonEncoder.withIndent('  ').convert(value);

void writeTextArtifact(String fileName, String value) {
  final file = File('build/uicheck-test-artifacts/$fileName');
  file.parent.createSync(recursive: true);
  file.writeAsStringSync('$value\n');
}

void writePngArtifact(String fileName, String base64) {
  final file = File('build/uicheck-test-artifacts/$fileName');
  file.parent.createSync(recursive: true);
  file.writeAsBytesSync(base64Decode(base64));
}
