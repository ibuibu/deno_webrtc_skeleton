import { serve } from "https://deno.land/std@0.156.0/http/server.ts";

const rooms = new Map();
const clients = new Map();

let clientId = 0;

serve(
  async (req) => {
    const url = new URL(req.url);

    switch (url.pathname) {

      case "/":
        const html = await Deno.readFile("./index.html");
        return new Response(html);

      case "/front.js":
        const js = await Deno.readFile("./front.js");
        return new Response(js);

      case "/ws":
        const { response, socket: ws } = Deno.upgradeWebSocket(req);
        clientId++;
        clients.set(clientId, ws);

        ws.addEventListener("message", (event) => {
          const mes = JSON.parse(event.data);

          if (mes.type === "join") {
            const members = rooms.get(mes.roomId);
            if (members) {
              members.forEach((member) => {
                member.ws.send(
                  JSON.stringify({ type: "join", srcClientId: mes.srcClientId })
                );
              });

              members.push({ clientId: mes.clientId, ws });
              rooms.set(mes.roomId, members);
            } else {
              rooms.set(mes.roomId, [{ clientId: mes.clientId, ws }]);
            }
          }

          if (mes.type === "offer") {
            const ws = clients.get(mes.targetClientId);
            ws.send(
              JSON.stringify({
                type: "offer",
                srcClientId: mes.srcClientId,
                sdp: mes.sdp,
              })
            );
          }

          if (mes.type === "answer") {
            const ws = clients.get(mes.targetClientId);
            ws.send(
              JSON.stringify({
                type: "answer",
                srcClientId: mes.srcClientId,
                sdp: mes.sdp,
              })
            );
          }
        });

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "clientId", clientId }));
        };

        ws.onclose = () => {
          console.log({ clientId });
          clients.delete(clientId);
          console.log({ clients });
          for (const [roomId, members] of rooms.entries()) {
            const newMembers = members.filter((m) => m.ws !== ws);
            rooms.set(roomId, newMembers);
          }
        };

        return response;
    }
  },
  { port: parseInt(Deno.env.get("PORT") ?? "") || 443 }
);
