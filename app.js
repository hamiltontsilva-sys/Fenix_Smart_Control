// ==========================================================
// 1. CONFIGURAÇÃO GLOBAL - MQTT E FIREBASE
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9"
};

// Inicialização do Firebase (Evita erro de re-inicialização)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

// ==========================================================
// 2. FUNÇÕES DE INTERFACE (SINCRONIA TOTAL COM BICHADO.HTML)
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    btn.textContent = (state === "1") ? "DESLIGAR: Central" : "LIGAR: Central";
    btn.className = "btn-toggle-power " + (state === "1" ? "power-on" : "power-off");
}

function updateCloroBar(val) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (!bar || !txt) return;
    
    let pct = parseInt(val) || 0;
    pct = Math.max(0, Math.min(100, pct));
    bar.style.width = pct + "%";
    txt.textContent = pct + "%";
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
    if (el) el.textContent = (val === "1" || val === "ON") ? "COM FLUXO" : "SEM FLUXO";
    if (motor) {
        if (val === "1" || val === "ON") motor.classList.add("spinning");
        else motor.classList.remove("spinning");
    }
}

function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.reverse().forEach(item => {
            const li = document.createElement("li");
            li.className = "history-item";
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no histórico"); }
}

// ==========================================================
// 3. COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Alertas Críticos
    if (topic === "smart_level/central/alarmes_detalhes") {
        try {
            const alarme = JSON.parse(val);
            if (alarme.status === "FALHA") {
                setText("modal-falha", alarme.falha);
                setText("modal-solucao", alarme.solucao);
                document.getElementById("alarm-modal").style.display = "flex";
            } else {
                document.getElementById("alarm-modal").style.display = "none";
            }
        } catch (e) { console.error("Erro JSON Alarme"); }
    }

    // Mapeamento de Tópicos para a Interface
    switch (topic) {
        case "smart_level/central/sistema": 
            updatePowerButton(val); 
            setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
            break;
        case "smart_level/central/retrolavagem": 
            setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); 
            break;
        case "smart_level/central/nivel": 
            setText("nivel", val === "1" ? "ENCHIMENTO" : "CHEIO"); 
            break;
        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/cloro_peso": setText("cloro_peso", val + " kg"); break;
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;
        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", val + " min"); break;
        case "smart_level/central/retroA_status": setText("retroA_status", "Poço " + val); break;
        case "smart_level/central/retroB_status": setText("retroB_status", "Poço " + val); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onMessageArrived = onMessage;
    
    client.onConnectionLost = () => {
        setText("mqtt_status", "MQTT: Desconectado");
        document.getElementById("mqtt_status").className = "status-off";
        setTimeout(initMQTT, 5000);
    };

    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            client.subscribe("smart_level/central/#");
            setText("mqtt_status", "MQTT: Conectado");
            document.getElementById("mqtt_status").className = "status-on";
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// Listeners de Comandos
document.getElementById("btnToggle")?.addEventListener("click", () => {
    const status = document.getElementById("sistema").textContent;
    const cmd = (status === "LIGADO") ? "0" : "1";
    const msg = new Paho.MQTT.Message(cmd);
    msg.destinationName = "smart_level/central/sistema/set";
    client.send(msg);
});

document.getElementById("btnSalvarConfig")?.addEventListener("click", () => {
    const config = {
        h: document.getElementById("cfg_rodizio_h").value,
        m: document.getElementById("cfg_rodizio_m").value,
        rA: document.getElementById("cfg_retroA").value,
        rB: document.getElementById("cfg_retroB").value,
        man: document.getElementById("cfg_manual_poco").value
    };
    const msg = new Paho.MQTT.Message(JSON.stringify(config));
    msg.destinationName = "smart_level/central/config/set";
    client.send(msg);
    alert("Configurações enviadas!");
});

// Watchdog
setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

initMQTT();
