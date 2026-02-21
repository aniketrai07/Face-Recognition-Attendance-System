console.log("✅ attendance.js loaded");

let stream = null;
let running = false;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const statusEl = document.getElementById("status");

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

if (!startBtn || !stopBtn || !video || !canvas || !statusEl) {
  console.error("❌ Missing elements. Check IDs in attendance.html");
}

startBtn.addEventListener("click", async () => {
  console.log("✅ Start clicked");
  try {
    if (running) return;

    statusEl.textContent = "Requesting camera...";
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;

    await new Promise(resolve => (video.onloadedmetadata = resolve));
    await video.play();

    running = true;
    statusEl.textContent = "Running recognition...";
    loop();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Camera error: " + err.name + " - " + err.message;
  }
});

stopBtn.addEventListener("click", () => {
  console.log("🛑 Stop clicked");
  running = false;
  statusEl.textContent = "Stopped.";
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null;
});

async function loop() {
  if (!running) return;

  if (!video.videoWidth || !video.videoHeight) {
    console.log("⏳ waiting video...");
    setTimeout(loop, 300);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));

  console.log("📤 sending frame to /api/recognize");

  const form = new FormData();
  form.append("frame", blob, "frame.jpg");

  try {
    const res = await fetch("/api/recognize", { method: "POST", body: form });
    const data = await res.json();

    if (data.ok) {
      const known = data.faces.filter(f => f.name !== "Unknown").length;
      statusEl.textContent = `Faces: ${data.faces.length} | Recognized: ${known}`;
    } else {
      statusEl.textContent = data.msg || "Recognition failed";
    }
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Fetch error (server not reachable?)";
  }

  setTimeout(loop, 700);
}