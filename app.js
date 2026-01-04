// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT (Mantido igual)
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

let carregados = { rodizio: false, retroA: false, retroB: false, manual: false };

// ==========================================================
// CONFIGURAÇÃO FIREBASE (ADICIONADO)
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  databaseURL: "https://fenix-smart-control-default-rtdb.firebaseio.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9",
  measurementId: "G-7Q6DZZZ9NL"
};

// Inicializa Firebase apenas se a biblioteca estiver carregada no HTML
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var messaging = firebase.messaging();
}

// ==========================================================
// FUNÇÕES DE INTERFACE (Mantido igual)
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
// LÓGICA DE HISTÓRICO (Mantido igual)
// ==========================================================
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro histórico:", e); }
}

// ==========================================================
// COMUNICAÇÃO MQTT (Mantido igual)
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    if (topic.includes("central")) {
        const statusEl = document.getElementById("central_status");
        if(statusEl) {
            setText("central_status", "Central: Online");
            statusEl.className = "status-on";
        }
    }

    switch (topic) {
        case "smart_level/central/sistema": 
            setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
            updatePowerButton(val);
            break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "ENCHIMENTO SOLICITADO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        case "smart_level/central/rodizio_min": 
            setText("rodizio_min", val + " min");
            if (!carregados.rodizio) {
                const totalMinutos = parseInt(val);
                if (document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = Math.floor(totalMinutos / 60);
                if (document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = totalMinutos % 60;
                carregados.rodizio = true;
            }
            break;
        case "smart_level/central/retroA_status": 
            setText("retroA_status", "Poço " + val);
            if (!carregados.retroA && document.getElementById("cfg_retroA")) {
                document.getElementById("cfg_retroA").value = val;
                carregados.retroA = true;
            }
            break;
        case "smart_level/central/retroB_status": 
            setText("retroB_status", "Poço " + val);
            if (!carregados.retroB && document.getElementById("cfg_retroB")) {
                document.getElementById("cfg_retroB").value = val;
                carregados.retroB = true;
            }
            break;
        case "smart_level/central/manual_poco": 
            setText("poco_manual_sel", val);
            if (!carregados.manual && document.getElementById("cfg_manual_poco")) {
                document.getElementById("cfg_manual_poco").value = val;
                carregados.manual = true;
            }
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
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = (err) => {
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

// ==========================================================
// FIREBASE NOTIFICAÇÕES (EVOLUÍDO)
// ==========================================================
async function inicializarNotificacoes() {
    if (!('serviceWorker' in navigator)) return;
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Permissão concedida para notificações.');
            
            // Registra o Service Worker (Mantendo sw.js como no seu original)
            const reg = await navigator.serviceWorker.register('sw.js');
            
            // Tenta obter o Token
            if (typeof messaging !== 'undefined') {
                const token = await messaging.getToken({
                    serviceWorkerRegistration: reg,
                    vapidKey: 'BE0nwKcod9PklpQv8gS_z3H7d3LSvsDQ3D1-keaIQf64djg_sHPpBp03IRPQ8JnXyWPr5WeGaYE3c1S-Qv9B0Bc'
                });
                if (token) {
                    console.log('SEU TOKEN:', token);
                }
            }
        }
    } catch (error) {
        console.error('Erro nas notificações:', error);
    }
}

// ==========================================================
// EVENTOS DE BOTÕES (Mantido igual)
// ==========================================================
document.getElementById("btnToggle").addEventListener("click", () => {
    if (!client || !client.connected) return;
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
});

document.getElementById("btnSalvarConfig").addEventListener("click", () => {
    if (!client || !client.connected) return;
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
    alert("Configurações enviadas!");
});

// Watchdog (Mantido igual)
setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

window.addEventListener('load', () => {
    initMQTT();
    inicializarNotificacoes();
});
