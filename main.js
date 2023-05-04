import { serve } from "https://deno.land/std@0.156.0/http/server.ts";

const rooms = new Map();

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

        ws.addEventListener("message", (event) => {
          const mes = JSON.parse(event.data);

          if (mes.type === "join") {
            const members = rooms.get(mes.roomId);
            if (members) {
              members.forEach((member) => {
                member.send(JSON.stringify({ type: "offer", sdp: mes.sdp }));
              });

              members.push(ws);
              rooms.set(mes.roomId, members);
            } else {
              rooms.set(mes.roomId, [ws]);
            }
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
          for (const [roomId, members] of rooms.entries()) {
            const newMembers = members.filter((m) => m !== ws);
            rooms.set(roomId, newMembers);
          }
        };

        return response;
    }
  },
  { port: parseInt(Deno.env.get("PORT") ?? "") || 443 }
);
