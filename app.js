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
const OFFLINE_TIMEOUT = 10; // Segundos

// Timestamps para Watchdog
let lastP1 = 0;
let lastP2 = 0;
let lastP3 = 0;

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    initMQTT();
    // Inicializa ícones do Lucide (caso use a biblioteca no HTML)
    if (window.lucide) lucide.createIcons();
});

// ==========================================================
// FUNÇÕES DE INTERFACE (UI)
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("status-online", "status-offline");
    // Se state for "1" ou true, fica Online
    const isOnline = (state === "1" || state === "ONLINE" || state === true);
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.classList.add(isOnline ? "status-online" : "status-offline");
}

function setFluxo(id, val, motorId) {
    const el = document.getElementById(id);
    const motor = document.getElementById(motorId);
    if (!el) return;

    if (val === "1" || val === "Fluxo OK") {
        el.textContent = "COM FLUXO";
        el.style.color = "#2ecc71";
        if (motor) motor.classList.add("spinning");
    } else {
        el.textContent = "SEM FLUXO";
        el.style.color = "#e74c3c";
        if (motor) motor.classList.remove("spinning");
    }
}

// NOVA FUNÇÃO: BARRA DE CLORO PROFISSIONAL
function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (!bar || !txt) return;

    const valor = Math.max(0, Math.min(100, parseInt(pct) || 0));
    bar.style.width = valor + "%";
    txt.textContent = valor + "%";

    // Mudança de cor dinâmica baseada no nível
    bar.classList.remove("cloro-high", "cloro-mid", "cloro-low");
    if (valor <= 20) {
        bar.classList.add("cloro-low"); // Vermelho
    } else if (valor <= 50) {
        bar.classList.add("cloro-mid"); // Amarelo
    } else {
        bar.classList.add("cloro-high"); // Verde
    }
}

// ==========================================================
// LÓGICA MQTT (Paho MQTT)
// ==========================================================
function initMQTT() {
    const clientId = "Fenix_Web_" + Math.random().toString(16).substr(2, 8);
    client = new Paho.MQTT.Client(host, port, path, clientId);

    const options = {
        useSSL: useTLS,
        userName: username,
        password: password,
        onSuccess: onConnect,
        onFailure: (err) => {
            console.error("Erro Conexão:", err);
            setText("mqtt_status", "Erro de Conexão");
        }
    };

    client.onConnectionLost = (err) => {
        setText("mqtt_status", "Desconectado");
        setText("central_status", "Offline");
        setTimeout(initMQTT, 5000);
    };

    client.onMessageArrived = onMessage;
    client.connect(options);
}

function onConnect() {
    setText("mqtt_status", "MQTT: Conectado");
    document.getElementById("mqtt_status").className = "status-on";
    
    // Subscreve em todos os tópicos da Central e dos Poços
    client.subscribe("smart_level/central/#");
    client.subscribe("smart_level/poco1/status");
    client.subscribe("smart_level/poco2/status");
    client.subscribe("smart_level/poco3/status");
    client.subscribe("smart_level/central/retro_history_json");
}

function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Status da Central (Watchdog Visual)
    if (topic.includes("central")) {
        document.getElementById("central_status").className = "status-on";
        setText("central_status", "Central: Online");
    }

    switch (topic) {
        // Status Geral
        case "smart_level/central/sistema":
            setText("sistema", (val === "1" || val === "ON") ? "LIGADO" : "DESLIGADO");
            break;
        case "smart_level/central/operacao": // Modo de operação (AUTO, MANUAL, RETRO)
            setText("retrolavagem", val);
            break;
        case "smart_level/central/nivel":
            setText("nivel", (val === "1" || val === "Cheio") ? "RESERV. CHEIO" : "PEDINDO ÁGUA");
            break;
        case "smart_level/central/poco_ativo":
            setText("poco_ativo", "Poço " + val);
            break;
        
        // Dados da Balança
        case "smart_level/central/cloro_peso_kg":
            setText("cloro_peso", val + " kg");
            break;
        case "smart_level/central/cloro_pct":
            updateCloroBar(val);
            break;

        // Status dos Poços
        case "smart_level/central/p1_online": setOnlineStatus("p1_online", val); lastP1 = Date.now(); break;
        case "smart_level/central/p2_online": setOnlineStatus("p2_online", val); lastP2 = Date.now(); break;
        case "smart_level/central/p3_online": setOnlineStatus("p3_online", val); lastP3 = Date.now(); break;

        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;

        case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;

        // Histórico de Retrolavagem
        case "smart_level/central/retro_history_json":
            renderHistory(val);
            break;
            
        // Configurações atuais (para preencher os inputs)
        case "smart_level/central/rodizio_min": setText("rodizio_min", val); break;
        case "smart_level/central/manual_sel": setText("poco_manual_sel", val); break;
        case "smart_level/central/retroA": setText("retroA_status", val); break;
        case "smart_level/central/retroB": setText("retroB_status", val); break;
    }
}

// ==========================================================
// HISTÓRICO E COMANDOS
// ==========================================================
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${item.data}</strong>: Início ${item.inicio} ➔ Fim ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no JSON de histórico"); }
}

function enviarComando(obj) {
    if (!client || !client.connected) return;
    const msg = new Paho.MQTT.Message(JSON.stringify(obj));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
}

// Evento do Botão Ligar/Desligar Central
const btnToggle = document.getElementById("btnToggle");
if (btnToggle) {
    btnToggle.addEventListener("click", () => {
        enviarComando({ toggle: true });
    });
}

// ==========================================================
// WATCHDOG (Verifica se parou de receber dados dos poços)
// ==========================================================
setInterval(() => {
    const now = Date.now();
    const timeout = OFFLINE_TIMEOUT * 1000;
    if (now - lastP1 > timeout) setOnlineStatus("p1_online", "0");
    if (now - lastP2 > timeout) setOnlineStatus("p2_online", "0");
    if (now - lastP3 > timeout) setOnlineStatus("p3_online", "0");
}, 3000);
