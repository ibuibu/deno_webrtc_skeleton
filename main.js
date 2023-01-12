import { serve } from 'https://deno.land/std@0.156.0/http/server.ts';

serve((req) => {
  const { response, socket } = Deno.upgradeWebSocket(req);
  socket.addEventListener('message', (event) => {
    console.log(event.data);
    socket.send("aaa")
  });

  return response;
});
