// ==========================================================
// CONFIGURAÇÃO E FIREBASE
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";

const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();

// --- NOTIFICAÇÃO ---
function dispararNotificacao(titulo, msg) {
    if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(titulo, { body: msg, icon: "logo.jpg", tag: 'alerta-fenix' });
        });
    }
}

// ==========================================================
// FUNÇÕES DE INTERFACE (CORRIGIDAS)
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = txt;
        // Se for status de erro, muda a cor
        if(txt === "FALHA") el.style.color = "#ff4444";
    }
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    btn.textContent = (state === "1") ? "DESLIGAR: Central" : "LIGAR: Central";
    btn.className = "btn-toggle-power " + (state === "1" ? "power-on" : "power-off");
}

// ==========================================================
// MQTT COM RECONEXÃO AUTOMÁTICA
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Log para você ver no console o que está chegando
    console.log("Chegou:", topic, "->", val);

    // Mapeamento direto para os IDs do seu HTML
    switch (topic) {
        case "smart_level/central/sistema": 
            setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
            updatePowerButton(val); 
            break;
        case "smart_level/central/retrolavagem": 
            setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); 
            break;
        case "smart_level/central/nivel": 
            setText("nivel", val === "1" ? "ENCHIMENTO" : "CHEIO"); 
            break;
        case "smart_level/central/p1_online": 
            lastP1 = Date.now();
            setText("p1_online", val === "1" ? "ONLINE" : "OFFLINE");
            break;
        case "smart_level/central/p1_fluxo":
            const p1M = document.getElementById("p1_motor");
            setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            if(p1M) val === "1" ? p1M.classList.add("spinning") : p1M.classList.remove("spinning");
            break;
        // Alarme Modal
        case "smart_level/central/alarmes_detalhes":
            try {
                const alarme = JSON.parse(val);
                if (alarme.status === "FALHA") {
                    document.getElementById("modal-falha").textContent = alarme.falha;
                    document.getElementById("modal-solucao").textContent = alarme.solucao;
                    document.getElementById("alarm-modal").style.display = "flex";
                    dispararNotificacao("ALERTA FÊNIX", alarme.falha);
                }
            } catch(e) {}
            break;
    }
}

function initMQTT() {
    client = new Paho.MQTT.Client(host, port, "/mqtt", "Fenix_Web_" + Math.random().toString(16).substr(2, 8));
    client.onMessageArrived = onMessage;
    client.onConnectionLost = (res) => {
        document.getElementById("mqtt_status").textContent = "MQTT: Reconectando...";
        setTimeout(initMQTT, 3000);
    };

    client.connect({
        useSSL: true,
        userName: "Admin",
        password: "Admin",
        onSuccess: () => {
            console.log("Conectado!");
            document.getElementById("mqtt_status").textContent = "MQTT: Conectado";
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
            Notification.requestPermission();
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// Inicializa
initMQTT();

// Registro do SW
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
