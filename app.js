// ==========================================================
// CONFIGURAÇÃO RESTAURADA (VOLTANDO AO QUE FUNCIONAVA)
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true; 
const username = "Admin";
const password = "Admin";

// Mantemos o Firebase apenas para o navegador não travar
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

// Função simples que você usava para escrever na tela
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

// ==========================================================
// SUA LÓGICA ORIGINAL DE MENSAGENS
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Repassa os valores exatamente como o ESP32 envia
    switch (topic) {
        case "smart_level/central/sistema": setText("sistema", val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val); break;
        case "smart_level/central/nivel": setText("nivel", val); break;
        case "smart_level/central/passo": setText("passo", val); break;
        case "smart_level/central/operacao": setText("operacao", val); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", val); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", val); break;
        case "smart_level/central/manual_poco": setText("manual_poco", val); break;
        
        // Status dos Poços (Texto e Cor)
        case "smart_level/central/p1_online": 
            const p1 = document.getElementById("p1_online");
            if(p1) { p1.textContent = (val === "1" ? "ONLINE" : "OFFLINE"); p1.className = "value " + (val === "1" ? "status-online" : "status-offline"); }
            break;
        case "smart_level/central/p1_fluxo": setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;

        case "smart_level/central/p2_online": 
            const p2 = document.getElementById("p2_online");
            if(p2) { p2.textContent = (val === "1" ? "ONLINE" : "OFFLINE"); p2.className = "value " + (val === "1" ? "status-online" : "status-offline"); }
            break;
        case "smart_level/central/p2_fluxo": setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;

        case "smart_level/central/p3_online": 
            const p3 = document.getElementById("p3_online");
            if(p3) { p3.textContent = (val === "1" ? "ONLINE" : "OFFLINE"); p3.className = "value " + (val === "1" ? "status-online" : "status-offline"); }
            break;
        case "smart_level/central/p3_fluxo": setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;

        // Lógica do Cloro
        case "smart_level/central/cloro_pct": 
            const bar = document.getElementById("cloro_bar");
            if(bar) bar.style.width = val + "%";
            setText("cloro_pct_txt", val + "%");
            break;

        // Seu Modal de Alarme
        case "smart_level/central/alarmes_detalhes":
            try {
                const alarme = JSON.parse(val);
                if (alarme.status === "FALHA") {
                    document.getElementById("modal-falha").textContent = alarme.falha;
                    document.getElementById("modal-solucao").textContent = alarme.solucao;
                    document.getElementById("alarm-modal").style.display = "flex";
                }
            } catch(e) {}
            break;
    }
}

// ==========================================================
// CONEXÃO SEGURA 8084
// ==========================================================
function initMQTT() {
    client = new Paho.MQTT.Client(host, port, path, "Fenix_" + Math.random().toString(16).substr(2, 4));
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: true, // Necessário para o GitHub Pages
        userName: username, password: password,
        onSuccess: () => {
            document.getElementById("mqtt_status").textContent = "MQTT: Conectado";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

initMQTT();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }
