import { serve } from "https://deno.land/std@0.156.0/http/server.ts";

const rooms = new Map();

serve(
  (req) => {
    const { response, socket: ws } = Deno.upgradeWebSocket(req);

    ws.addEventListener("message", (event) => {
      const mes = JSON.parse(event.data);

      if (mes.type === "join") {
        const members = rooms.get(mes.roomId);
        // console.log({ wss: members });
        if (members) {
          members.forEach((member) => {
            member.send(JSON.stringify({ type: "offer", sdp: mes.sdp }));
          });

          members.push(ws);
          rooms.set(mes.roomId, members);
        } else {
          rooms.set(mes.roomId, [ws]);
        }
        // console.log({ rooms });
      }

      if (mes.type === "answer") {
        const members = rooms.get(mes.roomId);
        members.forEach((member) => {
          if (member !== ws) {
            member.send(JSON.stringify({ type: "answer", sdp: mes.sdp }));
          }
        });
      }
    });

    ws.onclose = () => {

    };

    return response;
  },
  { port: parseInt(Deno.env.get("PORT") ?? "") || 443 }
);
