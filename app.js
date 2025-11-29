let client = null;

function log(txt) {
    console.log(txt);
}

function connectMQTT() {
    const url = document.getElementById("brokerUrl").value;
    const user = document.getElementById("mqttUser").value;
    const pass = document.getElementById("mqttPass").value;

    log("Conectando ao broker: " + url);

    client = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 2000
    });

    client.on("connect", () => {
        document.getElementById("connStatus").innerHTML = "Conectado ✓";
        log("MQTT conectado.");

        // Subscrições
        const topics = [
            "central/sistema",
            "central/nivel",
            "central/poco_ativo",
            "central/retrolavagem",
            "central/retropocos",
            "central/retropocos_status",
            "central/p1_online",
            "central/p2_online",
            "central/p3_online",
            "pocos/fluxo1",
            "pocos/fluxo2",
            "pocos/fluxo3"
        ];

        topics.forEach(t => client.subscribe(t));
    });

    client.on("message", (topic, payload) => {
        const msg = payload.toString();
        log("[MSG] " + topic + " = " + msg);

        // Atualização automática no HTML
        if (topic === "central/sistema")      document.getElementById("sistema").innerText = msg;
        if (topic === "central/nivel")        document.getElementById("nivel").innerText = msg;
        if (topic === "central/poco_ativo")   document.getElementById("pocoAtivo").innerText = msg;
        if (topic === "central/retrolavagem") document.getElementById("retrolav").innerText = msg;
        if (topic === "central/retropocos")   document.getElementById("retrop").innerText = msg;
        if (topic === "central/retropocos_status") document.getElementById("retropStatus").innerText = msg;

        if (topic === "central/p1_online") document.getElementById("p1").innerText = msg;
        if (topic === "central/p2_online") document.getElementById("p2").innerText = msg;
        if (topic === "central/p3_online") document.getElementById("p3").innerText = msg;

        if (topic === "pocos/fluxo1") document.getElementById("fluxo1").innerText = msg;
        if (topic === "pocos/fluxo2") document.getElementById("fluxo2").innerText = msg;
        if (topic === "pocos/fluxo3") document.getElementById("fluxo3").innerText = msg;
    });

    client.on("error", (err) => {
        log("Erro MQTT: " + err);
        document.getElementById("connStatus").innerHTML = "Erro";
    });
}

function sendCmd(topic, payload) {
    if (!client || !client.connected) {
        log("MQTT desconectado.");
        return;
    }

    client.publish(topic, payload);
    log("[PUB] " + topic + " => " + payload);
}
