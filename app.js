const MQTT_CONFIG = {
    host: "y1184ab7.ala.us-east-1.emqxsl.com",
    port: 8084, 
    user: "Admin",
    pass: "Admin",
    clientId: "Fenix_Web_" + Math.random().toString(16).substr(2, 5)
};

const client = new Paho.MQTT.Client(MQTT_CONFIG.host, Number(MQTT_CONFIG.port), MQTT_CONFIG.clientId);

client.onConnectionLost = (responseObject) => {
    document.getElementById("mqtt_status").innerText = "MQTT: Desconectado";
    document.getElementById("mqtt_status").className = "status-off";
    setTimeout(conectar, 5000);
};

client.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const payload = message.payloadString;

    // --- LÓGICA DE ALARMES E NOTIFICAÇÕES ---
    if (topic === "smart_level/central/alarmes_detalhes") {
        try {
            const alarme = JSON.parse(payload);
            if (alarme.status === "FALHA") {
                exibirAlarme(alarme.poco, alarme.falha, alarme.solucao);
                dispararNotificacaoNativa(alarme.poco, alarme.falha);
            } else {
                fecharAlarme();
            }
        } catch(e) { console.error("Erro no JSON de alarme", e); }
    }

    // --- ATUALIZAÇÃO DO DASHBOARD (STATUS GERAL) ---
    if (topic.includes("sistema")) {
        const el = document.getElementById("sistema");
        el.innerText = payload === "1" ? "LIGADO" : "DESLIGADO";
        el.style.color = payload === "1" ? "#00ff00" : "#ff4444";
    }
    if (topic.includes("retrolavagem")) document.getElementById("retrolavagem").innerText = payload;
    if (topic.includes("nivel")) document.getElementById("nivel").innerText = payload === "1" ? "CHEIO" : "PEDINDO";
    if (topic.includes("manual")) document.getElementById("manual").innerText = payload === "1" ? "MANUAL" : "AUTO";
    if (topic.includes("retroA_status")) document.getElementById("retroA_status").innerText = payload;
    if (topic.includes("retroB_status")) document.getElementById("retroB_status").innerText = payload;
    if (topic.includes("poco_ativo")) document.getElementById("poco_ativo").innerText = "Poço " + payload;
    if (topic.includes("poco_manual_sel")) document.getElementById("poco_manual_sel").innerText = payload;
    if (topic.includes("rodizio_min")) document.getElementById("rodizio_min").innerText = payload + " min";

    // --- ATUALIZAÇÃO DOS POÇOS ---
    // Poço 1
    if (topic.includes("poco1/p1_online")) document.getElementById("p1_online").innerText = payload === "1" ? "Online" : "Offline";
    if (topic.includes("central/p1_fluxo")) {
        const motor = document.getElementById("p1_motor");
        document.getElementById("p1_fluxo").innerText = payload === "1" ? "EM FLUXO" : "PARADO";
        payload === "1" ? motor.classList.add("spinning") : motor.classList.remove("spinning");
    }
    if (topic.includes("central/p1_timer")) document.getElementById("p1_timer").innerText = payload;

    // Poço 2
    if (topic.includes("poco2/p2_online")) document.getElementById("p2_online").innerText = payload === "1" ? "Online" : "Offline";
    if (topic.includes("central/p2_fluxo")) {
        const motor = document.getElementById("p2_motor");
        document.getElementById("p2_fluxo").innerText = payload === "1" ? "EM FLUXO" : "PARADO";
        payload === "1" ? motor.classList.add("spinning") : motor.classList.remove("spinning");
    }
    if (topic.includes("central/p2_timer")) document.getElementById("p2_timer").innerText = payload;

    // Poço 3
    if (topic.includes("poco3/p3_online")) document.getElementById("p3_online").innerText = payload === "1" ? "Online" : "Offline";
    if (topic.includes("central/p3_fluxo")) {
        const motor = document.getElementById("p3_motor");
        document.getElementById("p3_fluxo").innerText = payload === "1" ? "EM FLUXO" : "PARADO";
        payload === "1" ? motor.classList.add("spinning") : motor.classList.remove("spinning");
    }
    if (topic.includes("central/p3_timer")) document.getElementById("p3_timer").innerText = payload;

    // --- CLORO ---
    if (topic.includes("cloro_peso_kg")) document.getElementById("cloro_peso").innerText = payload + " kg";
    if (topic.includes("cloro_pct")) {
        document.getElementById("cloro_pct_txt").innerText = payload + "%";
        document.getElementById("cloro_bar").style.width = payload + "%";
    }
};

function conectar() {
    client.connect({
        onSuccess: () => {
            document.getElementById("mqtt_status").innerText = "MQTT: Online";
            document.getElementById("mqtt_status").className = "status-on";
            document.getElementById("central_status").innerText = "Central: Online";
            document.getElementById("central_status").className = "status-on";
            
            // Assina todos os tópicos necessários
            client.subscribe("smart_level/central/#");
            client.subscribe("smart_level/poco1/#");
            client.subscribe("smart_level/poco2/#");
            client.subscribe("smart_level/poco3/#");
        },
        onFailure: () => setTimeout(conectar, 5000),
        useSSL: true,
        userName: MQTT_CONFIG.user,
        password: MQTT_CONFIG.pass
    });
}

// Funções Auxiliares
function exibirAlarme(poco, falha, solucao) {
    const modal = document.getElementById("alarm-modal");
    document.getElementById("modal-titulo").innerText = poco === 0 ? "ALERTA GERAL" : "FALHA POÇO " + poco;
    document.getElementById("modal-falha").innerText = falha;
    document.getElementById("modal-solucao").innerText = solucao;
    modal.style.display = "flex";
}

function fecharAlarme() {
    document.getElementById("alarm-modal").style.display = "none";
}

function dispararNotificacaoNativa(poco, falha) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(poco === 0 ? "Fênix: Alerta" : "Fênix: Falha Poço " + poco, {
            body: falha,
            icon: "logo.jpg"
        });
    }
}

conectar();
