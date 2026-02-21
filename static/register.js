console.log("✅ register.js loaded");

let stream = null;
let saved = 0;
let capturing = false;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const savedEl = document.getElementById("saved");
const msg = document.getElementById("msg");

const startBtn = document.getElementById("start");
const captureBtn = document.getElementById("capture");

function show(text, ok=true){
  msg.innerHTML = `<div class="alert ${ok ? "alert-success":"alert-warning"} py-2">${text}</div>`;
}

startBtn.addEventListener("click", async () => {
  try {
    const name = document.getElementById("name").value.trim();
    const reg_no = document.getElementById("reg_no").value.trim();

    if(!name || !reg_no){
      show("❌ Name and Reg No required", false);
      return;
    }

    // tell backend to start register
    const res = await fetch("/api/register/start", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({name, reg_no})
    });

    const data = await res.json();
    if(!data.ok){
      show("❌ " + data.msg, false);
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
    video.srcObject = stream;

    await new Promise(resolve => video.onloadedmetadata = resolve);
    await video.play();

    captureBtn.disabled = false;
    show("✅ Camera started. Click Capture once (auto 25 images).");

  } catch(err) {
    console.error(err);
    show("❌ Camera error: " + err.message, false);
  }
});

captureBtn.addEventListener("click", async () => {
  console.log("📸 Capture clicked");

  if(capturing) return;
  if(!stream){
    show("❌ Start camera first", false);
    return;
  }

  const reg_no = document.getElementById("reg_no").value.trim();
  const name = document.getElementById("name").value.trim();

  capturing = true;
  saved = 0;
  savedEl.textContent = "0";
  show("📸 Auto capturing... please keep face in front of camera.");

  const interval = setInterval(async () => {
    try {
      if(saved >= TOTAL){
        clearInterval(interval);

        // finish registration
        const finish = await fetch("/api/register/finish", {
          method:"POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({reg_no, name})
        });
        const done = await finish.json();

        show(done.ok ? "✅ " + done.msg : "❌ " + done.msg, done.ok);

        // stop camera
        if(stream){
          stream.getTracks().forEach(t => t.stop());
        }

        captureBtn.disabled = true;
        capturing = false;
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );

      const form = new FormData();
      form.append("frame", blob, "frame.jpg");
      form.append("reg_no", reg_no);
      form.append("idx", String(saved));

      const res = await fetch("/api/register/frame", { method:"POST", body: form });
      const data = await res.json();

      if(data.ok){
        saved++;
        savedEl.textContent = saved;
      }

    } catch(e){
      console.error(e);
    }
  }, 300); // every 300ms
});