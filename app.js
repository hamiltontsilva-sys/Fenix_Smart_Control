let client = null;

function connectMQTT() {
    const url = document.getElementById("brokerUrl").value;
    const user = document.getElementById("mqttUser").value;
    const pass = document.getElementById("mqttPass").value;

    client = mqtt.connect({
        protocol: "wss",
        hostname: url.replace("wss://", "").replace("/mqtt", ""),
        port: 8084,
        path: "/mqtt",
        username: user,
        password: pass,
        reconnectPeriod: 2000,
        clean: true
    });

    client.on("connect", () => {
        document.getElementById("status").innerText = "Conectado ✓";
        subscribeAll();
    });

    client.on("message", (topic, msg) => {
        updateUI(topic, msg.toString());
    });

    client.on("error", () => {
        document.getElementById("status").innerText = "Erro ao conectar";
    });

    client.on("close", () => {
        document.getElementById("status").innerText = "Desconectado";
    });
}

// ------------------------------------------------------------
// SUBSCRIÇÃO EM 2 BLOCOS → EVITA LIMITE DE 10 DO EMQX FREE
// ------------------------------------------------------------

function subscribeAll() {
    const block1 = [
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

    const block2 = [
        "pocos/fluxo3"
    ];

    // bloco 1 (10 tópicos)
    block1.forEach(t => {
        client.subscribe(t, {}, err => {
            if (err) console.error("Falhou subscribe:", t);
            else console.log("Subscrito:", t);
        });
    });

    // bloco 2 (depois de 300 ms)
    setTimeout(() => {
        block2.forEach(t => {
            client.subscribe(t, {}, err => {
                if (err) console.error("Falhou subscribe:", t);
                else console.log("Subscrito:", t);
            });
        });
    }, 300);
}

// ------------------------------------------------------------
// ATUALIZAÇÃO DO HTML
// ------------------------------------------------------------

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
            document.getElementById("p1_online").innerText = value;
            break;

        case "central/p2_online":
            document.getElementById("p2_online").innerText = value;
            break;

        case "central/p3_online":
            document.getElementById("p3_online").innerText = value;
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
