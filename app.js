let client = null;

function connectMQTT() {
    const url = document.getElementById("broker").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    client = mqtt.connect(url, {
        username: username,
        password: password,
        clean: true,
        reconnectPeriod: 2000,
    });

    client.on("connect", () => {
        document.getElementById("status").innerText = "Conectado ✓";
        subscribeAll();
    });

    client.on("error", (err) => {
        console.log("Erro ao conectar:", err);
        document.getElementById("status").innerText = "Erro ao conectar";
    });

    client.on("message", (topic, message) => {
        console.log("MQTT RECEBIDO ➜", topic, message.toString());
        updateUI(topic, message.toString());
    });

    client.on("close", () => {
        document.getElementById("status").innerText = "Desconectado";
    });
}

function subscribeAll() {

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
        "pocos/fluxo3",
    ];

    topics.forEach(t => {
        client.subscribe(t, {}, (err) => {
            if (err) {
                console.error("❌ Falhou subscribe:", t);
            } else {
                console.log("✔ Subscrito:", t);
            }
        });
    });
}

function updateUI(topic, value) {
    switch(topic) {
        case "central/sistema":
            document.getElementById("sistema").innerText = value;
            break;

        case "central/nivel":
            document.getElementById("nivel").innerText = value;
            break;

        case "central/poco_ativo":
            document.getElementById("pocoAtivo").innerText = value;
            break;

        case "central/retrolavagem":
            document.getElementById("retro").innerText = value;
            break;

        case "central/retropocos":
            document.getElementById("retropocos").innerText = value;
            break;

        case "central/p1_online":
            document.getElementById("p1").innerText = value;
            break;

        case "central/p2_online":
            document.getElementById("p2").innerText = value;
            break;

        case "central/p3_online":
            document.getElementById("p3").innerText = value;
            break;

        case "pocos/fluxo1":
            document.getElementById("fluxo1").innerText = value;
            break;

        case "pocos/fluxo2":
            document.getElementById("fluxo2").innerText = value;
            break;

        case "pocos/fluxo3":
            document.getElementById("fluxo3").innerText = value;
            break;
    }
}
