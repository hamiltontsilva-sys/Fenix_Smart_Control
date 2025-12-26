// ==========================================================
// CONFIGURAÇÃO GLOBAL
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let clientA = null;
let clientB = null;
let clientC = null;

let history = [];

// ==========================================================
// WATCHDOG / FLUXO
// ==========================================================
let lastP1 = 0;
let lastP2 = 0;
let lastP3 = 0;
const OFFLINE_TIMEOUT = 10;

// ==========================================================
// FUNÇÕES DE INTERFACE
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("status-online", "status-offline");
    if (state === "1") {
        el.textContent = "ONLINE";
        el.classList.add("status-online");
    } else {
        el.textContent = "OFFLINE";
        el.classList.add("status-offline");
    }
}

function setFluxo(id, val) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("fluxo-presente", "fluxo-ausente");

    const ativo = (val === "1" || val === 1);

    el.textContent = ativo ? "Presente" : "Ausente";
    el.classList.add(ativo ? "fluxo-presente" : "fluxo-ausente");

    const motorId = id.replace("_fluxo", "_motor");
    const motorEl = document.getElementById(motorId);
    if (motorEl) {
        motorEl.classList.toggle("motor-on", ativo);
    }
}

function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (bar) bar.style.width = pct + "%";
    if (txt) txt.textContent = pct + "%";
}

function renderHistory() {
    const ul = document.getElementById("history_list");
    if (!ul) return;
    ul.innerHTML = "";
    history.slice(0, 50).forEach(h => {
        const li = document.createElement("li");
        li.textContent = h;
        ul.appendChild(li);
    });
}

// ==========================================================
// STATUS MQTT + CENTRAL
// ==========================================================
let mqttConnected = false;
let centralOnline = false;

function updateStatusIndicators() {
    const mqttEl = document.getElementById("mqtt_status");
    const centEl = document.getElementById("central_status");

    if (mqttEl) {
        mqttEl.textContent = mqttConnected ? "MQTT: Conectado" : "MQTT: Desconectado";
        mqttEl.className = mqttConnected ? "status-ok" : "status-off";
    }

    if (centEl) {
        centEl.textContent = centralOnline ? "Central: Online" : "Central: Offline";
        centEl.className = centralOnline ? "status-ok" : "status-off";
    }
}

function debugLog(label, topic, payload) {
    const time = new Date().toLocaleTimeString();
    console.log(`%c[${label}] ${time} | ${topic} => ${payload}`, "color: green; font-weight: bold;");
}

// ==========================================================
// DASHBOARD HANDLER
// ==========================================================
function dashboardHandler(topic, v) {
    switch (topic) {

        case "smart_level/central/sistema":
            centralOnline = (v === "1");
            setText("sistema", centralOnline ? "ON" : "OFF");
            updateStatusIndicators();
            break;

        case "smart_level/central/poco_ativo":
            setText("poco_ativo", v);
            break;

        case "smart_level/central/retrolavagem":
            setText("retrolavagem", v === "1" ? "Retrolavando" : "Controle de Nível");
            break;

        case "smart_level/central/nivel":
            setText("nivel", v === "1" ? "Enchendo" : "Cheio");
            break;

        case "smart_level/central/rodizio_min":
            setText("rodizio_min", v);
            break;

        case "smart_level/central/cloro_peso_kg":
            setText("cloro_peso", v + " kg");
            break;

        case "smart_level/central/cloro_pct":
            updateCloroBar(v);
            break;

        case "smart_level/central/retro_history_json":
            try {
                const arr = JSON.parse(v);
                history = arr.map(h => `[${h.data}] início: ${h.inicio} | fim: ${h.fim}`);
                renderHistory();
            } catch {}
            break;
    }
}

// ==========================================================
// CLIENTE A
// ==========================================================
const topicsA = [
    "smart_level/central/sistema",
    "smart_level/central/poco_ativo",
    "smart_level/central/rodizio_min",
    "smart_level/central/cloro_peso_kg"
];

function startClientA() {
    clientA = new Paho.MQTT.Client(host, port, path, "clientA_" + Math.random());
    clientA.onConnectionLost = () => {
        mqttConnected = false;
        centralOnline = false;
        updateStatusIndicators();
        setTimeout(startClientA, 2000);
    };
    clientA.onMessageArrived = m => dashboardHandler(m.destinationName, m.payloadString);
    clientA.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => {
            mqttConnected = true;
            updateStatusIndicators();
            topicsA.forEach(t => clientA.subscribe(t));
            publish("smart_level/central/cmd", JSON.stringify({ getHistory: true }));
        }
    });
}

// ==========================================================
// CLIENTE B
// ==========================================================
const topicsB = [
    "smart_level/central/cloro_pct",
    "smart_level/central/retro_history_json",
    "smart_level/central/retrolavagem",
    "smart_level/central/nivel"
];

function startClientB() {
    clientB = new Paho.MQTT.Client(host, port, path, "clientB_" + Math.random());
    clientB.onConnectionLost = () => setTimeout(startClientB, 2000);
    clientB.onMessageArrived = m => dashboardHandler(m.destinationName, m.payloadString);
    clientB.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => topicsB.forEach(t => clientB.subscribe(t))
    });
}

// ==========================================================
// CLIENTE C – POÇOS
// ==========================================================
const topicsC = [
    "smart_level/poco1/feedback",
    "smart_level/poco2/feedback",
    "smart_level/poco3/feedback"
];

function startClientC() {
    clientC = new Paho.MQTT.Client(host, port, path, "clientC_" + Math.random());
    clientC.onMessageArrived = m => {
        const t = m.destinationName;
        const v = m.payloadString;
        if (t.includes("poco1")) { lastP1 = Date.now(); setFluxo("p1_fluxo", v); }
        if (t.includes("poco2")) { lastP2 = Date.now(); setFluxo("p2_fluxo", v); }
        if (t.includes("poco3")) { lastP3 = Date.now(); setFluxo("p3_fluxo", v); }
    };
    clientC.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => topicsC.forEach(t => clientC.subscribe(t))
    });
}

// ==========================================================
// WATCHDOG
// ==========================================================
setInterval(() => {
    const now = Date.now();
    if (now - lastP1 > OFFLINE_TIMEOUT * 1000) setFluxo("p1_fluxo", 0);
    if (now - lastP2 > OFFLINE_TIMEOUT * 1000) setFluxo("p2_fluxo", 0);
    if (now - lastP3 > OFFLINE_TIMEOUT * 1000) setFluxo("p3_fluxo", 0);
}, 2000);

// ==========================================================
// START
// ==========================================================
startClientA();
startClientB();
startClientC();
