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
// ESTADO CENTRAL (ADICIONADO – NÃO AFETA LÓGICA EXISTENTE)
// ==========================================================
const centralState = {
    rodizio: null,
    retroA: null,
    retroB: null,
    timeout: null,
    manual_poco: null
};

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
    try {
        const motorId = id.replace("_fluxo", "_motor");
        const motorEl = document.getElementById(motorId);
        if (motorEl) {
            if (val === "1" || val === 1) {
                motorEl.classList.add("motor-on");
            } else {
                motorEl.classList.remove("motor-on");
            }
        }
    } catch (e) {
        console.warn("Falha ao atualizar motor icon:", e);
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
        mqttEl.classList.toggle("status-ok", mqttConnected);
        mqttEl.classList.toggle("status-off", !mqttConnected);
    }
    if (centEl) {
        centEl.textContent = centralOnline ? "Central: Online" : "Central: Offline";
        centEl.classList.toggle("status-ok", centralOnline);
        centEl.classList.toggle("status-off", !centralOnline);
    }
}

function debugLog(label, topic, payload) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${label}] ${time} | ${topic} => ${payload}`);
}

// ==========================================================
// HANDLER PRINCIPAL DO PAINEL
// ==========================================================
function dashboardHandler(topic, v) {
    switch (topic) {

        case "smart_level/central/sistema":
            centralOnline = (v === "1");
            setText("sistema", centralOnline ? "ON" : "OFF");
            updateStatusIndicators();
            break;

        case "smart_level/central/rodizio_min":
            setText("rodizio_min", v);
            centralState.rodizio = Number(v);
            break;

        case "smart_level/central/retroA_status":
            setText("retroA_status", v);
            centralState.retroA = Number(v);
            break;

        case "smart_level/central/retroB_status":
            setText("retroB_status", v);
            centralState.retroB = Number(v);
            break;

        case "smart_level/central/manual_poco":
            setText("poco_manual_sel", v);
            centralState.manual_poco = Number(v);
            const sel = document.getElementById("cfg_manual_poco");
            if (sel) sel.value = v;
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
// CLIENTES MQTT (INALTERADOS)
// ==========================================================
/* ... TODO O SEU CÓDIGO DE CLIENTE A / B / C PERMANECE IGUAL ... */

// ==========================================================
// BOTÃO ENVIAR (INALTERADO)
// ==========================================================
document.getElementById("btnSend").addEventListener("click", () => {
    const obj = {
        rodizio: Number(document.getElementById("cfg_rodizio").value),
        retroA: Number(document.getElementById("cfg_retroA").value),
        retroB: Number(document.getElementById("cfg_retroB").value),
        timeout: Number(document.getElementById("cfg_timeout").value),
        manual_poco: Number(document.getElementById("cfg_manual_poco").value)
    };
    publish("smart_level/central/cmd", JSON.stringify(obj));
});

// ==========================================================
// SINCRONIZAÇÃO DA ABA CONFIGURAÇÃO (ADICIONADO)
// ==========================================================
function loadConfigFromState() {
    if (centralState.rodizio !== null)
        document.getElementById("cfg_rodizio").value = centralState.rodizio;

    if (centralState.retroA !== null)
        document.getElementById("cfg_retroA").value = centralState.retroA;

    if (centralState.retroB !== null)
        document.getElementById("cfg_retroB").value = centralState.retroB;

    if (centralState.timeout !== null)
        document.getElementById("cfg_timeout").value = centralState.timeout;

    if (centralState.manual_poco !== null)
        document.getElementById("cfg_manual_poco").value = centralState.manual_poco;
}

// 👉 CHAME ESTA FUNÇÃO AO ABRIR A ABA CONFIGURAÇÃO
// Exemplo:
// document.getElementById("tabConfig").addEventListener("click", loadConfigFromState);

// ==========================================================
// WATCHDOG + START CLIENTES (INALTERADOS)
// ==========================================================
