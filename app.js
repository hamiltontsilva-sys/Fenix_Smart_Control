// ==========================================================
// CONFIGURAÇÃO ORIGINAL - MQTT E FIREBASE
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true; 
const username = "Admin";
const password = "Admin";

// Configuração do Firebase (Necessária para as notificações funcionarem)
const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9"
};

// Inicializa o Firebase para evitar o erro de console
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

let client = null;

// --- FUNÇÃO DE TEXTO SIMPLES (COMO VOCÊ USAVA) ---
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

// ==========================================================
// PROCESSAMENTO DE MENSAGENS (DESFEITO PARA O ORIGINAL)
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Apenas repassa o valor puro para a tela, como seu ESP32 envia
    switch (topic) {
        case "smart_level/central/sistema": setText("sistema", val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val); break;
        case "smart_level/central/nivel": setText("nivel", val); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", val); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", val); break;
        case "smart_level/central/manual_poco": setText("manual_poco", val); break;
        
        // Poço 01
        case "smart_level/central/p1_online": setText("p1_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p1_fluxo": setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;

        // Poço 02
        case "smart_level/central/p2_online": setText("p2_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p2_fluxo": setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;

        // Poço 03
        case "smart_level/central/p3_online": setText("p3_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p3_fluxo": setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;

        // Lógica do Alarme Modal
        case "smart_level/central/alarmes_detalhes":
            try {
                const alarme = JSON.parse(val);
                if (alarme.status === "FALHA") {
                    document.getElementById("modal-falha").textContent = alarme.falha;
                    document.getElementById("modal-solucao").textContent = alarme.solucao;
                    document.getElementById("alarm-modal").style.display = "flex";
                } else {
                    document.getElementById("alarm-modal").style.display = "none";
                }
            } catch(e) {}
            break;
    }
}

// ==========================================================
// CONEXÃO SEGURA (ESSENCIAL PARA FUNCIONAR NO GITHUB)
// ==========================================================
function initMQTT() {
    const clientId = "Fenix_Web_" + Math.random().toString(16).substr(2, 5);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onMessageArrived = onMessage;

    client.connect({
        useSSL: true, // Necessário porque o site é HTTPS
        userName: username,
        password: password,
        onSuccess: () => {
            console.log("Conectado!");
            document.getElementById("mqtt_status").textContent = "MQTT: Conectado";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

initMQTT();

// Registro do Service Worker para o Firebase
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
