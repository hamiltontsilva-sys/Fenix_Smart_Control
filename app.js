// =====================
// CONFIGURAÇÃO MQTT
// =====================
let client;

function connectMQTT() {
    const broker = document.getElementById("brokerUrl").value;
    const user = document.getElementById("mqttUser").value;
    const pass = document.getElementById("mqttPass").value;

    client = mqtt.connect(broker, {
        username: user,
        password: pass,
        reconnectPeriod: 3000
    });

    // ---------------------
    // EVENTOS DE CONEXÃO
    // ---------------------
    client.on("connect", () => {
        document.getElementById("status").innerText = "Conectado ✓";

        // Assina todos os tópicos necessários
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

    client.on("error", err => {
        document.getElementById("status").innerText = "Erro: " + err;
    });

    client.on("message", (topic, payload) => {
        const msg = payload.toString();
        console.log(topic, msg);

        // ➤ STATUS GERAL
        if (topic === "central/sistema") 
            document.getElementById("sistema").innerText = msg;

        if (topic === "central/nivel")
            document.getElementById("nivel").innerText = msg;

        if (topic === "central/poco_ativo")
            document.getElementById("pocoAtivo").innerText = msg;

        if (topic === "central/retrolavagem")
            document.getElementById("retrolavagem").innerText = msg;

        if (topic === "central/retropocos")
            document.getElementById("retropocos").innerText = msg;

        if (topic === "central/retropocos_status")
            document.getElementById("retropocosStatus").innerText = msg;

        // ➤ ONLINE (alive)
        if (topic === "central/p1_online")
            document.getElementById("p1online").innerText = msg;

        if (topic === "central/p2_online")
            document.getElementById("p2online").innerText = msg;

        if (topic === "central/p3_online")
            document.getElementById("p3online").innerText = msg;

        // ➤ FLUXOS
        if (topic === "pocos/fluxo1")
            document.getElementById("fluxo1").innerText = msg;

        if (topic === "pocos/fluxo2")
            document.getElementById("fluxo2").innerText = msg;

        if (topic === "pocos/fluxo3")
            document.getElementById("fluxo3").innerText = msg;
    });
}
