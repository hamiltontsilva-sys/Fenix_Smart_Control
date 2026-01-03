// CONFIGURAÇÃO MQTT
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

// Garante que os campos de config só mudem na primeira carga para não atrapalhar o usuário
let carregados = { rodizio: false, retroA: false, retroB: false, manual: false };

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

// CORREÇÃO DO HISTÓRICO: Lida com campos 'data'/'date' e 'poco'/'id'
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const dataHora = item.data || item.date || "---";
            const numPoco = item.poco !== undefined ? item.poco : (item.id !== undefined ? item.id : "?");
            
            const li = document.createElement("li");
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #eee";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.innerHTML = `<span>${dataHora}</span> <b style="color:#0047ba">Poço 0${numPoco}</b>`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no JSON do Histórico:", e); }
}

function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Status Online da Central
    setText("central_status", "CENTRAL: ONLINE");
    document.getElementById("central_status").className = "status-on";

    switch (topic) {
        // Balança de Cloro
        case "smart_level/central/cloro_peso_kg": 
            setText("cloro_peso", val + " kg"); 
            break;
        case "smart_level/central/cloro_pct": 
            if (typeof updateCloroBar === 'function') updateCloroBar(val); 
            break;

        // Dashboard Principal
        case "smart_level/central/sistema": 
            setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
            if (typeof updatePowerButton === 'function') updatePowerButton(val);
            break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "CHEIO" : "SOLICITADO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;

        // Sincronização de Configurações (Valores Atuais)
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
            document.getElementById("cfg_retroA").value = val;
            break;
        case "smart_level/central/retroB_status": 
            setText("retroB_status", "Poço " + val);
            document.getElementById("cfg_retroB").value = val;
            break;
        case "smart_level/central/manual_poco": 
            setText("poco_manual_sel", val);
            document.getElementById("cfg_manual_poco").value = val;
            break;

        // Status dos Poços
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;

        // Histórico
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
            client.subscribe("smart_level/central/#"); // Usa apenas 1 slot de tópico
            setText("mqtt_status", "MQTT: CONECTADO");
            document.getElementById("mqtt_status").className = "status-on";
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}
window.onload = initMQTT;
