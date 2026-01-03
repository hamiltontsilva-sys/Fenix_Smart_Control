// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT (SEU CÓDIGO BASE)
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true; 
const username = "Admin";
const password = "Admin";

// --- PARÂMETROS ADICIONADOS (FIREBASE CONFIG) ---
const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9"
};

// Inicialização necessária para evitar o erro no navegador
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

let carregados = { rodizio: false, retroA: false, retroB: false, manual: false };

// --- SUA FUNÇÃO DE NOTIFICAÇÃO ---
function dispararNotificacao(titulo, msg) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(titulo, { body: msg, icon: "logo.jpg" });
    }
}

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
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
}

function setFluxo(id, val, motorId) {
    const el = document.getElementById(id);
    const motor = document.getElementById(motorId);
    if (el) el.textContent = (val === "1") ? "COM FLUXO" : "SEM FLUXO";
    if (motor && val === "1") motor.classList.add("spinning");
    else if (motor) motor.classList.remove("spinning");
}

// ==========================================================
// COMUNICAÇÃO MQTT - SUA LÓGICA ORIGINAL
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    if (topic.includes("central")) {
        setText("central_status", "Central: Online");
        const cs = document.getElementById("central_status");
        if(cs) cs.className = "status-on";
    }

    switch (topic) {
        case "smart_level/central/alarmes_detalhes":
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
            } catch (e) { console.error("Erro no JSON de alarme"); }
            break;

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
                const total = parseInt(val);
                document.getElementById("cfg_rodizio_h").value = Math.floor(total / 60);
                document.getElementById("cfg_rodizio_m").value = total % 60;
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
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = () => { setTimeout(initMQTT, 5000); };
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: true, // Forçado para segurança do navegador
        userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
            if ("Notification" in window) Notification.requestPermission();
        }
    });
}

// --- EVENT LISTENERS ORIGINAIS ---
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
    alert("Configurações enviadas!");
});

setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

initMQTT();
