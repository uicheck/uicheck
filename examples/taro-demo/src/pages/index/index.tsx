import { useEffect } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { initUiCheck } from '@uicheck/taro'
import './index.css'

const detailRows = Array.from({ length: 34 }, (_, index) => {
  const number = index + 1
  const padded = String(number).padStart(2, '0')
  return {
    id: `detail-row-${padded}`,
    labelId: `detail-label-${padded}`,
    valueId: `detail-value-${padded}`,
    text: `Runtime check ${padded}`,
    value: number % 3 === 0 ? 'ok' : number % 3 === 1 ? 'warn' : 'trace',
  }
})

export default function Index() {
  useEffect(() => {
    const routerParams = Taro.getCurrentInstance().router?.params ?? {}
    const socketUrl = routerParams.socketUrl ? decodeURIComponent(String(routerParams.socketUrl)) : ''
    const clientId = routerParams.clientId ? String(routerParams.clientId) : 'taro-evidence'

    if (!socketUrl) return

    initUiCheck({
      taro: Taro,
      socket: {
        url: socketUrl,
        clientId,
        reconnectMs: 300,
      },
    })
  }, [])

  return (
    <View id="screen" className="taro-demo-page uicheck-node" data-uicheck-tag="view" data-text="Checkout screen">
      <View className="header">
        <View>
          <Text id="eyebrow" className="eyebrow uicheck-node" data-uicheck-tag="text" data-text="UICheck Taro">UICheck Taro</Text>
          <Text id="title" className="title uicheck-node" data-uicheck-tag="text" data-text="Checkout screen">
            Checkout screen
          </Text>
        </View>
        <Text id="runtime-badge" className="runtime-badge uicheck-node" data-uicheck-tag="text" data-text="weapp">weapp</Text>
      </View>

      <View id="content" className="content uicheck-node" data-uicheck-tag="view" data-text="Checkout content">
      <View id="summary-card" className="card uicheck-node" data-uicheck-tag="view" data-text="Registered ref summary">
        <Text id="summary-title" className="card-title uicheck-node" data-uicheck-tag="text" data-text="Registered ref summary">Registered ref summary</Text>
        <Text id="summary-text" className="card-text uicheck-node" data-uicheck-tag="text" data-text="MCP reads runtime boxes, text, testID and labels.">MCP reads runtime boxes, text, testID and labels.</Text>
      </View>

      <View id="items-card" className="card items-card uicheck-node" data-uicheck-tag="view" data-text="Order items">
        <Text id="items-title" className="card-title uicheck-node" data-uicheck-tag="text" data-text="Order items">Order items</Text>
        <View id="item-row-1" className="item-row uicheck-node" data-uicheck-tag="view" data-text="Starter license $19">
          <Text>Starter license</Text>
          <Text className="item-price">$19</Text>
        </View>
        <View id="item-row-2" className="item-row uicheck-node" data-uicheck-tag="view" data-text="Team add-on $8">
          <Text>Team add-on</Text>
          <Text className="item-price">$8</Text>
        </View>
        <View id="total-row" className="item-row total-row uicheck-node" data-uicheck-tag="view" data-text="Total $27">
          <Text>Total</Text>
          <Text>$27</Text>
        </View>
      </View>

      <View id="status-card" className="card uicheck-node" data-uicheck-tag="view" data-text="Ready for MCP inspection">
        <Text id="status-title" className="card-title uicheck-node" data-uicheck-tag="text" data-text="Ready for MCP inspection">Ready for MCP inspection</Text>
        <Text id="status-text" className="card-text uicheck-node" data-uicheck-tag="text" data-text="This real demo has 100+ inspectable nodes.">This real demo has 100+ inspectable nodes.</Text>
      </View>

      <View id="details-panel" className="details-panel uicheck-node" data-uicheck-tag="view" data-text="Runtime detail matrix">
        <Text id="details-title" className="details-title uicheck-node" data-uicheck-tag="text" data-text="Runtime detail matrix">Runtime detail matrix</Text>
        <View id="details-grid" className="details-grid uicheck-node" data-uicheck-tag="view" data-text="Runtime details">
          {detailRows.map((row) => (
            <View key={row.id} id={row.id} className="detail-row uicheck-node" data-uicheck-tag="view" data-text={`${row.text} ${row.value}`}>
              <Text id={row.labelId} className="detail-label uicheck-node" data-uicheck-tag="text" data-text={row.text}>{row.text}</Text>
              <Text id={row.valueId} className="detail-value uicheck-node" data-uicheck-tag="text" data-text={row.value}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text id="hint-banner" className="hint-banner uicheck-node" data-uicheck-tag="text" data-text="MCP can inspect all elements or a selected target.">
        MCP can inspect all elements or a selected target.
      </Text>

      <Button
        id="submit-button"
        className="submit-button uicheck-node"
        data-testid="submit-button"
        data-uicheck-tag="button"
        data-text="Submit order"
      >
        Submit order
      </Button>
      </View>
    </View>
  )
}
