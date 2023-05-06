import { serve } from 'https://deno.land/std@0.156.0/http/server.ts';
import { crypto } from 'https://deno.land/std@0.156.0/crypto/mod.ts';

const clients = new Map<string, WebSocket>();
const rooms = new Map<string, { clientId: string; ws: WebSocket }[]>();

serve(
  async (req) => {
    const url = new URL(req.url);

    switch (url.pathname) {
      case '/': {
        const html = await Deno.readFile('./index.html');
        return new Response(html);
      }

      case '/front.js': {
        const js = await Deno.readFile('./front.js');
        return new Response(js);
      }

      case '/ws': {
        const { response, socket: ws } = Deno.upgradeWebSocket(req);
        const clientId = crypto.randomUUID();
        clients.set(clientId, ws);

        ws.addEventListener('message', (event) => {
          const mes = JSON.parse(event.data);

          if (mes.type === 'join') {
            const members = rooms.get(mes.roomId);
            if (members) {
              members.forEach((member) => {
                member.ws.send(
                  JSON.stringify({ type: 'join', srcClientId: mes.srcClientId })
                );
              });

              members.push({ clientId: mes.clientId, ws });
              rooms.set(mes.roomId, members);
            } else {
              rooms.set(mes.roomId, [{ clientId: mes.clientId, ws }]);
            }
          }

          if (mes.type === 'offer') {
            const targetWs = clients.get(mes.targetClientId);
            if (targetWs == null) return;
            targetWs.send(
              JSON.stringify({
                type: 'offer',
                srcClientId: mes.srcClientId,
                sdp: mes.sdp,
              })
            );
          }

          if (mes.type === 'answer') {
            const targetWs = clients.get(mes.targetClientId);
            if (targetWs == null) return;
            targetWs.send(
              JSON.stringify({
                type: 'answer',
                srcClientId: mes.srcClientId,
                sdp: mes.sdp,
              })
            );
          }
        });

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'clientId', clientId }));
        };

        ws.onclose = () => {
          let leavedClientId: string;
          for (const [clientId, clientWs] of clients.entries()) {
            if (clientWs === ws) {
              clients.delete(clientId);
              leavedClientId = clientId;
            }
          }
          for (const [roomId, members] of rooms.entries()) {
            const newMembers = members.filter((m) => m.ws !== ws);
            newMembers.forEach((m) => {
              m.ws.send(
                JSON.stringify({ type: 'leave', clientId: leavedClientId })
              );
            });
            rooms.set(roomId, newMembers);
          }
        };

        return response;
      }

      default:
        return new Response('Unexpected Error', { status: 500 });
    }
  },
  { port: parseInt(Deno.env.get('PORT') ?? '') || 443 }
);
