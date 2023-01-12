function createWebSocket() {
  const websocket = new WebSocket("ws://localhost:8000")

  websocket.onopen = () => {
    const num = Math.random();
    setInterval(() => {
      websocket.send(`Client says hello ${num}`)
    }, 1000)
  }


  websocket.onmessage = (message) => {
    console.log(message.data)
  }
}

createWebSocket()
