// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

let carregados = {
    rodizio: false,
    retroA: false,
    retroB: false,
    manual: false
};

// ==========================================================
// FUNÇÕES DE INTERFACE
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    if (state === "1") {
        btn.textContent = "DESLIGAR: Central";
        btn.className = "btn-toggle-power power-on";
    } else {
        btn.textContent = "LIGAR: Central";
        btn.className = "btn-toggle-power power-off";
    }
}

function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (!bar || !txt) return;

    const valor = Math.max(0, Math.min(100, parseInt(pct) || 0));
    bar.style.width = valor + "%";
    txt.textContent = valor + "%";

    bar.className = "cloro-bar-fill";
    if (valor <= 20) bar.classList.add("cloro-low");
    else if (valor <= 50) bar.classList.add("cloro-mid");
    else bar.classList.add("cloro-high");
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

function setFluxo(id, val, motorId) {
    const el = document.getElementById(id);
    const motor = document.getElementById(motorId);
    if (el) el.textContent = (val === "1") ? "COM FLUXO" : "SEM FLUXO";
    if (motor) {
        if (val === "1") motor.classList.add("spinning");
        else motor.classList.remove("spinning");
    }
}

// ==========================================================
// LÓGICA DE ALARMES (NOVO)
// ==========================================================
function renderAlarm(jsonStr) {
    const container = document.getElementById("alarm_container");
    if (!container) return;

    try {
        const data = JSON.parse(jsonStr);
        
        if (data.status === "OK") {
            container.innerHTML = `
                <div style="text-align: center; color: var(--online); padding: 30px;">
                    <i data-lucide="check-circle" style="width: 45px; height: 45px; margin-bottom: 10px;"></i>
                    <p style="font-weight: 800; font-size: 16px;">SISTEMA OPERANDO OK</p>
                    <p style="font-size: 12px; color: var(--text-muted);">Nenhum alerta pendente</p>
                </div>`;
        } else {
            container.innerHTML = `
                <div class="status-grid" style="grid-template-columns: 1fr; gap: 10px;">
                    <div class="item" style="border-left: 5px solid var(--offline);">
                        <label>Equipamento com Falha:</label>
                        <div class="value">POÇO 0${data.poco}</div>
                    </div>
                    <div class="item">
                        <label>Diagnóstico:</label>
                        <div class="value status-offline">${data.falha}</div>
                    </div>
                    <div class="item" style="background: #fff5f5; border: 1px solid #fed7d7;">
                        <label>Sugestão de Reparo:</label>
                        <div class="value" style="font-size: 13px; color: #c53030; line-height: 1.4;">${data.sugestao}</div>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 10px; background: #f8fafc; border-radius: 8px; text-align: center;">
                    <p style="font-size: 11px; color: var(--text-muted); margin: 0;">
                        Resolva o problema e segure o <b>RESET</b> na central por 5s.
                    </p>
                </div>`;
        }
        lucide.createIcons();
    } catch (e) { console.error("Erro JSON Alarme:", e); }
}

// ==========================================================
// COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    if (topic.includes("central")) {
        setText("central_status", "Central: Online");
        document.getElementById("central_status").className = "status-on";
    }

    switch (topic) {
        case "smart_level/central/sistema": 
            setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
            updatePowerButton(val); 
            break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "SOLICITADO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        case "smart_level/central/rodizio_min": 
            setText("rodizio_min", val + " min");
            if (!carregados.rodizio) {
                const totalMinutos = parseInt(val);
                const h = Math.floor(totalMinutos / 60);
                const m = totalMinutos % 60;
                if (document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = h;
                if (document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = m;
                carregados.rodizio = true;
            }
            break;
        case "smart_level/central/retroA_status": 
            setText("retroA_status", "Poço " + val);
            if (!carregados.retroA) { document.getElementById("cfg_retroA").value = val; carregados.retroA = true; }
            break;
        case "smart_level/central/retroB_status": 
            setText("retroB_status", "Poço " + val);
            if (!carregados.retroB) { document.getElementById("cfg_retroB").value = val; carregados.retroB = true; }
            break;
        case "smart_level/central/manual_poco": 
            setText("poco_manual_sel", val);
            if (!carregados.manual) { document.getElementById("cfg_manual_poco").value = val; carregados.manual = true; }
            break;
        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", val + " kg"); break;
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;
        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
        case "smart_level/central/alarmes_detalhes": renderAlarm(val); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = () => {
        setText("mqtt_status", "MQTT: Reconectando...");
        document.getElementById("mqtt_status").className = "status-off";
        setTimeout(initMQTT, 5000);
    };
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

document.getElementById("btnToggle").addEventListener("click", () => {
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
});

document.getElementById("btnSalvarConfig").addEventListener("click", () => {
    const h = parseInt(document.getElementById("cfg_rodizio_h").value) || 0;
    const m = parseInt(document.getElementById("cfg_rodizio_m").value) || 0;
    const config = {
        rodizio: (h * 60) + m,
        retroA: parseInt(document.getElementById("cfg_retroA").value),
        retroB: parseInt(document.getElementById("cfg_retroB").value),
        manual_poco: document.getElementById("cfg_manual_poco").value
    };
    const msg = new Paho.MQTT.Message(JSON.stringify(config));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
    alert("Enviado!");
});

initMQTT();
