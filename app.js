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
        if (mqttConnected) {
            mqttEl.textContent = "MQTT: Conectado";
            mqttEl.classList.remove("status-off");
            mqttEl.classList.add("status-ok");
        } else {
            mqttEl.textContent = "MQTT: Desconectado";
            mqttEl.classList.remove("status-ok");
            mqttEl.classList.add("status-off");
        }
    }

    if (centEl) {
        if (centralOnline) {
            centEl.textContent = "Central: Online";
            centEl.classList.remove("status-off");
            centEl.classList.add("status-ok");
        } else {
            centEl.textContent = "Central: Offline";
            centEl.classList.remove("status-ok");
            centEl.classList.add("status-off");
        }
    }
}

function debugLog(label, topic, payload) {
    const time = new Date().toLocaleTimeString();
    console.log(
        `%c[${label}] ${time} | ${topic} => ${payload}`,
        "color: green; font-weight: bold;"
    );
}

// ==========================================================
// HANDLER PRINCIPAL DO PAINEL
// ==========================================================
function dashboardHandler(topic, v) {
    switch (topic) {

        case "smart_level/central/sistema": {
            const isOn = (v === "1");
            setText("sistema", isOn ? "ON" : "OFF");

            const btn = document.getElementById("btnToggle");
            const txt = document.getElementById("toggleText");

            if (isOn) {
                if (btn) btn.classList.add("on");
                if (txt) txt.textContent = "Desligar Central";
            } else {
                if (btn) btn.classList.remove("on");
                if (txt) txt.textContent = "Ligar Central";
            }

            centralOnline = isOn;
            updateStatusIndicators();
            break;
        }

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

        case "smart_level/central/manual_poco":
            setText("poco_manual_sel", v);
            const sel = document.getElementById("cfg_manual_poco");
            if (sel) sel.value = v;
            break;

        case "smart_level/central/manual":
            setText("manual", v === "1" ? "MANUAL" : "AUTO");
            break;

        case "smart_level/central/rodizio_min":
            setText("rodizio_min", v);
            break;

        case "smart_level/central/p1_online":
            setOnlineStatus("p1_online", v);
            lastP1 = (v === "1") ? Date.now() : 0;
            break;

        case "smart_level/central/p2_online":
            setOnlineStatus("p2_online", v);
            lastP2 = (v === "1") ? Date.now() : 0;
            break;

        case "smart_level/central/p3_online":
            setOnlineStatus("p3_online", v);
            lastP3 = (v === "1") ? Date.now() : 0;
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

        case "smart_level/central/cloro_peso_kg":
            setText("cloro_peso", v + " kg");
            break;

        case "smart_level/central/cloro_pct":
            updateCloroBar(v);
            break;

        case "smart_level/central/retro_history_json":
            try {
                const arr = JSON.parse(v);
                history = arr.map(
                    h => `[${h.data}] início: ${h.inicio} | fim: ${h.fim}`
                );
                renderHistory();
            } catch (e) {
                console.error("ERRO ao ler retro_history_json:", e);
            }
            break;
    }
}

// ==========================================================
// CLIENTES MQTT
// ==========================================================
/* (mantidos exatamente como estavam no seu código) */

// ==========================================================
// WATCHDOG
// ==========================================================
setInterval(() => {
    const now = Date.now();

    if (lastP1 === 0 || (now - lastP1) > OFFLINE_TIMEOUT * 1000) {
        setOnlineStatus("p1_online", "0");
        setFluxo("p1_fluxo", "0");
    }
    if (lastP2 === 0 || (now - lastP2) > OFFLINE_TIMEOUT * 1000) {
        setOnlineStatus("p2_online", "0");
        setFluxo("p2_fluxo", "0");
    }
    if (lastP3 === 0 || (now - lastP3) > OFFLINE_TIMEOUT * 1000) {
        setOnlineStatus("p3_online", "0");
        setFluxo("p3_fluxo", "0");
    }
}, 2000);

// ==========================================================
// INICIAR CLIENTES
// ==========================================================
startClientA();
startClientB();
startClientC();
