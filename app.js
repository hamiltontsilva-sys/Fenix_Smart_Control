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

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

// ==========================================================
// PROCESSAMENTO DE MENSAGENS (BASEADO NA SUA IMAGEM)
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    console.log("Processando:", topic, "->", val); //

    switch (topic) {
        // Status Geral
        case "smart_level/central/sistema": 
            setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); 
            break;
        case "smart_level/central/retrolavagem": 
            setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); 
            break;
        case "smart_level/central/nivel": 
            setText("nivel", val === "1" ? "ENCHIMENTO" : "CHEIO"); 
            break;
        case "smart_level/central/poco_ativo":
            setText("poco_ativo", "Poço " + val);
            break;
        case "smart_level/central/rodizio_min":
            setText("rodizio_min", val + " min");
            break;

        // Poço 01
        case "smart_level/central/p1_online": 
            lastP1 = Date.now();
            setText("p1_online", val === "1" ? "ONLINE" : "OFFLINE"); 
            break;
        case "smart_level/central/p1_fluxo": 
            setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            const m1 = document.getElementById("p1_motor");
            if(m1) val === "1" ? m1.classList.add("spinning") : m1.classList.remove("spinning");
            break;
        case "smart_level/central/p1_timer":
            setText("p1_timer", val);
            break;

        // Poço 02
        case "smart_level/central/p2_online": 
            lastP2 = Date.now();
            setText("p2_online", val === "1" ? "ONLINE" : "OFFLINE"); 
            break;
        case "smart_level/central/p2_fluxo": 
            setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            const m2 = document.getElementById("p2_motor");
            if(m2) val === "1" ? m2.classList.add("spinning") : m2.classList.remove("spinning");
            break;
        case "smart_level/central/p2_timer":
            setText("p2_timer", val);
            break;

        // Poço 03
        case "smart_level/central/p3_online": 
            lastP3 = Date.now();
            setText("p3_online", val === "1" ? "ONLINE" : "OFFLINE"); 
            break;
        case "smart_level/central/p3_fluxo": 
            setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            const m3 = document.getElementById("p3_motor");
            if(m3) val === "1" ? m3.classList.add("spinning") : m3.classList.remove("spinning");
            break;
        case "smart_level/central/p3_timer":
            setText("p3_timer", val);
            break;

        // Alertas e Histórico
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
// CONEXÃO
// ==========================================================
function initMQTT() {
    const cid = "Fenix_Web_" + Math.random().toString(16).substr(2, 5);
    client = new Paho.MQTT.Client(host, port, path, cid);
    client.onMessageArrived = onMessage;
    
    client.connect({
        useSSL: true,
        userName: "Admin",
        password: "Admin",
        onSuccess: () => {
            console.log("Conectado!");
            document.getElementById("mqtt_status").textContent = "MQTT: Conectado";
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

initMQTT();
