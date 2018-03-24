/** @file
RPC store interface

\copyright Copyright (c) 2018 Chris Byrne. All rights reserved.
Licensed under the MIT License. Refer to LICENSE file in the project root. */

import RpcSocket from '@/store/RpcSocket'
import { mergeDeep } from '@/helpers/mergeDeep.js'

/// populate some default placeholder wattage readings
const placeholderWattage = () => {
  const now = new Date()
  const dataLength = 60
  return Array(dataLength).fill(now.getTime()).map((v, i) => {
    return [
      v - (dataLength - i) * 1000,
      null
    ]
  })
}

// Vuex store attachment
export default function (store) {
  console.log('RpcInit')

  // WebSocket RPC
  const rpcSocket = new RpcSocket('/api/v1')
  rpcSocket.on('connect', (data) => {
    store.commit('Rpc/connectionState', data)

    // start logging Wattage
    const timerId = setInterval(() => {
      if (!rpcSocket.connected) {
        clearInterval(timerId)
        return
      }
      const power = store.state.Rpc.data.power
      if (typeof power !== 'undefined') {
        store.commit('Rpc/wattage', power)
      }
    }, 1000)
  })
  rpcSocket.on('disconnect', () => {
    store.commit('Rpc/connectionState', false)
    // console.log(store, store.rpcConnected, Vue.rpc.connected)
  })
  rpcSocket.on('update', (data) => {
    store.commit('Rpc/connectionUpdate', data)
  })

  // begin establishing a connection
  rpcSocket.connect()

  // bind our RPC module
  store.registerModule('Rpc', {
    namespaced: true,
    state: {
      connected: true, // assumes we're initially connected
      wattage: placeholderWattage(),
      data: {
        relay: null,
        sys: { },
        test: { }
      }
    },
    mutations: {
      connectionState (state, data) {
        if (data === false) {
          state.connected = false
        } else {
          state.connected = true
          Object.assign(state.data, data)
        }
      },
      connectionUpdate (state, data) {
        console.log('connectionUpdate', state, data)
        mergeDeep(state.data, data)
      },
      wattage (state, power) {
        state.wattage = [
          ...state.wattage.slice(1),
          [ new Date(), power ]
        ]
      }
    },
    actions: {
      relay (context, state) {
        return rpcSocket.request('relay', state)
      },
      test (/* context */) {
        return rpcSocket.request('test')
      }
    }
  })
}