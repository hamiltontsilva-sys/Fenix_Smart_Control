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

    if (val === "1" || val === 1) {
        el.textContent = "Presente";
        el.classList.add("fluxo-presente");
    } else {
        el.textContent = "Ausente";
        el.classList.add("fluxo-ausente");
    }

    const motorId = id.replace("_fluxo", "_motor");
    const motorEl = document.getElementById(motorId);
    if (motorEl) {
        motorEl.classList.toggle("motor-on", val === "1" || val === 1);
    }
}

function renderHistory() {
    const ul = document.getElementById("history_list");
    if (!ul) return;
    ul.innerHTML = "";
    history.forEach(h => {
        const li = document.createElement("li");
        li.textContent = h;
        ul.appendChild(li);
    });
}

// ==========================================================
// STATUS MQTT / CENTRAL
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
// HANDLER PRINCIPAL
// ==========================================================
function dashboardHandler(topic, v) {

    switch (topic) {

        case "smart_level/central/sistema":
            centralOnline = (v === "1");
            setText("sistema", centralOnline ? "ON" : "OFF");
            updateStatusIndicators();

            const btn = document.getElementById("btnToggle");
            const txt = document.getElementById("toggleText");
            if (btn && txt) {
                btn.classList.toggle("on", centralOnline);
                txt.textContent = centralOnline ? "Desligar Central" : "Ligar Central";
            }
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

        case "smart_level/central/retroA_status":
            setText("retroA_status", v);
            break;

        case "smart_level/central/retroB_status":
            setText("retroB_status", v);
            break;

        case "smart_level/central/manual":
            setText("manual", v === "1" ? "MANUAL" : "AUTO");
            break;

        case "smart_level/central/manual_poco":
            setText("poco_manual_sel", v);
            const sel = document.getElementById("cfg_manual_poco");
            if (sel) sel.value = v;
            break;

        case "smart_level/central/rodizio_min":
            setText("rodizio_min", v);
            break;

        case "smart_level/central/p1_online":
            setOnlineStatus("p1_online", v);
            if (v === "1") lastP1 = Date.now();
            break;

        case "smart_level/central/p2_online":
            setOnlineStatus("p2_online", v);
            if (v === "1") lastP2 = Date.now();
            break;

        case "smart_level/central/p3_online":
            setOnlineStatus("p3_online", v);
            if (v === "1") lastP3 = Date.now();
            break;

        case "smart_level/central/p1_timer":
            setText("p1_timer", v);
            break;

        case "smart_level/central/p2_timer":
            setText("p2_timer", v);
            break;

        case "smart_level/central/p3_timer":
            setText("p3_timer", v);
            break;

        case "smart_level/central/retro_history_json":
            try {
                const arr = JSON.parse(v);
                history = arr.map(h => `[${h.data}] ${h.inicio} → ${h.fim}`);
                renderHistory();
            } catch {}
            break;

        // ===============================
        // CLORO – PESO + BARRA DE NÍVEL
        // ===============================
        case "smart_level/central/cloro_peso_kg": {
            const peso = parseFloat(v);
            if (isNaN(peso)) break;

            const pesoEl = document.getElementById("cloro_peso");
            const fillEl = document.getElementById("cloro_nivel");
            const percEl = document.getElementById("cloro_percent");
            if (!pesoEl || !fillEl || !percEl) break;

            pesoEl.textContent = peso.toFixed(2) + " kg";

            const MAX_KG = 30;
            let perc = Math.max(0, Math.min((peso / MAX_KG) * 100, 100));

            fillEl.style.width = perc + "%";
            percEl.textContent = Math.round(perc) + "%";

            fillEl.className = "nivel-fill";
            if (perc > 40) fillEl.classList.add("nivel-ok");
            else if (perc > 20) fillEl.classList.add("nivel-warn");
            else fillEl.classList.add("nivel-low");

            break;
        }

        case "smart_level/central/cloro_alarme": {
            const card = document.getElementById("card_cloro");
            if (card) card.classList.toggle("alert", v === "1");
            break;
        }
    }
}

// ==========================================================
// CLIENTES MQTT
// ==========================================================
function startClient(clientId, topics, handler) {
    const c = new Paho.MQTT.Client(host, port, path, clientId);
    c.onConnectionLost = () => {
        mqttConnected = false;
        updateStatusIndicators();
        setTimeout(() => startClient(clientId, topics, handler), 2000);
    };
    c.onMessageArrived = handler;

    c.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        onSuccess: () => {
            mqttConnected = true;
            updateStatusIndicators();
            topics.forEach(t => c.subscribe(t));
        }
    });
    return c;
}

clientA = startClient("A_" + Math.random(), [
    "smart_level/central/sistema",
    "smart_level/central/poco_ativo",
    "smart_level/central/manual",
    "smart_level/central/manual_poco",
    "smart_level/central/rodizio_min",
    "smart_level/central/p1_online",
    "smart_level/central/p2_online",
    "smart_level/central/p3_online",
    "smart_level/central/cloro_peso_kg",
    "smart_level/central/cloro_alarme"
], msg => dashboardHandler(msg.destinationName, msg.payloadString));

clientB = startClient("B_" + Math.random(), [
    "smart_level/central/p1_timer",
    "smart_level/central/p2_timer",
    "smart_level/central/p3_timer",
    "smart_level/central/retro_history_json",
    "smart_level/central/retrolavagem",
    "smart_level/central/nivel",
    "smart_level/central/retroA_status",
    "smart_level/central/retroB_status"
], msg => dashboardHandler(msg.destinationName, msg.payloadString));

// ==========================================================
// PUBLICAR
// ==========================================================
function publish(topic, payload) {
    if (clientA && clientA.isConnected()) {
        const msg = new Paho.MQTT.Message(payload);
        msg.destinationName = topic;
        clientA.send(msg);
    }
}

// ==========================================================
// BOTÕES (PROTEGIDOS)
// ==========================================================
const btnSend = document.getElementById("btnSend");
if (btnSend) {
    btnSend.addEventListener("click", () => {
        publish("smart_level/central/cmd", JSON.stringify({
            rodizio: Number(document.getElementById("cfg_rodizio")?.value),
            retroA: Number(document.getElementById("cfg_retroA")?.value),
            retroB: Number(document.getElementById("cfg_retroB")?.value),
            timeout: Number(document.getElementById("cfg_timeout")?.value),
            manual_poco: Number(document.getElementById("cfg_manual_poco")?.value)
        }));
    });
}

const btnToggle = document.getElementById("btnToggle");
if (btnToggle) {
    btnToggle.addEventListener("click", () => {
        publish("smart_level/central/cmd", JSON.stringify({ toggle: 1 }));
    });
}

// ==========================================================
// WATCHDOG OFFLINE
// ==========================================================
setInterval(() => {
    const now = Date.now();
    if (now - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (now - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (now - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 2000);
