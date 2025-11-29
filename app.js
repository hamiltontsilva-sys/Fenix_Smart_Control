// -------------------------------------------
// ATENÇÃO:
// NÃO ALTEREI NADA DO QUE JÁ FUNCIONA!
// Apenas adicionei envio das novas configs
// -------------------------------------------

let clientA = null;
let clientB = null;

// Conexão automática
function connectMQTT() {

    const url = "wss://y1184ab7.ala.us-east-1.emqxsl.com:8084/mqtt";
    const username = "Admin";
    const password = "Admin";

    clientA = mqtt.connect(url, {
        username,
        password,
        reconnectPeriod: 2000
    });

    clientB = mqtt.connect(url, {
        username,
        password,
        reconnectPeriod: 2000
    });

    clientA.on("connect", () => {
        document.getElementById("status").innerText = "Conectado ✓ (A + B)";
        subscribeA();
    });

    clientB.on("connect", () => {
        console.log("MQTT B conectado");
        subscribeB();
    });

    clientA.on("message", processMessage);
    clientB.on("message", processMessage);
}

// -------------------------------------------
// ASSINATURAS — NÃO MEXI EM NADA
// -------------------------------------------

function subscribeA() {
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
        "pocos/fluxo2"
    ];

    topics.forEach(t => clientA.subscribe(t));
}

function subscribeB() {
    clientB.subscribe("pocos/fluxo3");
}

// -------------------------------------------
// TRATAMENTO DE MENSAGENS — preservado 100%
// -------------------------------------------

function processMessage(topic, msg) {
    msg = msg.toString();

    if (topic === "central/sistema")
        document.getElementById("sistema").innerText = msg === "1" ? "Ligado" : "Desligado";

    else if (topic === "central/nivel")
        document.getElementById("nivel").innerText = msg === "1" ? "Cheio" : "Enchendo";

    else if (topic === "central/poco_ativo")
        document.getElementById("pocoAtivo").innerText = msg;

    else if (topic === "central/retrolavagem")
        document.getElementById("retro").innerText = msg === "1" ? "Ligada" : "Desligada";

    else if (topic === "central/retropocos")
        document.getElementById("retropocos").innerText = msg;

    else if (topic === "central/p1_online")
        document.getElementById("p1_online").innerText = msg === "1" ? "Online" : "OFF-line";

    else if (topic === "central/p2_online")
        document.getElementById("p2_online").innerText = msg === "1" ? "Online" : "OFF-line";

    else if (topic === "central/p3_online")
        document.getElementById("p3_online").innerText = msg === "1" ? "Online" : "OFF-line";

    else if (topic === "pocos/fluxo1")
        document.getElementById("fluxo1").innerText = msg === "1" ? "Presente" : "Ausente";

    else if (topic === "pocos/fluxo2")
        document.getElementById("fluxo2").innerText = msg === "1" ? "Presente" : "Ausente";

    else if (topic === "pocos/fluxo3")
        document.getElementById("fluxo3").innerText = msg === "1" ? "Presente" : "Ausente";
}

// -------------------------------------------
// NOVA FUNÇÃO — ENVIO DAS CONFIGURAÇÕES
// -------------------------------------------

function enviarConfiguracao() {

    let pocoSel = document.getElementById("cfgPoco").value;
    let retroA = document.getElementById("cfgRetroA").value;
    let retroB = document.getElementById("cfgRetroB").value;
    let tempo  = document.getElementById("cfgTempo").value;

    clientA.publish("central/config/poco_sel", pocoSel);
    clientA.publish("central/config/retroA", retroA);
    clientA.publish("central/config/retroB", retroB);
    clientA.publish("central/config/tempo", tempo);

    alert("Configurações enviadas com sucesso!");
}

// INICIAR AUTOMÁTICO
connectMQTT();
