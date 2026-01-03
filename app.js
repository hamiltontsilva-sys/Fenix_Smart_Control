const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;

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

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

function renderAlarm(jsonStr) {
    const container = document.getElementById("alarm_container");
    if (!container) return;
    try {
        const data = JSON.parse(jsonStr);
        if (data.status === "OK") {
            container.innerHTML = `<div style="text-align:center;color:green;padding:20px;"><b>SISTEMA OK</b></div>`;
        } else {
            container.innerHTML = `<div style="border-left:5px solid red;padding:10px;background:#fff5f5;">
                <b>Falha:</b> ${data.falha}<br><b>Poço:</b> ${data.poco}<br><b>Ação:</b> ${data.sugestao}
            </div>`;
        }
    } catch (e) { console.error("Erro JSON Alarme", e); }
}

function initMQTT() {
    // ID aleatório para evitar quedas
    const clientId = "Fenix_" + Math.random().toString(16).substr(2, 5);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    
    client.onConnectionLost = (err) => {
        setText("mqtt_status", "MQTT: Desconectado");
        document.getElementById("mqtt_status").className = "status-off";
        setTimeout(initMQTT, 5000);
    };

    client.onMessageArrived = (msg) => {
        const topic = msg.destinationName;
        const val = msg.payloadString;
        
        if (topic.includes("central")) {
            setText("central_status", "Central: Online");
            document.getElementById("central_status").className = "status-on";
        }

        switch (topic) {
            case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); updatePowerButton(val); break;
            case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
            case "smart_level/central/nivel": setText("nivel", val === "1" ? "SOLICITADO" : "CHEIO"); break;
            case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
            case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
            case "smart_level/central/retroA_status": setText("retroA_status", "Poço " + val); break;
            case "smart_level/central/retroB_status": setText("retroB_status", "Poço " + val); break;
            case "smart_level/central/manual_poco": setText("poco_manual_sel", val); break;
            case "smart_level/central/rodizio_min": setText("rodizio_min", val + " min"); break;
            case "smart_level/central/cloro_pct": 
                if(document.getElementById("cloro_bar")) document.getElementById("cloro_bar").style.width = val + "%";
                setText("cloro_pct_txt", val + "%");
                break;
            case "smart_level/central/cloro_peso_kg": setText("cloro_peso", val + " kg"); break;
            case "smart_level/central/alarmes_detalhes": renderAlarm(val); break;
            case "smart_level/central/p1_online": setOnlineStatus("p1_online", val); break;
            case "smart_level/central/p2_online": setOnlineStatus("p2_online", val); break;
            case "smart_level/central/p3_online": setOnlineStatus("p3_online", val); break;
            case "smart_level/central/p1_fluxo": setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
            case "smart_level/central/p2_fluxo": setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
            case "smart_level/central/p3_fluxo": setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
            case "smart_level/central/p1_timer": setText("p1_timer", val); break;
            case "smart_level/central/p2_timer": setText("p2_timer", val); break;
            case "smart_level/central/p3_timer": setText("p3_timer", val); break;
        }
    };

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

// Iniciar após carregar a página
window.onload = initMQTT;
