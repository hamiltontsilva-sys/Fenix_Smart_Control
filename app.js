let client = null;

function connectMQTT() {
    const broker = document.getElementById('brokerUrl').value;
    const user = document.getElementById('mqttUser').value;
    const pass = document.getElementById('mqttPass').value;

    document.getElementById("connStatus").innerText = "Conectando...";

    client = mqtt.connect(broker, {
        username: user,
        password: pass,
        reconnectPeriod: 3000
    });

    client.on("connect", () => {
        document.getElementById("connStatus").innerText = "Conectado";
        subscribeTopics();
    });

    client.on("error", (err) => {
        document.getElementById("connStatus").innerText = "Erro: " + err;
    });

    client.on("message", onMessage);
}

function subscribeTopics() {
    const topics = [
        "central/sistema",
        "central/nivel",
        "central/poco_ativo",
        "central/retrolavagem",
        "central/retropocos",
        "central/p1_online",
        "central/p2_online",
        "central/p3_online",
        "pocos/fluxo1",
        "pocos/fluxo2",
        "pocos/fluxo3"
    ];

    topics.forEach(t => client.subscribe(t));
}

function onMessage(topic, msg) {
    const payload = msg.toString();

    switch (topic) {
        case "central/sistema":
            document.getElementById("sys").innerText = payload;
            break;
        case "central/nivel":
            document.getElementById("nivel").innerText = payload;
            break;
        case "central/poco_ativo":
            document.getElementById("pocoAtivo").innerText = payload;
            break;
        case "central/retrolavagem":
            document.getElementById("retro").innerText = payload;
            break;
        case "central/retropocos":
            document.getElementById("retrop").innerText = payload;
            break;
        case "central/p1_online":
            document.getElementById("p1on").innerText = payload;
            break;
        case "central/p2_online":
            document.getElementById("p2on").innerText = payload;
            break;
        case "central/p3_online":
            document.getElementById("p3on").innerText = payload;
            break;
        case "pocos/fluxo1":
            document.getElementById("f1").innerText = payload;
            break;
        case "pocos/fluxo2":
            document.getElementById("f2").innerText = payload;
            break;
        case "pocos/fluxo3":
            document.getElementById("f3").innerText = payload;
            break;
    }
}
