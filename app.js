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
// ESTADO MQTT / CENTRAL
// ==========================================================
let mqttConnected = false;
let centralOnline = false;

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
    el.textContent = state === "1" ? "ONLINE" : "OFFLINE";
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
// HANDLER PRINCIPAL
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
        case "smart_level/central/nivel": setText("nivel", v === "1" ? "Enchendo" : "Cheio"); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", v === "1" ? "Retrolavando" : "Controle de Nível"); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", v); break;
        case "smart_level/central/manual_poco": setText("poco_manual_sel", v); break;

        case "smart_level/central/p1_online": setOnlineStatus("p1_online", v); lastP1 = Date.now(); break;
        case "smart_level/central/p2_online": setOnlineStatus("p2_online", v); lastP2 = Date.now(); break;
        case "smart_level/central/p3_online": setOnlineStatus("p3_online", v); lastP3 = Date.now(); break;

        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", v); lastP1 = Date.now(); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", v); lastP2 = Date.now(); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", v); lastP3 = Date.now(); break;

        case "smart_level/central/p1_timer": setText("p1_timer", v); break;
        case "smart_level/central/p2_timer": setText("p2_timer", v); break;
        case "smart_level/central/p3_timer": setText("p3_timer", v); break;
    }
}

// ==========================================================
// MQTT CLIENTE A (STATUS / COMANDOS)
// ==========================================================
const topicsA = [
    "smart_level/central/sistema",
    "smart_level/central/poco_ativo",
    "smart_level/central/manual",
    "smart_level/central/rodizio_min",
    "smart_level/central/manual_poco",
    "smart_level/central/p1_online",
    "smart_level/central/p2_online",
    "smart_level/central/p3_online"
];

function startClientA() {
    clientA = new Paho.MQTT.Client(host, port, path, "A_" + Math.random());

    clientA.onConnectionLost = () => {
        mqttConnected = false;
        updateStatusIndicators();
        setTimeout(startClientA, 2000);
    };

    clientA.onMessageArrived = msg => {
        mqttConnected = true;
        updateStatusIndicators();
        dashboardHandler(msg.destinationName, msg.payloadString);
    };

    clientA.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => {
            mqttConnected = true;
            updateStatusIndicators();
            topicsA.forEach(t => clientA.subscribe(t));
        },
        onFailure: () => {
            mqttConnected = false;
            updateStatusIndicators();
            setTimeout(startClientA, 3000);
        }
    });
}

// ==========================================================
// MQTT CLIENTE B (TIMERS / HISTÓRICO)
// ==========================================================
const topicsB = [
    "smart_level/central/p1_timer",
    "smart_level/central/p2_timer",
    "smart_level/central/p3_timer"
];

function startClientB() {
    clientB = new Paho.MQTT.Client(host, port, path, "B_" + Math.random());

    clientB.onMessageArrived = msg =>
        dashboardHandler(msg.destinationName, msg.payloadString);

    clientB.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => topicsB.forEach(t => clientB.subscribe(t))
    });
}

// ==========================================================
// MQTT CLIENTE C (FLUXO – CENTRAL)
// ==========================================================
const topicsC = [
    "smart_level/central/p1_fluxo",
    "smart_level/central/p2_fluxo",
    "smart_level/central/p3_fluxo"
];

function startClientC() {
    clientC = new Paho.MQTT.Client(host, port, path, "C_" + Math.random());

    clientC.onMessageArrived = msg =>
        dashboardHandler(msg.destinationName, msg.payloadString);

    clientC.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => topicsC.forEach(t => clientC.subscribe(t))
    });
}

// ==========================================================
// PUBLICAR COMANDOS
// ==========================================================
function publish(topic, payload) {
    if (!clientA || !clientA.isConnected()) return;

    const msg = new Paho.MQTT.Message(payload);
    msg.destinationName = topic;
    clientA.send(msg);
}

// ==========================================================
// BOTÕES
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("btnToggle")?.addEventListener("click", () => {
        publish("smart_level/central/cmd", JSON.stringify({ toggle: 1 }));
    });

});

// ==========================================================
// WATCHDOG DE FLUXO
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
