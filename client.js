function createWebSocket() {
  // const websocket = new WebSocket("ws://localhost:8000")
  // const websocket = new WebSocket("ws://ibuibu-deno-ws-test.deno.dev")
  const websocket = new WebSocket("wss://ibuibu-deno-ws-test.deno.dev")

  websocket.onopen = () => {
    console.log('hoge')
    const num = Math.random();
    setInterval(() => {
      websocket.send(`Client says hello ${num}`)
    }, 1000)
  }


  websocket.onmessage = (message) => {
    console.log(message.data)
  }

  websocket.onerror = (message)=>{
    console.log({message})
  }
}

createWebSocket()
