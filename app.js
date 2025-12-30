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
let lastCentral = Date.now();
const OFFLINE_TIMEOUT = 45; // Segundos para considerar offline

// ==========================================================
// FUNÇÕES DE INTERFACE
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
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
// COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Watchdog Central - Qualquer mensagem prova que a central está viva
    lastCentral = Date.now();
    setText("central_status", "Central: Online");
    document.getElementById("central_status").className = "status-on";

    switch (topic) {
        // Status Geral
        case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "PRODUÇÃO"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "CHEIO" : "PEDINDO ÁGUA"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        
        // Configurações (Sincroniza os Selects)
        case "smart_level/central/rodizio_min": 
            setText("rodizio_min", val + " min");
            document.getElementById("cfg_rodizio").value = val; 
            break;
        case "smart_level/central/retroA_status": 
            setText("retroA_status", "Poço " + val); 
            document.getElementById("cfg_retroA").value = val;
            break;
        case "smart_level/central/retroB_status": 
            setText("retroB_status", "Poço " + val); 
            document.getElementById("cfg_retroB").value = val;
            break;
        case "smart_level/central/manual_poco": 
            setText("poco_manual_sel", val == "0" ? "AUTO" : "Poço " + val); 
            document.getElementById("cfg_manual_poco").value = val;
            break;

        // Cloro
        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", val + " kg"); break;

        // Poços Status
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;

        // Poços Fluxo
        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;

        // Timers
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.random().toString(16).substr(2, 8);
    client = new Paho.MQTT.Client(host, port, path, clientId);

    client.onConnectionLost = () => {
        setText("mqtt_status", "MQTT: Desconectado");
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

// Botão Salvar Configurações
document.getElementById("btnSalvarConfig").addEventListener("click", () => {
    const config = {
        rodizio: parseInt(document.getElementById("cfg_rodizio").value),
        retroA: parseInt(document.getElementById("cfg_retroA").value),
        retroB: parseInt(document.getElementById("cfg_retroB").value),
        manual_poco: document.getElementById("cfg_manual_poco").value
    };
    const msg = new Paho.MQTT.Message(JSON.stringify(config));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
    alert("Configurações enviadas para a Central!");
});

// Botão Ligar/Desligar Central (Power)
document.getElementById("btnToggle").addEventListener("click", () => {
    const msg = new Paho.MQTT.Message("toggle");
    msg.destinationName = "smart_level/central/cmd_power";
    client.send(msg);
    alert("Comando Ligar/Desligar enviado!");
});

// Watchdog - Monitorização de Saúde do Sistema
setInterval(() => {
    const agora = Date.now();
    const timeoutMs = OFFLINE_TIMEOUT * 1000;

    if (agora - lastP1 > timeoutMs) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > timeoutMs) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > timeoutMs) setOnlineStatus("p3_online", "0");

    if (agora - lastCentral > timeoutMs) {
        setText("central_status", "Central: Offline");
        document.getElementById("central_status").className = "status-off";
    }
}, 5000);

initMQTT();
