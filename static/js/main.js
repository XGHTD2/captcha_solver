const $ = id => document.getElementById(id);
const socket = io();
const captchasDiv = $("captchas");
const statusDiv = $("status");
const alertSound = $("alertSound");
const toggleBtn = $("toggle-mode");
const globalVoiceBtn = $("global-voice-btn");
const soundBtn = $("toggle-sound-btn");
const autoSubmitBtn = $("auto-submit-btn");
const welcomePopup = $("welcome-popup");
const welcomeBtn = $("welcome-btn");
const toggleParticleBtn = $("toggle-particle-btn");
const toggleNeonBtn = $("toggle-neon-btn");

let particleEnabled = true;
let neonEnabled = true;
let currentQueue = [], currentCaptcha = null;
let soundEnabled = true, globalVoiceActive = false, recognition, autoSubmitVoice = false;

// --- Đọc setting từ localStorage khi load trang ---
window.addEventListener("DOMContentLoaded", () => {
    // Theme
    if (localStorage.getItem("theme") === "light") {
        document.body.classList.add("light");
    }
    // Neon
    if (localStorage.getItem("neon") === "off") {
        neonEnabled = false;
        document.body.classList.add("no-neon");
        toggleNeonBtn.classList.remove("on");
        toggleNeonBtn.classList.add("off");
        toggleNeonBtn.textContent = "🌟 Neon Off";
    }
    // Particle
    if (localStorage.getItem("particle") === "off") {
        particleEnabled = false;
        document.body.classList.add("no-particle");
        toggleParticleBtn.classList.remove("on");
        toggleParticleBtn.classList.add("off");
        toggleParticleBtn.textContent = "✨ Hạt Off";
    } else {
        particleEnabled = true;
        document.body.classList.remove("no-particle");
        toggleParticleBtn.classList.add("on");
        toggleParticleBtn.classList.remove("off");
        toggleParticleBtn.textContent = "✨ Hạt On";
        // Nếu đang bật thì load lại hiệu ứng hạt
        loadParticles(!document.body.classList.contains("light"));
    }
    // Sound
    if (localStorage.getItem("sound") === "off") {
        soundEnabled = false;
        soundBtn.classList.remove("on");
        soundBtn.classList.add("off");
        soundBtn.textContent = "🔇 Off";
    }
    // Auto submit
    if (localStorage.getItem("autoSubmit") === "on") {
        autoSubmitVoice = true;
        autoSubmitBtn.classList.add("on");
        autoSubmitBtn.classList.remove("off");
        autoSubmitBtn.textContent = "📨 On";
    }
    // Voice
    if (localStorage.getItem("voice") === "on") {
        globalVoiceActive = true;
        globalVoiceBtn.classList.add("on");
        globalVoiceBtn.classList.remove("off");
        globalVoiceBtn.textContent = "🎤 On";
    } else {
        globalVoiceActive = false;
        globalVoiceBtn.classList.remove("on");
        globalVoiceBtn.classList.add("off");
        globalVoiceBtn.textContent = "🎤 Off";
    }
});

// --- Đảm bảo trạng thái nút và body khi load trang (mặc định nếu chưa có localStorage) ---
if (!localStorage.getItem("particle")) {
    particleEnabled = false;
    document.body.classList.add("no-particle");
    toggleParticleBtn.textContent = "✨ Hạt Off";
    toggleParticleBtn.classList.remove("on");
    toggleParticleBtn.classList.add("off");
}
if (!localStorage.getItem("neon")) {
    neonEnabled = true;
    toggleNeonBtn.textContent = "🌟 Neon On";
    toggleNeonBtn.classList.remove("off");
    toggleNeonBtn.classList.add("on");
    document.body.classList.remove("no-neon");
}
if (!localStorage.getItem("voice")) {
    globalVoiceActive = false;
    globalVoiceBtn.classList.remove("on");
    globalVoiceBtn.classList.add("off");
    globalVoiceBtn.textContent = "🎤 Off";
}

// Nếu tsParticles đã load, tắt luôn
if (window.tsParticles && tsParticles.domItem(0)) {
    tsParticles.domItem(0).destroy();
}

// Đóng popup khi bấm bất kỳ đâu trên popup
welcomePopup.addEventListener("click", () => {
    alertSound.play().catch(()=>{});
    alertSound.pause();
    welcomePopup.classList.add("hide");
});

welcomeBtn.onclick = () => {
    alertSound.play().catch(()=>{});
    alertSound.pause();
    welcomePopup.classList.add("hide");
};

toggleParticleBtn.onclick = async () => {
    particleEnabled = !particleEnabled;
    document.body.classList.toggle("no-particle", !particleEnabled);
    toggleParticleBtn.textContent = particleEnabled ? "✨ Hạt On" : "✨ Hạt Off";
    toggleParticleBtn.classList.toggle("on", particleEnabled);
    toggleParticleBtn.classList.toggle("off", !particleEnabled);
    localStorage.setItem("particle", particleEnabled ? "on" : "off");

    if (!particleEnabled) {
        if (window.tsParticles && tsParticles.domItem(0)) {
            await tsParticles.domItem(0).destroy();
        }
    } else {
        loadParticles(!document.body.classList.contains("light"));
    }
};

toggleNeonBtn.onclick = () => {
    neonEnabled = !neonEnabled;
    document.body.classList.toggle("no-neon", !neonEnabled);
    toggleNeonBtn.textContent = neonEnabled ? "🌟 Neon On" : "🌟 Neon Off";
    toggleNeonBtn.classList.toggle("on", neonEnabled);
    toggleNeonBtn.classList.toggle("off", !neonEnabled);
    localStorage.setItem("neon", neonEnabled ? "on" : "off");
};

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
} else {
    globalVoiceBtn.disabled = true;
    globalVoiceBtn.title = "Trình duyệt không hỗ trợ nhận diện giọng nói";
}

globalVoiceBtn.onclick = () => {
    globalVoiceActive = !globalVoiceActive;
    globalVoiceBtn.classList.toggle("on", globalVoiceActive);
    globalVoiceBtn.classList.toggle("off", !globalVoiceActive);
    globalVoiceBtn.textContent = globalVoiceActive ? "🎤 On" : "🎤 Off";
    globalVoiceBtn.title = globalVoiceActive ? "Đang bật nhận diện giọng nói tự động" : "Bật/tắt nhận diện giọng nói";
    localStorage.setItem("voice", globalVoiceActive ? "on" : "off");
    if (globalVoiceActive && currentCaptcha) startVoiceForCurrentInput();
    if (!globalVoiceActive && recognition) recognition.stop();
};

soundBtn.onclick = () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? "🔊 On" : "🔇 Off";
    soundBtn.title = soundEnabled ? "Âm thanh bật" : "Âm thanh tắt";
    soundBtn.classList.toggle("on", soundEnabled);
    soundBtn.classList.toggle("off", !soundEnabled);
    localStorage.setItem("sound", soundEnabled ? "on" : "off");
    if (!soundEnabled) {
        alertSound.pause();
        alertSound.currentTime = 0;
    } else if (currentCaptcha || currentQueue.length) {
        alertSound.play();
    }
};

autoSubmitBtn.onclick = () => {
    autoSubmitVoice = !autoSubmitVoice;
    autoSubmitBtn.textContent = autoSubmitVoice ? "📨 On" : "🚫 Off";
    autoSubmitBtn.title = autoSubmitVoice ? "Tự động gửi bật" : "Tự động gửi tắt";
    autoSubmitBtn.classList.toggle("on", autoSubmitVoice);
    autoSubmitBtn.classList.toggle("off", !autoSubmitVoice);
    localStorage.setItem("autoSubmit", autoSubmitVoice ? "on" : "off");
};

toggleBtn.onclick = () => {
    document.body.classList.toggle("light");
    localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
    if (particleEnabled) {
        loadParticles(!document.body.classList.contains("light"));
    }
};

function updateStatus() {
    statusDiv.textContent = `🔥 ${currentQueue.length + (currentCaptcha ? 1 : 0)} Captcha cần giải`;
}

function filterNumber(str) {
    return (str || "").replace(/[^0-9]/g, "");
}

function startVoiceForCurrentInput() {
    if (!globalVoiceActive || !recognition) return;
    const container = $(currentCaptcha);
    if (!container) return;
    const input = container.querySelector("input[name='answer']");
    const form = container.querySelector("form");
    if (!input || !form) return;

    recognition.onresult = (event) => {
        let transcript = event.results[0][0].transcript.trim().toLowerCase();
        if (["clear", "xóa"].includes(transcript)) {
            input.value = "";
        } else {
            let send = autoSubmitVoice ||
                /ok|enter|hết/.test(transcript);
            transcript = transcript.replace(/ok|enter|hết/g, "");
            const numbers = transcript.replace(/[^0-9]/g, "");
            if (numbers) input.value += numbers;
            if (send) form.requestSubmit();
        }
        input.focus();
    };
    recognition.onerror = () => {
        globalVoiceActive = false;
        globalVoiceBtn.classList.remove("on");
        globalVoiceBtn.classList.add("off");
        globalVoiceBtn.textContent = "🎤 Off";
        localStorage.setItem("voice", "off");
    };
    recognition.onend = () => {
        if (globalVoiceActive && currentCaptcha) recognition.start();
    };
    recognition.start();
}

function showNextCaptcha() {
    if (currentCaptcha || !currentQueue.length) return;
    const { image_id, image_data } = currentQueue.shift();
    currentCaptcha = image_id;
    updateStatus();

    const container = document.createElement("div");
    container.className = "captcha-card";
    container.id = image_id;
    container.innerHTML = `
        <div class="captcha-img">
            <img src="data:image/png;base64,${image_data}" alt="Captcha Image" draggable="false" />
        </div>
        <div class="captcha-input">
            <form>
                <input name="answer" placeholder="Nhập Captcha..." autocomplete="off" required inputmode="numeric" pattern="[0-9]*" />
                <input type="hidden" name="image_id" value="${image_id}" />
            </form>
        </div>
    `;
    const input = container.querySelector("input[name='answer']");
    const form = container.querySelector("form");
    input.addEventListener("input", () => input.value = filterNumber(input.value));
    form.onsubmit = e => {
        e.preventDefault();
        input.value = filterNumber(input.value);
        fetch("/submit", { method: "POST", body: new FormData(form) }).then(r => r.json());
    };
    captchasDiv.innerHTML = "";
    captchasDiv.appendChild(container);
    input.focus();
    if (globalVoiceActive && recognition) startVoiceForCurrentInput();
}

socket.on("new_captcha", data => {
    currentQueue.push(data);
    updateStatus();
    if (soundEnabled) alertSound.play();
    showNextCaptcha();
});

socket.on("solved", ({ image_id }) => {
    if (currentCaptcha === image_id) {
        $(image_id)?.remove();
        currentCaptcha = null;
        showNextCaptcha();
    }
    updateStatus();
    if (!currentQueue.length && !currentCaptcha) {
        alertSound.pause();
        alertSound.currentTime = 0;
    }
});

socket.emit("get_pending");
socket.on("pending_captchas", data => data.forEach(id => socket.emit("get_image", id)));

document.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        const form = document.activeElement?.form;
        if (form && document.activeElement.name === "answer") {
            form.requestSubmit();
            e.preventDefault();
        }
    }
});

document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.altKey || e.metaKey || !currentCaptcha) return;
    const container = $(currentCaptcha);
    const input = container?.querySelector("input[name='answer']");
    if (input && document.activeElement !== input) input.focus();
});

async function loadParticles(dark = true) {
    await tsParticles.load("tsparticles", {
        fullScreen: { enable: false },
        background: { color: { value: "transparent" } },
        fpsLimit: 60,
        interactivity: {
            events: { onHover: { enable: true, mode: "repulse" }, resize: true },
            modes: { repulse: { distance: 100, duration: 0.4 } },
        },
        particles: {
            color: { value: dark ? "#8A2BE2" : "#4AC9FF" },
            links: {
                color: dark ? "#8A2BE2" : "#4AC9FF",
                distance: 120,
                enable: true,
                opacity: 0.6,
                width: 2,
            },
            move: { direction: "none", enable: true, outModes: "bounce", speed: 2 },
            number: { density: { enable: true, area: 800 }, value: 60 },
            opacity: { value: 1 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 4 } },
        },
        detectRetina: true,
    });
}