import React, {useRef} from 'react';
import * as JSXRuntime from 'react/jsx-runtime';
import {
  AppState,
  Dimensions,
  LogBox,
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View,
  findNodeHandle,
} from 'react-native';
import {installReactNativeUiCheck} from '@uicheck/rn';

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

installReactNativeUiCheck(
  {
    AppState,
    Dimensions,
    Platform,
    UIManager,
    findNodeHandle,
    WebSocket,
  },
  {
    React,
    jsxRuntime: JSXRuntime,
    autoRegister: true,
    title: 'UICheck RN Native Demo',
    route: 'rn-native-demo://checkout',
    platform: Platform.OS,
    socket: {
      enabled: true,
      url: Platform.OS === 'android' ? 'ws://10.0.2.2:17322/socket' : 'ws://127.0.0.1:17322/socket',
      clientId: 'rn-native-demo',
      reconnectMs: 500,
    },
    screenshot: async () => {
      if (!UicheckScreenshot) {
        throw new Error('UicheckScreenshot native module is not available');
      }
      const screenshot = await UicheckScreenshot.capture();
      return {
        title: 'UICheck RN Native Demo',
        url: 'rn-native-demo://checkout',
        width: screenshot.width,
        height: screenshot.height,
        mimeType: 'image/png',
        base64: screenshot.base64,
      };
    },
  },
);

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
            <Text style={styles.eyebrow}>UICheck RN</Text>
            <Text
              ref={titleRef}
              collapsable={false}
              nativeID="title"
              accessibilityLabel="Checkout screen"
              style={styles.title}>
              Checkout screen
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
            accessibilityLabel="Registered ref summary"
            style={styles.card}>
            <Text style={styles.cardTitle}>Registered ref summary</Text>
            <Text style={styles.cardText}>
              Native components are registered with @uicheck/rn so MCP can read
              layout boxes, text, testID and accessibility labels.
            </Text>
          </View>

          <View
            ref={statusRef}
            collapsable={false}
            nativeID="status-card"
            accessibilityLabel="Ready for MCP inspection"
            style={styles.card}>
            <Text style={styles.cardTitle}>Ready for MCP inspection</Text>
            <Text style={styles.cardText}>
              This is a real React Native app, not an HTML preview.
            </Text>
          </View>

          <Pressable
            ref={submitRef}
            collapsable={false}
            testID="submit-button"
            accessibilityLabel="Submit order"
            style={({pressed}) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}>
            <Text style={styles.buttonText}>Submit order</Text>
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
    paddingVertical: 20,
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
    fontSize: 28,
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
    padding: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
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
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    height: 54,
    borderRadius: 14,
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
