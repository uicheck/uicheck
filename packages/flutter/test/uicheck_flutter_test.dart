import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:uicheck_flutter/uicheck_flutter.dart';

void main() {
  testWidgets('inspects registered Flutter widgets and finds elements at a point', (tester) async {
    final buttonKey = GlobalKey();
    final unregister = registerFlutterUiCheckElement(
      UiCheckFlutterElementRegistration(
        key: buttonKey,
        tag: 'GestureDetector',
        testID: 'submit-button',
        text: 'Submit',
        semanticsLabel: 'Submit order',
        dataset: const {'role': 'primary-action'},
      ),
    );

    addTearDown(unregister);

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: Align(
          alignment: Alignment.topLeft,
          child: SizedBox(
            key: buttonKey,
            width: 120,
            height: 44,
            child: const Text('Submit'),
          ),
        ),
      ),
    );

    final client = UiCheckFlutterClient(
      options: const UiCheckFlutterOptions(
        title: 'Flutter integration',
        route: '/home',
      ),
    );

    final inspected = client.inspectElements({'selector': 'submit-button'});
    expect(inspected, containsPair('platform', 'flutter'));
    expect(inspected, containsPair('url', '/home'));
    expect(inspected, containsPair('title', 'Flutter integration'));
    expect(inspected, containsPair('count', 1));
    expect(inspected['elements'], [
      isA<Map<String, Object?>>()
          .having((item) => item['tag'], 'tag', 'GestureDetector')
          .having((item) => item['selector'], 'selector', '[testID="submit-button"]')
          .having((item) => item['testID'], 'testID', 'submit-button')
          .having((item) => item['semanticsLabel'], 'semanticsLabel', 'Submit order')
          .having((item) => item['text'], 'text', 'Submit')
          .having((item) => item['visible'], 'visible', true)
          .having((item) => item['dataset'], 'dataset', {'role': 'primary-action'})
          .having((item) => item['box'], 'box', containsPair('width', 120))
          .having((item) => item['box'], 'box', containsPair('height', 44)),
    ]);

    final atPoint = client.getElementAtPoint({'x': 10, 'y': 10});
    expect(atPoint['element'], isA<Map<String, Object?>>().having((item) => item['selector'], 'selector', '[testID="submit-button"]'));
  });
}
