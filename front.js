const URL = location.href.replace("http", "ws") + "ws";

let ws, roomId, clientId;
const pcs = {};

const gUMtoDOM = async (targetDOM) => {
  const videoAndAudioStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  targetDOM.srcObject = videoAndAudioStream;
  await targetDOM.play();
  return videoAndAudioStream;
};

const makeOffer = async (stream, targetClientId) => {
  const pc = preparePeerConnection(stream, targetClientId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return pc;
};

const makeAnswer = async (theirSdp, stream, targetClientId) => {
  const pc = preparePeerConnection(stream, targetClientId);
  const theirOffer = new RTCSessionDescription({
    type: "offer",
    sdp: theirSdp,
  });
  pc.setRemoteDescription(theirOffer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return pc;
};

const preparePeerConnection = (stream, clientId) => {
  let pc_config = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };
  const pc = new RTCPeerConnection(pc_config);
  pc.addEventListener("track", (ev) => {
    if (ev.track.kind === "video") {
      const v = document.createElement("video");
      v.srcObject = ev.streams[0];
      v.autoplay = true;
      v.width = 300;
      v.id = clientId;
      document.getElementById("remote-video").appendChild(v);
    }
  });
  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream);
  }
  return pc;
};

document.getElementById("join").addEventListener("click", () => {
  roomId = document.getElementById("room-id").value;
  ws.send(JSON.stringify({ type: "join", srcClientId: clientId, roomId }));
});

(async function () {
  const myVideoElm = document.getElementById("my-video");
  const localStream = await gUMtoDOM(myVideoElm);

  ws = new WebSocket(URL);

  ws.onmessage = async (message) => {
    const mes = JSON.parse(message.data);

    if (mes.type === "clientId") {
      clientId = mes.clientId;
    }

    if (mes.type === "join") {
      const pc = await makeOffer(localStream, mes.srcClientId);
      ws.send(
        JSON.stringify({
          type: "offer",
          srcClientId: clientId,
          targetClientId: mes.srcClientId,
          roomId,
          sdp: pc.localDescription.sdp,
        })
      );
      pcs[mes.srcClientId] = pc;
    }

    if (mes.type === "offer") {
      const pc = await makeAnswer(mes.sdp, localStream, mes.srcClientId);
      pc.addEventListener("icecandidate", (ev) => {
        if (ev.candidate !== null) return;
        ws.send(
          JSON.stringify({
            type: "answer",
            srcClientId: clientId,
            targetClientId: mes.srcClientId,
            roomId,
            sdp: pc.localDescription.sdp,
          })
        );
      });
      pcs[mes.srcClientId] = pc;
    }

    if (mes.type === "answer") {
      const theirAnswer = new RTCSessionDescription({
        type: "answer",
        sdp: mes.sdp,
      });
      pcs[mes.srcClientId].setRemoteDescription(theirAnswer);
    }

    if (mes.type === "leave") {
      const videoElm = document.getElementById(mes.clientId);
      document.getElementById("remote-video").removeChild(videoElm);
      pcs[mes.clientId].close();
      delete pcs[mes.clientId];
    }
  };

  ws.onerror = (message) => {
    console.log({ message });
  };
})();
