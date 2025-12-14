// WebSocket URL (adjust if backend host differs)
const WS_URL = (location.hostname === 'localhost') ?
  `ws://${location.hostname}:8080/ws-audio` :
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws-audio`;

const connectBtn = document.getElementById('connectBtn');
const startRecBtn = document.getElementById('startRecBtn');
const stopRecBtn  = document.getElementById('stopRecBtn');
const transcriptBox = document.getElementById('transcriptBox');

let ws = null;
let mediaRecorder = null;
let audioContext, analyser, dataArray, sourceNode;
let analyserTimer = null;

// --- Circular visualizer setup ---
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  if (!analyser) {
    // idle animation subtle
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    return;
  }
  analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const cx = canvas.width/2;
  const cy = canvas.height/2;
  const baseRadius = Math.min(cx,cy) * 0.4;

  const bars = dataArray.length;
  for (let i = 0; i < bars; i++) {
    const v = dataArray[i] / 255;
    const angle = (i / bars) * Math.PI * 2;
    const len = baseRadius + v * baseRadius * 1.5;

    const x1 = cx + Math.cos(angle) * baseRadius;
    const y1 = cy + Math.sin(angle) * baseRadius;
    const x2 = cx + Math.cos(angle) * len;
    const y2 = cy + Math.sin(angle) * len;

    const hue = (i / bars) * 360;
    ctx.strokeStyle = `hsl(${hue} 70% 60%)`;
    ctx.lineWidth = Math.max(2, v * 6);
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }

  // center glow
  ctx.beginPath();
  ctx.fillStyle = 'rgba(20,167,255,0.06)';
  ctx.arc(cx,cy, baseRadius*0.68, 0, Math.PI*2);
  ctx.fill();
}

// start drawing loop
requestAnimationFrame(drawVisualizer);

// --- WebSocket connect ---
connectBtn.onclick = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
    return;
  }
  ws = new WebSocket(WS_URL);

  ws.addEventListener('open', () => {
    connectBtn.textContent = 'Disconnect';
    startRecBtn.disabled = false;
    appendSystem('Connected to backend WebSocket.');
  });

  ws.addEventListener('message', (ev) => {
    // expecting text messages with partial/full transcripts
    appendTranscript(ev.data);
  });

  ws.addEventListener('close', () => {
    connectBtn.textContent = 'Connect';
    startRecBtn.disabled = true;
    stopRecBtn.disabled = true;
    appendSystem('WebSocket disconnected.');
  });

  ws.addEventListener('error', (e) => {
    appendSystem('WebSocket error. See console.');
    console.error(e);
  });
};

function appendTranscript(text){
  transcriptBox.textContent += text + "\n";
  transcriptBox.scrollTop = transcriptBox.scrollHeight;
}
function appendSystem(text){
  transcriptBox.textContent += `[system] ${text}\n`;
  transcriptBox.scrollTop = transcriptBox.scrollHeight;
}

// --- Microphone capture and streaming using MediaRecorder ---
startRecBtn.onclick = async () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    appendSystem('WebSocket not connected.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // setup analyser for visualizer
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    sourceNode.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    // MediaRecorder to produce small blobs
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorder.addEventListener('dataavailable', async (e) => {
      if (!e.data || e.data.size === 0) return;
      // convert blob to base64
      const arrBuf = await e.data.arrayBuffer();
      const bytes = new Uint8Array(arrBuf);
      // simple base64 encode
      let binary = '';
      const chunkSize = 0x8000;
      for (let i=0; i<bytes.length; i+=chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i+chunkSize));
      }
      const base64 = btoa(binary);
      // send as JSON: {type:'audio', payload: 'base64...'}
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type:'audio', payload: base64 }));
      }
    });

    // 200ms timeslice — adjust for latency vs CPU
    mediaRecorder.start(200);

    startRecBtn.disabled = true;
    stopRecBtn.disabled = false;
    appendSystem('Microphone started. Streaming chunks to backend.');
  } catch (err) {
    console.error(err);
    appendSystem('Could not access microphone: ' + err.message);
  }
};

stopRecBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (audioContext) {
    audioContext.close();
    analyser = null;
  }
  startRecBtn.disabled = false;
  stopRecBtn.disabled = true;
  appendSystem('Microphone stopped.');
};
