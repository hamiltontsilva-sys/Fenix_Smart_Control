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
let retroHistoryLoaded = false;

// ==========================================================
// WATCHDOG / DETECÇÃO DE OFFLINE
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
    if (motorEl) motorEl.classList.toggle("motor-on", ativo);
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
// HANDLER PRINCIPAL
// ==========================================================
function dashboardHandler(topic, v) {
    switch (topic) {

        case "smart_level/central/sistema":
            centralOnline = (v === "1");
            setText("sistema", centralOnline ? "ON" : "OFF");
            updateStatusIndicators();
            break;

        case "smart_level/central/poco_ativo": setText("poco_ativo", v); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", v === "1" ? "Retrolavando" : "Controle"); break;
        case "smart_level/central/nivel": setText("nivel", v === "1" ? "Enchendo" : "Cheio"); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", v); break;

        case "smart_level/central/p1_online": setOnlineStatus("p1_online", v); lastP1 = Date.now(); break;
        case "smart_level/central/p2_online": setOnlineStatus("p2_online", v); lastP2 = Date.now(); break;
        case "smart_level/central/p3_online": setOnlineStatus("p3_online", v); lastP3 = Date.now(); break;

        case "smart_level/central/p1_timer": setText("p1_timer", v); break;
        case "smart_level/central/p2_timer": setText("p2_timer", v); break;
        case "smart_level/central/p3_timer": setText("p3_timer", v); break;

        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", v + " kg"); break;
        case "smart_level/central/cloro_pct": updateCloroBar(v); break;

        case "smart_level/central/retro_history_json":
            try {
                history = JSON.parse(v).map(h => `[${h.data}] início: ${h.inicio} | fim: ${h.fim}`);
                renderHistory();
            } catch {}
            break;
    }
}

// ==========================================================
// CLIENTES MQTT (EXATAMENTE COMO NO PRIMEIRO)
// ==========================================================
const topicsA = [
    "smart_level/central/sistema",
    "smart_level/central/poco_ativo",
    "smart_level/central/manual",
    "smart_level/central/rodizio_min",
    "smart_level/central/p1_online",
    "smart_level/central/p2_online",
    "smart_level/central/p3_online",
    "smart_level/central/manual_poco",
    "smart_level/central/cloro_peso_kg"
];

const topicsB = [
    "smart_level/central/p1_timer",
    "smart_level/central/p2_timer",
    "smart_level/central/p3_timer",
    "smart_level/central/retro_history_json",
    "smart_level/central/retrolavagem",
    "smart_level/central/nivel",
    "smart_level/central/cloro_pct"
];

const topicsC = [
    "smart_level/poco1/feedback",
    "smart_level/poco2/feedback",
    "smart_level/poco3/feedback",
    "smart_level/poco1/timer",
    "smart_level/poco2/timer",
    "smart_level/poco3/timer"
];

function startClientA() {
    clientA = new Paho.MQTT.Client(host, port, path, "clientA_" + Math.random());
    clientA.onMessageArrived = m => dashboardHandler(m.destinationName, m.payloadString);
    clientA.connect({ userName: username, password: password, useSSL: useTLS, onSuccess: () => topicsA.forEach(t => clientA.subscribe(t)) });
}

function startClientB() {
    clientB = new Paho.MQTT.Client(host, port, path, "clientB_" + Math.random());
    clientB.onMessageArrived = m => dashboardHandler(m.destinationName, m.payloadString);
    clientB.connect({ userName: username, password: password, useSSL: useTLS, onSuccess: () => topicsB.forEach(t => clientB.subscribe(t)) });
}

function startClientC() {
    clientC = new Paho.MQTT.Client(host, port, path, "clientC_" + Math.random());
    clientC.onMessageArrived = m => {
        const t = m.destinationName;
        const v = m.payloadString;
        if (t.includes("poco1")) { lastP1 = Date.now(); setFluxo("p1_fluxo", v); }
        if (t.includes("poco2")) { lastP2 = Date.now(); setFluxo("p2_fluxo", v); }
        if (t.includes("poco3")) { lastP3 = Date.now(); setFluxo("p3_fluxo", v); }
    };
    clientC.connect({ userName: username, password: password, useSSL: useTLS, onSuccess: () => topicsC.forEach(t => clientC.subscribe(t)) });
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
