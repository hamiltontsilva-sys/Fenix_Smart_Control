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

// Função para formatar e exibir o histórico
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = ""; 
        data.forEach(item => {
            const li = document.createElement("li");
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #eee";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.innerHTML = `<span>${item.date}</span> <b style="color:var(--primary)">Poço 0${item.poco}</b>`;
            list.appendChild(li);
        });
    } catch (e) { 
        console.error("Erro no Histórico:", e);
        list.innerHTML = "<p style='text-align:center; color:red;'>Erro ao processar dados</p>";
    }
}

function initMQTT() {
    const clientId = "Fenix_User_" + Math.floor(Math.random() * 9999);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    
    client.onConnectionLost = (err) => {
        setText("mqtt_status", "MQTT: Desconectado");
        document.getElementById("mqtt_status").className = "status-off";
        setTimeout(initMQTT, 5000);
    };

    client.onMessageArrived = (msg) => {
        const topic = msg.destinationName;
        const val = msg.payloadString;
        
        // Atualiza status da Central se receber qualquer mensagem
        if (topic.includes("central")) {
            setText("central_status", "Central: Online");
            document.getElementById("central_status").className = "status-on";
        }

        switch (topic) {
            case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); break;
            case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
            case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
            case "smart_level/central/rodizio_min": 
                setText("rodizio_min", val + " min");
                const h = Math.floor(val / 60);
                const m = val % 60;
                if(document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = h;
                if(document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = m;
                break;
            case "smart_level/central/retroA_status": 
                setText("retroA_status", "Poço " + val); 
                if(document.getElementById("cfg_retroA")) document.getElementById("cfg_retroA").value = val;
                break;
            case "smart_level/central/retroB_status": 
                setText("retroB_status", "Poço " + val); 
                if(document.getElementById("cfg_retroB")) document.getElementById("cfg_retroB").value = val;
                break;
            case "smart_level/central/manual_poco": 
                setText("poco_manual_sel", val); 
                if(document.getElementById("cfg_manual_poco")) document.getElementById("cfg_manual_poco").value = val;
                break;
            case "smart_level/central/retro_history_json": 
                renderHistory(val); 
                break;
            case "smart_level/central/p1_online": setText("p1_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
            case "smart_level/central/p1_fluxo": setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
            case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        }
    };

    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
        },
        onFailure: (e) => {
            console.error("Falha na conexão:", e);
            setTimeout(initMQTT, 5000);
        }
    });
}

// Inicialização segura
if (document.readyState === "complete" || document.readyState === "interactive") {
    initMQTT();
} else {
    window.addEventListener("DOMContentLoaded", initMQTT);
}
