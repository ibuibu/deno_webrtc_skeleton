const URL = location.href.replace("http", "ws") + "ws";

let pc, localStream, ws, offerSdp, roomId;

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

const makeAnswer = async (theirSdp, stream) => {
  const pc = await preparePeerConnection(stream);
  const theirOffer = new RTCSessionDescription({
    type: "offer",
    sdp: theirSdp,
  });
  pc.setRemoteDescription(theirOffer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  vanillaIce(pc, true);
};

const preparePeerConnection = async (stream) => {
  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.addEventListener("track", (ev) => {
    console.log("get remote video");
    document.getElementById("remote-video").srcObject = ev.streams[0];
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
            roomId,
            sdp: pc.localDescription.sdp,
          })
        );
      } else {
        offerSdp = pc.localDescription.sdp;
      }
    }
  });
};

document.getElementById("join").addEventListener("click", () => {
  roomId = document.getElementById("room-id").value;
  ws.send(JSON.stringify({ type: "join", roomId, sdp: offerSdp }));
});

(async function () {
  const myVideoElm = document.getElementById("my-video");
  localStream = await gUMtoDOM(myVideoElm);
  pc = await makeOffer(localStream);

  ws = new WebSocket(URL);

  ws.onopen = () => {
    console.log("ws opened");
  };

  ws.onmessage = (message) => {
    const mes = JSON.parse(message.data);

    if (mes.type === "offer") {
      makeAnswer(mes.sdp, localStream);
    }

    if (mes.type === "answer") {
      const answerOffer = new RTCSessionDescription({
        type: "answer",
        sdp: mes.sdp,
      });
      pc.setRemoteDescription(answerOffer);
    }
  };

  ws.onerror = (message) => {
    console.log({ message });
  };
})();
