import 'package:flutter/material.dart';
import 'package:uicheck_flutter/uicheck_flutter.dart';

void main() {
  runApp(const UiCheckFlutterDemoApp());
}

class UiCheckFlutterDemoApp extends StatefulWidget {
  const UiCheckFlutterDemoApp({super.key, this.boundaryKey});

  final GlobalKey? boundaryKey;

  @override
  State<UiCheckFlutterDemoApp> createState() => _UiCheckFlutterDemoAppState();
}

class _UiCheckFlutterDemoAppState extends State<UiCheckFlutterDemoApp> {
  static const socketUrl = String.fromEnvironment('UICHECK_SOCKET_URL');
  final fallbackBoundaryKey = GlobalKey();
  UiCheckFlutterClient? client;

  GlobalKey get boundaryKey => widget.boundaryKey ?? fallbackBoundaryKey;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (socketUrl.isEmpty) return;
      client = initUiCheck(
        UiCheckFlutterOptions(
          socket: const UiCheckSocketOptions(
            url: socketUrl,
            clientId: 'flutter-demo',
            reconnectMs: 500,
          ),
          screenshot: (_) => captureRepaintBoundaryAsPng(
            repaintBoundaryKey: boundaryKey,
            pixelRatio: 1,
          ),
        ),
      );
    });
  }

  @override
  void dispose() {
    client?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: RepaintBoundary(
        key: boundaryKey,
        child: Scaffold(
          backgroundColor: const Color(0xfff8fafc),
          body: SafeArea(
            child: Column(
              children: [
                const _Header(platform: 'flutter'),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      children: [
                        const _Card(
                          title: 'Registered ref summary',
                          text: 'MCP reads runtime boxes, text, testID and labels.',
                        ),
                        const SizedBox(height: 8),
                        const _OrderCard(),
                        const SizedBox(height: 8),
                        const _Card(
                          title: 'Ready for MCP inspection',
                          text: 'This real demo has 100+ inspectable nodes.',
                        ),
                        const SizedBox(height: 8),
                        const _DetailsPanel(),
                        const SizedBox(height: 8),
                        const _Hint(),
                        const Spacer(),
                        SizedBox(
                          height: 40,
                          width: double.infinity,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: const Color(0xffa855f7),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Center(
                              child: Text(
                                'Submit order',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.platform});

  final String platform;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xff111827),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('UICheck Flutter', style: TextStyle(color: Color(0xff93c5fd), fontSize: 13, fontWeight: FontWeight.w700)),
              SizedBox(height: 4),
              Text('Checkout screen', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white38),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(platform, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.text});

  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xffdbe3ef)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Color(0xff111827), fontSize: 13, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(text, style: const TextStyle(color: Color(0xff475569), fontSize: 11, height: 1.35)),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard();

  @override
  Widget build(BuildContext context) {
    return const _CardShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Order items', style: TextStyle(color: Color(0xff111827), fontSize: 13, fontWeight: FontWeight.w900)),
          SizedBox(height: 4),
          _OrderRow(label: 'Starter license', value: '\$19'),
          _OrderRow(label: 'Team add-on', value: '\$8'),
          _OrderRow(label: 'Total', value: '\$27', strong: true),
        ],
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.label, required this.value, this.strong = false});

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      color: const Color(0xff111827),
      fontSize: 11,
      fontWeight: strong ? FontWeight.w900 : FontWeight.w600,
      height: 1.35,
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(value, style: style),
      ],
    );
  }
}

class _DetailsPanel extends StatelessWidget {
  const _DetailsPanel();

  @override
  Widget build(BuildContext context) {
    final rows = List.generate(34, (index) {
      final number = index + 1;
      final padded = number.toString().padLeft(2, '0');
      return (label: 'Runtime check $padded', value: number % 3 == 0 ? 'ok' : number % 3 == 1 ? 'warn' : 'trace');
    });

    return _CardShell(
      height: 370,
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Runtime detail matrix', style: TextStyle(color: Color(0xff111827), fontSize: 13, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Wrap(
            spacing: 6,
            runSpacing: 3,
            children: rows
                .map(
                  (row) => Container(
                    width: 166,
                    height: 16,
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xfff8fafc),
                      border: Border.all(color: const Color(0xffe2e8f0)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(row.label, style: const TextStyle(color: Color(0xff334155), fontSize: 9, height: 1)),
                        Text(row.value, style: const TextStyle(color: Color(0xff0f766e), fontSize: 9, fontWeight: FontWeight.w900, height: 1)),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _Hint extends StatelessWidget {
  const _Hint();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 34),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: const Color(0xffecfeff), borderRadius: BorderRadius.circular(12)),
      child: const Text(
        'MCP can inspect all elements or a selected target.',
        style: TextStyle(color: Color(0xff0f766e), fontSize: 11, fontWeight: FontWeight.w800, height: 1.3),
      ),
    );
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({required this.child, this.height, this.padding = const EdgeInsets.all(10)});

  final Widget child;
  final double? height;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: height,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xffdbe3ef)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: child,
    );
  }
}
