const MQTT_CONFIG = {
    host: "y1184ab7.ala.us-east-1.emqxsl.com",
    port: 8084, 
    user: "Admin",
    pass: "Admin",
    clientId: "Fenix_Web_" + Math.random().toString(16).substr(2, 5)
};

const client = new Paho.MQTT.Client(MQTT_CONFIG.host, Number(MQTT_CONFIG.port), MQTT_CONFIG.clientId);

// Callback de Conexão Perdida
client.onConnectionLost = (responseObject) => {
    document.getElementById("mqtt_status").innerText = "MQTT: Desconectado";
    document.getElementById("mqtt_status").className = "status-off";
    console.log("Conexão perdida, tentando reconectar...");
    setTimeout(conectar, 5000);
};

// Callback de Mensagem Recebida
client.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const payload = message.payloadString;

    // Lógica de Alarmes
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

    // Atualização de Status da Central
    document.getElementById("central_status").innerText = "Central: Online";
    document.getElementById("central_status").className = "status-on";

    // Atualizações dos IDs do HTML
    if (topic.includes("cloro_peso_kg")) document.getElementById("cloro_peso").innerText = payload + " kg";
    if (topic.includes("cloro_pct")) {
        document.getElementById("cloro_pct_txt").innerText = payload + "%";
        document.getElementById("cloro_bar").style.width = payload + "%";
    }
    if (topic.includes("sistema")) {
        const sis = document.getElementById("sistema");
        sis.innerText = payload === "1" ? "LIGADO" : "DESLIGADO";
        sis.style.color = payload === "1" ? "#00ff00" : "#ff4444";
    }
    // Adicione os outros IDs (p1_timer, nivel, etc) conforme a necessidade
};

function conectar() {
    client.connect({
        onSuccess: () => {
            document.getElementById("mqtt_status").innerText = "MQTT: Online";
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
            client.subscribe("smart_level/poco1/#");
            client.subscribe("smart_level/poco2/#");
            client.subscribe("smart_level/poco3/#");
        },
        onFailure: (err) => {
            console.error("Falha na conexão", err);
            setTimeout(conectar, 5000);
        },
        useSSL: true,
        userName: MQTT_CONFIG.user,
        password: MQTT_CONFIG.pass,
        timeout: 3,
        keepAliveInterval: 30
    });
}

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

// Comandos
document.getElementById("btnSalvarConfig").onclick = () => {
    const config = {
        rodizio: (parseInt(document.getElementById("cfg_rodizio_h").value) * 60) + parseInt(document.getElementById("cfg_rodizio_m").value)
    };
    client.send(new Paho.MQTT.Message(JSON.stringify(config), "smart_level/central/cmd"));
};

document.getElementById("btnToggle").onclick = () => {
    client.send(new Paho.MQTT.Message(JSON.stringify({toggle: true}), "smart_level/central/cmd"));
};

conectar();
