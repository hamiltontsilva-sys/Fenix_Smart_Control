let client = null;

function connectMQTT() {
    const url = document.getElementById("brokerUrl").value;
    const user = document.getElementById("mqttUser").value;
    const pass = document.getElementById("mqttPass").value;

    client = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 2000
    });

    client.on("connect", () => {
        document.getElementById("connStatus").innerText = "Conectado ✔";
        subscribeTopics();
    });

    client.on("error", err => {
        document.getElementById("connStatus").innerText = "Erro de conexão";
        console.log("MQTT error:", err);
    });

    client.on("message", (topic, msg) => {
        updateUI(topic, msg.toString());
    });
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

function updateUI(topic, value) {
    const id = topic.split("/")[1]; 

    if (document.getElementById(id)) {
        document.getElementById(id).innerText = value;
    }
}

function pub(topic, payload) {
    if (!client) return alert("Conecte primeiro!");
    client.publish(topic, payload);
}

function setRetrolavagem() {
    const A = document.getElementById("retroA").value;
    const B = document.getElementById("retroB").value;

    pub("central/retroA", A);
    pub("central/retroB", B);
}
