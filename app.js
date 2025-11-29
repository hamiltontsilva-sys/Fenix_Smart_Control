// =========================
// CLIENTE A
// =========================
let clientA = null;

// =========================
// CLIENTE B
// =========================
let clientB = null;


// =========================
// CONECTAR MQTT
// =========================
function connectMQTT() {
    const url = document.getElementById("brokerUrl").value;
    const user = document.getElementById("mqttUser").value;
    const pass = document.getElementById("mqttPass").value;

    document.getElementById("status").innerText = "Conectando...";

    // CLIENTE A
    clientA = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 2000
    });

    // CLIENTE B
    clientB = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 2000
    });

    // Eventos Cliente A
    clientA.on("connect", () => {
        console.log("MQTT A conectado!");
        document.getElementById("status").innerText = "Conectado ✓ (A)";
        subscribeGroupA();
    });

    // Eventos Cliente B
    clientB.on("connect", () => {
        console.log("MQTT B conectado!");
        document.getElementById("status").innerText += " + B ✓";
        subscribeGroupB();
    });

    // Recebimento Cliente A
    clientA.on("message", (topic, payload) => {
        handleMessage(topic, payload.toString());
    });

    // Recebimento Cliente B
    clientB.on("message", (topic, payload) => {
        handleMessage(topic, payload.toString());
    });
}


// =========================
// TÓPICOS DO CLIENTE A
// =========================
function subscribeGroupA() {
    const topicsA = [
        "central/sistema",
        "central/nivel",
        "central/poco_ativo",
        "central/retrolavagem",
        "central/retropocos",
        "central/p1_online",
        "central/p2_online",
        "central/p3_online",
        "pocos/fluxo1",
        "pocos/fluxo2"
    ];

    topicsA.forEach(t => {
        clientA.subscribe(t, {}, err => {
            if (err) console.error("Falhou A:", t);
            else console.log("Sub A:", t);
        });
    });
}


// =========================
// TÓPICOS DO CLIENTE B
// =========================
function subscribeGroupB() {
    const topicsB = [
        "pocos/fluxo3"
    ];

    topicsB.forEach(t => {
        clientB.subscribe(t, {}, err => {
            if (err) console.error("Falhou B:", t);
            else console.log("Sub B:", t);
        });
    });
}


// =========================
// ATUALIZAÇÃO DA INTERFACE
// =========================
function handleMessage(topic, value) {
    switch (topic) {
        case "central/sistema":
            document.getElementById("sistema").innerText = value; break;

        case "central/nivel":
            document.getElementById("nivel").innerText = value; break;

        case "central/poco_ativo":
            document.getElementById("pocoAtivo").innerText = value; break;

        case "central/retrolavagem":
            document.getElementById("retro").innerText = value; break;

        case "central/retropocos":
            document.getElementById("retropocos").innerText = value; break;

        case "central/p1_online":
            document.getElementById("p1_online").innerText = value; break;

        case "central/p2_online":
            document.getElementById("p2_online").innerText = value; break;

        case "central/p3_online":
            document.getElementById("p3_online").innerText = value; break;

        case "pocos/fluxo1":
            document.getElementById("fluxo1").innerText = value; break;

        case "pocos/fluxo2":
            document.getElementById("fluxo2").innerText = value; break;

        case "pocos/fluxo3":
            document.getElementById("fluxo3").innerText = value; break;
    }
}
