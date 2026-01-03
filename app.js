// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT E FIREBASE
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

// Configuração do Firebase (Dados reais do seu console)
const firebaseConfig = {// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT E FIREBASE
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

// Inicialização ÚNICA do Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

// --- FUNÇÃO PARA NOTIFICAÇÃO NATIVA ---
function dispararNotificacao(titulo, msg) {
    if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: msg,
                icon: "logo.jpg",
                vibrate: [200, 100, 200],
                tag: 'alerta-fenix'
            });
        });
    }
}

// ==========================================================
// FUNÇÕES DE INTERFACE (SINCRONIZADAS COM SEU HTML)
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    btn.textContent = (state === "1") ? "DESLIGAR: Central" : "LIGAR: Central";
    // Removido classes extras para evitar erro se não existirem no CSS
}

function updateCloroBar(val) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    const pesoTxt = document.getElementById("cloro_peso");
    if (!bar || !txt) return;
    
    // Se receber o peso bruto, atualizamos o texto do peso também
    if (pesoTxt && val > 100) pesoTxt.textContent = val + " kg";
    
    // Cálculo simples de porcentagem (ajuste conforme sua lógica de peso)
    const pct = (val > 100) ? Math.floor((val/2000)*100) : val; 
    const valor = Math.max(0, Math.min(100, parseInt(pct) || 0));
    bar.style.width = valor + "%";
    txt.textContent = valor + "%";
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.style.color = isOnline ? "#00ff00" : "#ff4444";
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
        data.reverse().forEach(item => { // Inverte para ver os mais recentes primeiro
            const li = document.createElement("li");
            li.className = "history-item";
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no histórico:", e); }
}

// ==========================================================
// COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Status MQTT na Header
    setText("mqtt_status", "MQTT: Online");
    document.getElementById("mqtt_status").className = "status-on";

    if (topic === "smart_level/central/alarmes_detalhes") {
        try {
            const alarme = JSON.parse(val);
            if (alarme.status === "FALHA") {
                setText("modal-falha", alarme.falha);
                setText("modal-solucao", alarme.solucao);
                document.getElementById("alarm-modal").style.display = "flex";
                dispararNotificacao("ALERTA FÊNIX", alarme.falha);
            } else {
                document.getElementById("alarm-modal").style.display = "none";
            }
        } catch (e) { console.error("Erro JSON Alarme"); }
    }

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
        case "smart_level/central/cloro_pct": 
            updateCloroBar(val); 
            break;
        case "smart_level/central/cloro_peso": 
            setText("cloro_peso", val + " kg"); 
            break;
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;
        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", val + " min"); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    
    client.onMessageArrived = onMessage;
    client.onConnectionLost = (e) => {
        setText("mqtt_status", "MQTT: Desconectado");
        document.getElementById("mqtt_status").className = "status-off";
        setTimeout(initMQTT, 5000);
    };

    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            client.subscribe("smart_level/central/#");
            setText("mqtt_status", "MQTT: Online");
            document.getElementById("mqtt_status").className = "status-on";
            if ("Notification" in window) Notification.requestPermission();
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// Listener do Botão Ligar/Desligar Central
document.getElementById("btnToggle")?.addEventListener("click", () => {
    // Pegamos o estado atual para inverter
    const statusAtual = document.getElementById("sistema").textContent;
    const novoEstado = (statusAtual === "LIGADO") ? "0" : "1";
    const msg = new Paho.MQTT.Message(novoEstado);
    msg.destinationName = "smart_level/central/sistema/set"; // Ajustado para um tópico de comando
    client.send(msg);
});

// Listener de Salvar Configurações
document.getElementById("btnSalvarConfig")?.addEventListener("click", () => {
    const h = document.getElementById("cfg_rodizio_h").value;
    const m = document.getElementById("cfg_rodizio_m").value;
    const rA = document.getElementById("cfg_retroA").value;
    const rB = document.getElementById("cfg_retroB").value;
    const man = document.getElementById("cfg_manual_poco").value;

    const payload = JSON.stringify({ h, m, rA, rB, man });
    const msg = new Paho.MQTT.Message(payload);
    msg.destinationName = "smart_level/central/config/set";
    client.send(msg);
    alert("Configurações enviadas com sucesso!");
});

// Watchdog para dispositivos Offline
setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

initMQTT();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("Erro SW:", err));
}
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9"
};

// Inicialização ÚNICA do Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

let carregados = { rodizio: false, retroA: false, retroB: false, manual: false };

// --- FUNÇÃO PARA NOTIFICAÇÃO NATIVA (MELHORADA) ---
function dispararNotificacao(titulo, msg) {
    if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: msg,
                icon: "logo.jpg",
                vibrate: [200, 100, 200],
                tag: 'alerta-fenix'
            });
        });
    }
}

// ==========================================================
// FUNÇÕES DE INTERFACE (AS 251 LINHAS QUE VOCÊ PRECISA)
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

function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (!bar || !txt) return;
    const valor = Math.max(0, Math.min(100, parseInt(pct) || 0));
    bar.style.width = valor + "%";
    txt.textContent = valor + "%";
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

function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no histórico:", e); }
}

// ==========================================================
// COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Alertas Críticos do Firebase via MQTT
    if (topic === "smart_level/central/alarmes_detalhes") {
        try {
            const alarme = JSON.parse(val);
            if (alarme.status === "FALHA") {
                document.getElementById("modal-falha").textContent = alarme.falha;
                document.getElementById("modal-solucao").textContent = alarme.solucao;
                document.getElementById("alarm-modal").style.display = "flex";
                dispararNotificacao("ALERTA FÊNIX", alarme.falha);
            } else {
                document.getElementById("alarm-modal").style.display = "none";
            }
        } catch (e) { console.error("Erro JSON Alarme"); }
    }

    // Restante da sua lógica de monitoramento
    switch (topic) {
        case "smart_level/central/sistema": updatePowerButton(val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "ENCHIMENTO" : "CHEIO"); break;
        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;
        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            client.subscribe("smart_level/central/#");
            if ("Notification" in window) Notification.requestPermission();
        }
    });
}

// Listeners de Botões
document.getElementById("btnToggle")?.addEventListener("click", () => {
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
});

// Watchdog para dispositivos Offline
setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

// INICIALIZAÇÃO ÚNICA FINAL
initMQTT();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        console.log("Fênix: Monitoramento de segundo plano ativo!");
    });
}
