const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;

// Evita que o seletor resete enquanto o usuário está tentando mudar
let carregadoRodizio = false;

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

// Função para renderizar o histórico de retrolavagem
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr); // Espera um array de objetos [{date: "...", poco: "..."}]
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.className = "history-item";
            li.innerHTML = `<span>${item.date}</span> <b>Poço 0${item.poco}</b>`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no Histórico:", e); }
}

function initMQTT() {
    const clientId = "Fenix_User_" + Math.floor(Math.random() * 1000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    
    client.onConnectionLost = () => {
        setText("mqtt_status", "MQTT: Desconectado");
        setTimeout(initMQTT, 5000);
    };

    client.onMessageArrived = (msg) => {
        const topic = msg.destinationName;
        const val = msg.payloadString;

        switch (topic) {
            // DASHBOARD
            case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); break;
            case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
            case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
            
            // CONFIGURAÇÕES (Sincroniza os campos de seleção com a Central)
            case "smart_level/central/rodizio_min": 
                setText("rodizio_min", val + " min");
                if (!carregadoRodizio) {
                    const total = parseInt(val);
                    document.getElementById("cfg_rodizio_h").value = Math.floor(total / 60);
                    document.getElementById("cfg_rodizio_m").value = total % 60;
                    carregadoRodizio = true;
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

            // HISTÓRICO
            case "smart_level/central/retro_history_json": 
                renderHistory(val); 
                break;

            // STATUS POÇOS
            case "smart_level/central/p1_online": setText("p1_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
            case "smart_level/central/p1_fluxo": setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
            case "smart_level/central/p1_timer": setText("p1_timer", val); break;
            // (Repetir lógica para p2 e p3 conforme tópicos enviados pela sua central)
        }
    };

    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            client.subscribe("smart_level/central/#");
        }
    });
}

window.onload = initMQTT;
