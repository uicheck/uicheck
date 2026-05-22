import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:uicheck_flutter/uicheck_flutter.dart';

import '../../../examples/flutter-demo/lib/main.dart';

void main() {
  testWidgets('inspects the real Flutter example demo', (tester) async {
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
    expect(inspected, containsPair('platform', 'flutter'));
    expect(inspected['count'] as int, greaterThan(10));
    final inspectedJson = prettyJson(inspected);
    expect(inspectedJson, contains('Runtime check 34'));
    expect(inspectedJson, contains('Submit order'));

    final searched = client.inspectElements({'text': 'Submit order'});
    expect(searched['count'] as int, greaterThanOrEqualTo(1));
    final searchedJson = prettyJson(searched);
    expect(searchedJson, contains('Submit order'));
    expect(searchedJson, isNot(contains('Runtime check 34')));
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
