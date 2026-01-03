// ==========================================================
// CONFIGURAÇÃO RESTAURADA - 100% DOS CAMPOS
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

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

// ==========================================================
// PROCESSAMENTO COMPLETO (BASEADO NO SEU CONSOLE)
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    console.log("Recebido:", topic, "->", val);

    switch (topic) {
        // --- STATUS GERAL ---
        case "smart_level/central/sistema": setText("sistema", val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val); break;
        case "smart_level/central/nivel": setText("nivel", val); break;
        case "smart_level/central/passo": setText("passo", val); break; // Faltava este
        case "smart_level/central/operacao": setText("operacao", val); break; // Faltava este
        case "smart_level/central/poco_ativo": setText("poco_ativo", val); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", val); break;
        case "smart_level/central/manual_poco": setText("manual_poco", val); break;
        case "smart_level/central/cloro_pct": 
            const bar = document.getElementById("cloro_bar");
            if(bar) bar.style.width = val + "%";
            setText("cloro_pct_txt", val + "%");
            break;

        // --- POÇO 01 ---
        case "smart_level/central/p1_online": 
            const p1o = document.getElementById("p1_online");
            if(p1o) {
                p1o.textContent = (val === "1" ? "ONLINE" : "OFFLINE");
                p1o.className = "value " + (val === "1" ? "status-online" : "status-offline");
            }
            break;
        case "smart_level/central/p1_fluxo": 
            setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            const m1 = document.getElementById("p1_motor");
            if(m1) val === "1" ? m1.classList.add("spinning") : m1.classList.remove("spinning");
            break;
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;

        // --- POÇO 02 ---
        case "smart_level/central/p2_online": 
            const p2o = document.getElementById("p2_online");
            if(p2o) {
                p2o.textContent = (val === "1" ? "ONLINE" : "OFFLINE");
                p2o.className = "value " + (val === "1" ? "status-online" : "status-offline");
            }
            break;
        case "smart_level/central/p2_fluxo": 
            setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            const m2 = document.getElementById("p2_motor");
            if(m2) val === "1" ? m2.classList.add("spinning") : m2.classList.remove("spinning");
            break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;

        // --- POÇO 03 ---
        case "smart_level/central/p3_online": 
            const p3o = document.getElementById("p3_online");
            if(p3o) {
                p3o.textContent = (val === "1" ? "ONLINE" : "OFFLINE");
                p3o.className = "value " + (val === "1" ? "status-online" : "status-offline");
            }
            break;
        case "smart_level/central/p3_fluxo": 
            setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            const m3 = document.getElementById("p3_motor");
            if(m3) val === "1" ? m3.classList.add("spinning") : m3.classList.remove("spinning");
            break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;

        // --- ALARMES ---
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

function initMQTT() {
    client = new Paho.MQTT.Client(host, port, path, "Fenix_" + Math.random().toString(16).substr(2, 5));
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: true,
        userName: "Admin",
        password: "Admin",
        onSuccess: () => {
            document.getElementById("mqtt_status").textContent = "MQTT: Conectado";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

initMQTT();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }
