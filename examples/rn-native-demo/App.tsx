import React, {useRef} from 'react';
import {
  LogBox,
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {initUiCheck} from '@uicheck/rn';
import {rnDemoRows, rnDemoText} from './uicheck-demo-model';

LogBox.ignoreAllLogs(true);

interface UicheckScreenshotNativeModule {
  capture(): Promise<{
    base64: string;
    width: number;
    height: number;
  }>;
}

const UicheckScreenshot = NativeModules.UicheckScreenshot as
  | UicheckScreenshotNativeModule
  | undefined;
const isTestRuntime =
  (globalThis as {process?: {env?: {NODE_ENV?: string}}}).process?.env
    ?.NODE_ENV === 'test';
const socketUrl =
  !isTestRuntime && (globalThis as {__DEV__?: boolean}).__DEV__ !== false
    ? Platform.OS === 'android'
      ? 'ws://10.0.2.2:17322/socket'
      : 'ws://127.0.0.1:17322/socket'
    : '';
if (socketUrl) {
  initUiCheck({
    socket: {
      url: socketUrl,
      clientId: 'rn-native-demo',
      reconnectMs: 500,
    },
    screenshot: async () => {
      if (!UicheckScreenshot) {
        throw new Error('UicheckScreenshot native module is not available');
      }
      const screenshot = await UicheckScreenshot.capture();
      return {
        width: screenshot.width,
        height: screenshot.height,
        mimeType: 'image/png',
        base64: screenshot.base64,
      };
    },
  });
}

function App() {
  const rootRef = useRef<View>(null);
  const titleRef = useRef<Text>(null);
  const cardRef = useRef<View>(null);
  const statusRef = useRef<View>(null);
  const submitRef = useRef<View>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View
        ref={rootRef}
        collapsable={false}
        nativeID="screen"
        accessibilityLabel="Checkout screen"
        style={styles.screen}>
          <View style={styles.header}>
            <View>
            <Text nativeID="eyebrow" style={styles.eyebrow}>{rnDemoText.eyebrow}</Text>
            <Text
              ref={titleRef}
              nativeID="title"
              accessibilityLabel="Checkout screen"
              style={styles.title}>
              {rnDemoText.title}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Platform.OS}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View
            ref={cardRef}
            collapsable={false}
            nativeID="summary-card"
            accessibilityLabel={rnDemoText.summaryTitle}
            style={styles.card}>
            <Text style={styles.cardTitle}>{rnDemoText.summaryTitle}</Text>
            <Text style={styles.cardText}>{rnDemoText.summaryText}</Text>
          </View>

          <View
            collapsable={false}
            nativeID="items-card"
            accessibilityLabel={rnDemoText.itemsTitle}
            style={styles.card}>
            <Text nativeID="items-title" style={styles.cardTitle}>{rnDemoText.itemsTitle}</Text>
            <View nativeID="item-row-1" style={styles.row}>
              <Text style={styles.rowLabel}>{rnDemoText.starterLicense}</Text>
              <Text style={styles.rowValue}>$19</Text>
            </View>
            <View nativeID="item-row-2" style={styles.row}>
              <Text style={styles.rowLabel}>{rnDemoText.teamAddon}</Text>
              <Text style={styles.rowValue}>$8</Text>
            </View>
            <View nativeID="total-row" style={[styles.row, styles.totalRow]}>
              <Text style={styles.totalLabel}>{rnDemoText.total}</Text>
              <Text style={styles.totalLabel}>$27</Text>
            </View>
          </View>

          <View
            ref={statusRef}
            collapsable={false}
            nativeID="status-card"
            accessibilityLabel={rnDemoText.statusTitle}
            style={styles.card}>
            <Text style={styles.cardTitle}>{rnDemoText.statusTitle}</Text>
            <Text style={styles.cardText}>{rnDemoText.statusText}</Text>
          </View>

          <View
            collapsable={false}
            nativeID="details-panel"
            accessibilityLabel={rnDemoText.detailsTitle}
            style={styles.detailsPanel}>
            <Text nativeID="details-title" style={styles.detailsTitle}>
              {rnDemoText.detailsTitle}
            </Text>
            <View nativeID="details-grid" style={styles.detailsGrid}>
              {rnDemoRows.map(row => (
                <View
                  key={row.id}
                  collapsable={false}
                  nativeID={row.id}
                  accessibilityLabel={`${row.text} ${row.value}`}
                  style={styles.detailRow}>
                  <Text nativeID={row.labelId} style={styles.detailLabel}>
                    {row.text}
                  </Text>
                  <Text nativeID={row.valueId} style={styles.detailValue}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Text nativeID="hint-banner" style={styles.hint}>
            {rnDemoText.hint}
          </Text>

          <Pressable
            ref={submitRef}
            collapsable={false}
            testID="submit-button"
            accessibilityLabel={rnDemoText.submit}
            style={({pressed}) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}>
            <Text nativeID="submit-label" style={styles.buttonText}>{rnDemoText.submit}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef4ff',
  },
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 2,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardText: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 15,
  },
  row: {
    minHeight: 15,
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#334155',
    fontSize: 11,
  },
  rowValue: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '900',
  },
  detailsPanel: {
    height: 370,
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe3ef',
  },
  detailsTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 3,
  },
  detailRow: {
    width: '48.9%',
    minHeight: 16,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#334155',
    fontSize: 9,
    lineHeight: 13,
  },
  detailValue: {
    color: '#0f766e',
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '800',
  },
  hint: {
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#ecfeff',
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '800',
  },
  button: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default App;
