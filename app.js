// ==========================================================
// 1. CONFIGURAÇÃO GLOBAL E ESTADO
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

// Configuração Firebase (Sincronizada com seu projeto)
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

// ==========================================================
// 2. FUNÇÕES DE INTERFACE (UI)
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    if (state === "1") {
        btn.textContent = "DESLIGAR: CENTRAL";
        btn.className = "btn-toggle-power power-on";
    } else {
        btn.textContent = "LIGAR: CENTRAL";
        btn.className = "btn-toggle-power power-off";
    }
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

// ==========================================================
// 3. COMUNICAÇÃO MQTT (A FUNÇÃO QUE ESTAVA FALTANDO)
// ==========================================================
function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);

    client.onConnectionLost = (err) => {
        console.log("MQTT perdido, tentando reconectar...");
        setText("mqtt_status", "MQTT: DESCONECTADO");
        setTimeout(initMQTT, 5000);
    };

    client.onMessageArrived = (msg) => {
        const topic = msg.destinationName;
        const val = msg.payloadString;

        // Atualização de Status da Central
        if (topic.includes("central")) {
            setText("central_status", "Central: Online");
            const st = document.getElementById("central_status");
            if(st) st.className = "status-on";
        }

        // Lógica de tópicos
        switch (topic) {
            case "smart_level/central/sistema": updatePowerButton(val); setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); break;
            case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
            case "smart_level/central/nivel": setText("nivel", val === "1" ? "ENCHIMENTO SOLICITADO" : "CHEIO"); break;
            case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
            case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
            case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
            case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
            case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;
        }
    };

    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            console.log("MQTT Conectado!");
            setText("mqtt_status", "MQTT: CONECTADO");
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// ==========================================================
// 4. NOTIFICAÇÕES FIREBASE
// ==========================================================
async function inicializarNotificacoes() {
    if (!('serviceWorker' in navigator) || typeof firebase === 'undefined') return;
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
            const token = await messaging.getToken({ 
                serviceWorkerRegistration: reg,
                vapidKey: 'BE0nwKcod9PklpQv8gS_z3H7d3LSvsDQ3D1-keaIQf64djg_sHPpBp03IRPQ8JnXyWPr5WeGaYE3c1S-Qv9B0Bc' 
            });
            if (token) console.log("TOKEN ATIVO:", token);
        }
    } catch (e) { console.warn("Erro Firebase:", e); }
}

// ==========================================================
// 5. EVENTOS DOS BOTÕES (COM CORREÇÃO DE TRAVA)
// ==========================================================
function setupButtons() {
    const btnToggle = document.getElementById("btnToggle");
    if (btnToggle) {
        btnToggle.onclick = () => {
            // Removida a verificação rígida de 'connected' para evitar falsos travamentos
            if (client) {
                const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
                msg.destinationName = "smart_level/central/cmd";
                client.send(msg);
                console.log("Comando enviado!");
            }
        };
    }

    const btnSalvar = document.getElementById("btnSalvarConfig");
    if (btnSalvar) {
        btnSalvar.onclick = () => {
            if (client) {
                const config = {
                    rodizio: (parseInt(document.getElementById("cfg_rodizio_h").value) * 60) + parseInt(document.getElementById("cfg_rodizio_m").value),
                    retroA: parseInt(document.getElementById("cfg_retroA").value),
                    retroB: parseInt(document.getElementById("cfg_retroB").value),
                    manual_poco: document.getElementById("cfg_manual_poco").value
                };
                const msg = new Paho.MQTT.Message(JSON.stringify(config));
                msg.destinationName = "smart_level/central/cmd";
                client.send(msg);
                alert("Configurações enviadas!");
            }
        };
    }
}

// ==========================================================
// 6. INÍCIO
// ==========================================================
window.onload = () => {
    initMQTT();
    setupButtons();
    inicializarNotificacoes();
};
