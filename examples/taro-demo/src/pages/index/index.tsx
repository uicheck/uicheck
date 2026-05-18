import { useEffect } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { installTaroUiCheck } from '@uicheck/taro'
import './index.css'

const title = 'UICheck Taro Demo'
const route = 'pages/index/index?scene=real-taro'

export default function Index() {
  useEffect(() => {
    const routerParams = Taro.getCurrentInstance().router?.params ?? {}
    const socketUrl = routerParams.socketUrl ? decodeURIComponent(String(routerParams.socketUrl)) : ''
    const clientId = routerParams.clientId ? String(routerParams.clientId) : 'taro-evidence'

    installTaroUiCheck(Taro, {
      title,
      route,
      selector: '.uicheck-node',
      socket: socketUrl
        ? {
            url: socketUrl,
            clientId,
            reconnectMs: 300,
            enabled: true
          }
        : {
            enabled: false
          },
    })
  }, [])

  return (
    <View id="page" className="taro-demo-page uicheck-node" data-uicheck-tag="page" data-text="Checkout page">
      <View id="hero" className="hero uicheck-node" data-uicheck-tag="view" data-text="AI checkout inspection">
        <Text className="eyebrow uicheck-node" data-uicheck-tag="text" data-text="Taro WeApp real app">
          Taro WeApp real app
        </Text>
        <Text id="title" className="title uicheck-node" data-uicheck-tag="text" data-text="AI checkout inspection">
          AI checkout inspection
        </Text>
        <Text className="subtitle uicheck-node" data-uicheck-tag="text" data-text="Captured through @uicheck/mcp from a Taro runtime page.">
          Captured through @uicheck/mcp from a Taro runtime page.
        </Text>
      </View>

      <View id="stats" className="stats uicheck-node" data-uicheck-tag="view" data-text="Stats cards">
        <View className="stat-card uicheck-node" data-uicheck-tag="view" data-text="Visible nodes">
          <Text className="stat-label">Visible nodes</Text>
          <Text className="stat-value">12</Text>
        </View>
        <View className="stat-card uicheck-node" data-uicheck-tag="view" data-text="Target button">
          <Text className="stat-label">Target</Text>
          <Text className="stat-value">#submit</Text>
        </View>
      </View>

      <View id="summary" className="summary-card uicheck-node" data-uicheck-tag="view" data-text="SelectorQuery summary">
        <Text className="summary-label">SelectorQuery summary</Text>
        <Text className="summary-text">The Taro adapter reads real runtime boxes and metadata from the Taro selector query API.</Text>
        <View className="progress uicheck-node" data-uicheck-tag="view" data-text="Progress">
          <View className="progress-bar uicheck-node" data-uicheck-tag="view" data-text="Progress value" />
        </View>
      </View>

      <Button
        id="submit"
        className="submit-button uicheck-node"
        data-testid="submit-button"
        data-uicheck-tag="button"
        data-text="Submit order"
      >
        Submit order
      </Button>
    </View>
  )
}
