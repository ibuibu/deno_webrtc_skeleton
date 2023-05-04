const URL = location.href.replace("http", "ws") + "ws";

let localStream, ws, roomId, clientId;
let pcs = [];

const gUMtoDOM = async (targetDOM) => {
  const videoAndAudioStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  targetDOM.srcObject = videoAndAudioStream;
  await targetDOM.play();
  return videoAndAudioStream;
};

const makeOffer = async (stream) => {
  const pc = await preparePeerConnection(stream);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  vanillaIce(pc, false);
  return pc;
};

const makeAnswer = async (theirSdp, stream, targetClientId) => {
  const pc = await preparePeerConnection(stream);
  const theirOffer = new RTCSessionDescription({
    type: "offer",
    sdp: theirSdp,
  });
  pc.setRemoteDescription(theirOffer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  // vanillaIce(pc, true);
  pc.addEventListener("icecandidate", (ev) => {
    if (ev.candidate === null) {
      ws.send(
        JSON.stringify({
          type: "answer",
          srcClientId: clientId,
          targetClientId,
          roomId,
          sdp: pc.localDescription.sdp,
        })
      );
    }
  });
  return pc;
};

const preparePeerConnection = async (stream) => {
  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.addEventListener("track", (ev) => {
    if (ev.track.kind === "video") {
      const v = document.createElement("video");
      v.srcObject = ev.streams[0];
      v.autoplay = true;
      document.getElementById("remote-video").appendChild(v);
    }
  });
  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream);
  }
  return pc;
};

const vanillaIce = (pc, isAnswer) => {
  pc.addEventListener("icecandidate", (ev) => {
    if (ev.candidate === null) {
      if (isAnswer) {
        ws.send(
          JSON.stringify({
            type: "answer",
            srcClientId: clientId,
            roomId,
            sdp: pc.localDescription.sdp,
          })
        );
      }
    }
  });
};

document.getElementById("join").addEventListener("click", () => {
  roomId = document.getElementById("room-id").value;
  ws.send(JSON.stringify({ type: "join", srcClientId: clientId, roomId }));
});

(async function () {
  const myVideoElm = document.getElementById("my-video");
  localStream = await gUMtoDOM(myVideoElm);

  ws = new WebSocket(URL);

  ws.onopen = () => {
    console.log("ws opened");
  };

  ws.onmessage = async (message) => {
    const mes = JSON.parse(message.data);
    console.log({ mes });

    if (mes.type === "clientId") {
      clientId = mes.clientId;
    }

    if (mes.type === "join") {
      const pc = await makeOffer(localStream);
      ws.send(
        JSON.stringify({
          type: "offer",
          srcClientId: clientId,
          targetClientId: mes.srcClientId,
          roomId,
          sdp: pc.localDescription.sdp,
        })
      );
      pcs.push(pc);
    }

    if (mes.type === "offer") {
      pcs.push(await makeAnswer(mes.sdp, localStream, mes.srcClientId));
    }

    if (mes.type === "answer") {
      const answerOffer = new RTCSessionDescription({
        type: "answer",
        sdp: mes.sdp,
      });
      pcs.forEach((pc) => {
        pc.setRemoteDescription(answerOffer);
      });
    }
  };

  ws.onerror = (message) => {
    console.log({ message });
  };
})();
