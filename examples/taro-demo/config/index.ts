import { defineConfig, type UserConfigExport } from '@tarojs/cli'

export default defineConfig(async () => {
  const config: UserConfigExport = {
    projectName: 'uicheck-taro-demo',
    date: '2026-05-18',
    designWidth: 375,
    deviceRatio: {
      375: 2,
      640: 1.17,
      750: 1,
      828: 0.905
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: ['@tarojs/plugin-framework-react'],
    framework: 'react',
    compiler: 'webpack5',
    mini: {},
    mini: {},
    h5: {}
  }

  return config
})
