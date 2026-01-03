// CONFIGURAÇÃO MQTT
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;

// Funções Auxiliares
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

// Lógica de Histórico para evitar "undefined"
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const dataHora = item.data || item.date || "---";
            const numPoco = item.poco || item.id || "?";
            const li = document.createElement("li");
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `<span>${dataHora}</span> - <b style="color:#0047ba">Poço 0${numPoco}</b>`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no Histórico:", e); }
}

function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Status da Central
    if (topic.includes("central")) {
        setText("central_status", "CENTRAL: ONLINE");
        document.getElementById("central_status").className = "status-on";
    }

    switch (topic) {
        // TELA PRINCIPAL
        case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "CHEIO" : "SOLICITADO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        
        // POÇOS 1, 2 E 3
        case "smart_level/central/p1_online": setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": setOnlineStatus("p3_online", val); break;
        case "smart_level/central/p1_fluxo": setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p2_fluxo": setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p3_fluxo": setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;

        // CONFIGS E HISTÓRICO
        case "smart_level/central/rodizio_min": setText("rodizio_min", val + " min"); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Client_" + Math.floor(Math.random() * 1000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = () => setTimeout(initMQTT, 5000);
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: CONECTADO");
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#"); // 1 assinatura para tudo
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

window.onload = initMQTT;
