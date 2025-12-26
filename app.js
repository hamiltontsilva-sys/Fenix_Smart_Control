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
// DEBUG
// ==========================================================
function debugLog(label, topic, payload) {
    console.log(`[${label}] ${topic} => ${payload}`);
}

// ==========================================================
// HANDLER DASHBOARD
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
        case "smart_level/central/retrolavagem": setText("retrolavagem", v === "1" ? "Retrolavando" : "Controle de Nível"); break;
        case "smart_level/central/nivel": setText("nivel", v === "1" ? "Enchendo" : "Cheio"); break;
        case "smart_level/central/retroA_status": setText("retroA_status", v); break;
        case "smart_level/central/retroB_status": setText("retroB_status", v); break;
        case "smart_level/central/manual": setText("manual", v === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", v); break;
        case "smart_level/central/manual_poco": setText("poco_manual_sel", v); break;

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
                const arr = JSON.parse(v);
                history = arr.map(h => `[${h.data}] ${h.inicio} - ${h.fim}`);
                renderHistory();
            } catch {}
            break;
    }
}

// ==========================================================
// MQTT CLIENTE A (COMANDOS)
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

function startClientA() {
    clientA = new Paho.MQTT.Client(host, port, path, "A_" + Math.random());

    clientA.onConnectionLost = () => {
        mqttConnected = false;
        updateStatusIndicators();
        setTimeout(startClientA, 2000);
    };

    clientA.onMessageArrived = msg => {
        debugLog("A", msg.destinationName, msg.payloadString);
        dashboardHandler(msg.destinationName, msg.payloadString);
    };

    clientA.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        timeout: 4,
        onSuccess: () => {
            mqttConnected = true;
            updateStatusIndicators();
            topicsA.forEach(t => clientA.subscribe(t));
        },
        onFailure: () => {
            mqttConnected = false;
            updateStatusIndicators();
        }
    });
}

// ==========================================================
// MQTT CLIENTE B (STATUS)
// ==========================================================
const topicsB = [
    "smart_level/central/p1_timer",
    "smart_level/central/p2_timer",
    "smart_level/central/p3_timer",
    "smart_level/central/retro_history_json",
    "smart_level/central/retrolavagem",
    "smart_level/central/nivel",
    "smart_level/central/retroA_status",
    "smart_level/central/retroB_status",
    "smart_level/central/cloro_pct"
];

function startClientB() {
    clientB = new Paho.MQTT.Client(host, port, path, "B_" + Math.random());

    clientB.onConnectionLost = () => setTimeout(startClientB, 2000);

    clientB.onMessageArrived = msg =>
        dashboardHandler(msg.destinationName, msg.payloadString);

    clientB.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        timeout: 4,
        onSuccess: () => topicsB.forEach(t => clientB.subscribe(t))
    });
}

// ==========================================================
// MQTT CLIENTE C (POÇOS)
// ==========================================================
const topicsC = [
    "smart_level/poco1/feedback",
    "smart_level/poco2/feedback",
    "smart_level/poco3/feedback",
    "smart_level/poco1/timer",
    "smart_level/poco2/timer",
    "smart_level/poco3/timer"
];

function startClientC() {
    clientC = new Paho.MQTT.Client(host, port, path, "C_" + Math.random());

    clientC.onConnectionLost = () => setTimeout(startClientC, 2000);

    clientC.onMessageArrived = msg => {
        const t = msg.destinationName;
        const v = msg.payloadString;
        if (t.includes("poco1")) { lastP1 = Date.now(); setFluxo("p1_fluxo", v); }
        if (t.includes("poco2")) { lastP2 = Date.now(); setFluxo("p2_fluxo", v); }
        if (t.includes("poco3")) { lastP3 = Date.now(); setFluxo("p3_fluxo", v); }
    };

    clientC.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        timeout: 4,
        onSuccess: () => topicsC.forEach(t => clientC.subscribe(t))
    });
}

// ==========================================================
// PUBLICAR MQTT
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

    document.getElementById("btnSend")?.addEventListener("click", () => {
        const obj = {
            rodizio: Number(cfg_rodizio.value),
            timeout: Number(cfg_timeout.value),
            retroA: Number(cfg_retroA.value),
            retroB: Number(cfg_retroB.value),
            manual_poco: Number(cfg_manual_poco.value)
        };
        publish("smart_level/central/cmd", JSON.stringify(obj));
    });
});

// ==========================================================
// CONFIGURAÇÕES – CARREGAR DO DASHBOARD
// ==========================================================
function carregarConfiguracaoDoDashboard() {
    cfg_rodizio.value = rodizio_min.textContent;
    cfg_retroA.value = retroA_status.textContent;
    cfg_retroB.value = retroB_status.textContent;
    cfg_manual_poco.value = poco_manual_sel.textContent;
}

let cfgVisivel = false;
setInterval(() => {
    const aba = document.getElementById("config");
    if (!aba) return;
    const visivel = aba.classList.contains("visible");
    if (visivel && !cfgVisivel) {
        cfgVisivel = true;
        carregarConfiguracaoDoDashboard();
    }
    if (!visivel) cfgVisivel = false;
}, 300);

// ==========================================================
// WATCHDOG
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
