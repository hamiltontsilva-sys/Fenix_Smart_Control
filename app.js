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
// WATCHDOG
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
    el.textContent = (state === "1") ? "ONLINE" : "OFFLINE";
    el.classList.add(state === "1" ? "status-online" : "status-offline");
}

function setFluxo(id, val) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("fluxo-presente", "fluxo-ausente");

    if (val === "1") {
        el.textContent = "Presente";
        el.classList.add("fluxo-presente");
    } else {
        el.textContent = "Ausente";
        el.classList.add("fluxo-ausente");
    }

    const motor = document.getElementById(id.replace("_fluxo", "_motor"));
    if (motor) motor.classList.toggle("motor-on", val === "1");
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

// ==========================================================
// HANDLER PRINCIPAL (ÚNICO)
// ==========================================================
function dashboardHandler(topic, v) {
    switch (topic) {

        case "smart_level/central/sistema":
            centralOnline = (v === "1");
            setText("sistema", centralOnline ? "ON" : "OFF");
            setText("toggleText", centralOnline ? "Desligar Central" : "Ligar Central");
            updateStatusIndicators();
            break;

        case "smart_level/central/poco_ativo": setText("poco_ativo", v); break;
        case "smart_level/central/manual": setText("manual", v === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", v); break;
        case "smart_level/central/nivel": setText("nivel", v === "1" ? "Enchendo" : "Cheio"); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", v === "1" ? "Retrolavando" : "Controle de Nível"); break;

        case "smart_level/central/retroA_status": setText("retroA_status", v); break;
        case "smart_level/central/retroB_status": setText("retroB_status", v); break;
        case "smart_level/central/manual_poco": setText("poco_manual_sel", v); break;

        // ONLINE / OFFLINE
        case "smart_level/central/p1_online": setOnlineStatus("p1_online", v); lastP1 = Date.now(); break;
        case "smart_level/central/p2_online": setOnlineStatus("p2_online", v); lastP2 = Date.now(); break;
        case "smart_level/central/p3_online": setOnlineStatus("p3_online", v); lastP3 = Date.now(); break;

        // FLUXO
        case "smart_level/central/p1_fluxo": lastP1 = Date.now(); setFluxo("p1_fluxo", v); break;
        case "smart_level/central/p2_fluxo": lastP2 = Date.now(); setFluxo("p2_fluxo", v); break;
        case "smart_level/central/p3_fluxo": lastP3 = Date.now(); setFluxo("p3_fluxo", v); break;

        // TIMERS
        case "smart_level/central/p1_timer": setText("p1_timer", v); break;
        case "smart_level/central/p2_timer": setText("p2_timer", v); break;
        case "smart_level/central/p3_timer": setText("p3_timer", v); break;

        // CLORO
        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", v + " kg"); break;
        case "smart_level/central/cloro_pct": updateCloroBar(v); break;

        // HISTÓRICO
        case "smart_level/central/retro_history_json":
            try {
                const arr = JSON.parse(v);
                history = arr.map(h => `[${h.data}] ${h.inicio} - ${h.fim}`);
                renderHistory();
            } catch {}
            break;
    }
}

// ==========================================================
// MQTT CLIENTE A — STATUS + POÇOS (9)
// ==========================================================
const topicsA = [
    "smart_level/central/sistema",
    "smart_level/central/manual",
    "smart_level/central/poco_ativo",
    "smart_level/central/rodizio_min",
    "smart_level/central/p1_online",
    "smart_level/central/p2_online",
    "smart_level/central/p3_online",
    "smart_level/central/p1_fluxo",
    "smart_level/central/p2_fluxo"
];

// ==========================================================
// MQTT CLIENTE B — PROCESSOS + HISTÓRICO (9)
// ==========================================================
const topicsB = [
    "smart_level/central/p1_timer",
    "smart_level/central/p2_timer",
    "smart_level/central/p3_timer",
    "smart_level/central/retrolavagem",
    "smart_level/central/nivel",
    "smart_level/central/retroA_status",
    "smart_level/central/retroB_status",
    "smart_level/central/retro_history_json",
    "smart_level/central/p3_fluxo"
];

// ==========================================================
// MQTT CLIENTE C — RESERVADO / FUTURO
// ==========================================================
const topicsC = [
    // reservado para expansões futuras
];

// ==========================================================
// START CLIENTES
// ==========================================================
function startClientA() {
    clientA = new Paho.MQTT.Client(host, port, path, "A_" + Math.random());
    clientA.onMessageArrived = m => dashboardHandler(m.destinationName, m.payloadString);
    clientA.onConnectionLost = () => setTimeout(startClientA, 2000);

    clientA.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => topicsA.forEach(t => clientA.subscribe(t))
    });
}

function startClientB() {
    clientB = new Paho.MQTT.Client(host, port, path, "B_" + Math.random());
    clientB.onMessageArrived = m => dashboardHandler(m.destinationName, m.payloadString);

    clientB.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => topicsB.forEach(t => clientB.subscribe(t))
    });
}

function startClientC() {
    clientC = new Paho.MQTT.Client(host, port, path, "C_" + Math.random());
    clientC.onMessageArrived = m => dashboardHandler(m.destinationName, m.payloadString);

    clientC.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => topicsC.forEach(t => clientC.subscribe(t))
    });
}

// ==========================================================
// WATCHDOG FLUXO
// ==========================================================
setInterval(() => {
    const now = Date.now();
    if (now - lastP1 > OFFLINE_TIMEOUT * 1000) setFluxo("p1_fluxo", "0");
    if (now - lastP2 > OFFLINE_TIMEOUT * 1000) setFluxo("p2_fluxo", "0");
    if (now - lastP3 > OFFLINE_TIMEOUT * 1000) setFluxo("p3_fluxo", "0");
}, 2000);

// ==========================================================
// START
// ==========================================================
startClientA();
startClientB();
startClientC();
