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

// CORREÇÃO DO HISTÓRICO: Verifica se os campos existem antes de usar
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = ""; 
        data.forEach(item => {
            // Tenta ler 'date' ou 'data' e 'poco' ou 'id' para evitar undefined
            const dataHora = item.date || item.data || "---";
            const numPoco = item.poco || item.id || "?";
            
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

function initMQTT() {
    // Usando apenas 1 tópico com wildcard (#) para economizar slots de cliente
    const clientId = "Fenix_Client_" + Math.floor(Math.random() * 999);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    
    client.onConnectionLost = () => setTimeout(initMQTT, 5000);

    client.onMessageArrived = (msg) => {
        const topic = msg.destinationName;
        const val = msg.payloadString;
        
        // Atualiza status da Central
        setText("central_status", "CENTRAL: ONLINE");
        document.getElementById("central_status").className = "status-on";

        switch (topic) {
            // DASHBOARD PRINCIPAL
            case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); break;
            case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
            case "smart_level/central/nivel": setText("nivel", val === "1" ? "CHEIO" : "SOLICITADO"); break; // CORRIGIDO
            case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break; // CORRIGIDO
            
            // STATUS POÇOS (Adicionado 2 e 3)
            case "smart_level/central/p1_online": setText("p1_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
            case "smart_level/central/p2_online": setText("p2_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
            case "smart_level/central/p3_online": setText("p3_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
            
            case "smart_level/central/p1_fluxo": setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
            case "smart_level/central/p2_fluxo": setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
            case "smart_level/central/p3_fluxo": setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;

            // CONFIGURAÇÕES E HISTÓRICO
            case "smart_level/central/retro_history_json": renderHistory(val); break;
            case "smart_level/central/rodizio_min": setText("rodizio_min", val + " min"); break;
        }
    };

    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            client.subscribe("smart_level/central/#"); // 1 assinatura para todos os tópicos
            setText("mqtt_status", "MQTT: CONECTADO");
            document.getElementById("mqtt_status").className = "status-on";
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}
window.onload = initMQTT;
