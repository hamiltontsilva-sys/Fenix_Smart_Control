// =====================
// IDENTIFICAÇÃO DA VERSÃO (DEBUG)
// =====================
const appVersion = "v3.0";
console.log("APP.JS CARREGADO ->", appVersion);

// =====================
// VARIÁVEL DO CLIENTE
// =====================
let client = null;

// =====================
// CONECTAR MQTT
// =====================
function connectMQTT() {
    const url  = document.getElementById("brokerUrl").value.trim();
    const user = document.getElementById("mqttUser").value.trim();
    const pass = document.getElementById("mqttPass").value.trim();

    console.log("Conectando em:", url);

    client = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 3000
    });

    client.on("connect", () => {
        console.log("MQTT conectado!");
        document.getElementById("status").innerText = "Conectado ✓";
        subscribeAll();
    });

    client.on("error", err => {
        console.error("Erro MQTT:", err);
    });

    client.on("message", (topic, msg) => {
        console.log("MQTT RECEBIDO ➜", topic, msg.toString());
        updateUI(topic, msg.toString());
    });
}

// =====================
// ASSINAR TÓPICOS (1 POR VEZ)
// =====================
async function subscribeAll() {

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

    // assina com delay - evita limite do EMQX
    for (const t of topics) {
        await new Promise(resolve => setTimeout(resolve, 250));

        client.subscribe(t, {}, err => {
            if (err) {
                console.error("❌ Falhou subscribe:", t, err);
            } else {
                console.log("✓ Subscrito:", t);
            }
        });
    }
}

// =====================
// ATUALIZAR TELA
// =====================
function updateUI(topic, value) {

    switch (topic) {
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
