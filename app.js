// ============================
//  CLIENTE A (status gerais)
// ============================

let clientA = null;
let clientB = null;

function connectMQTT() {

    const url = document.getElementById("brokerUrl").value;
    const user = document.getElementById("mqttUser").value;
    const pass = document.getElementById("mqttPass").value;

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

    // =============================
    //   CLIENTE A - CONECTOU
    // =============================
    clientA.on("connect", () => {
        document.getElementById("status").innerText = "Conectado ao Servidor";
        console.log("MQTT A conectado!");

        clientA.subscribe("central/sistema");
        clientA.subscribe("central/nivel");
        clientA.subscribe("central/poco_ativo");
        clientA.subscribe("central/retrolavagem");
        clientA.subscribe("central/retropocos");
        clientA.subscribe("central/p1_online");
        clientA.subscribe("central/p2_online");
        clientA.subscribe("central/p3_online");
    });

    // =============================
    //   CLIENTE B - CONECTOU
    // =============================
    clientB.on("connect", () => {
        console.log("MQTT B conectado!");

        clientB.subscribe("pocos/fluxo1");
        clientB.subscribe("pocos/fluxo2");
        clientB.subscribe("pocos/fluxo3");
    });

    // =============================
    //   PROCESSAR MENSAGENS A
    // =============================
    clientA.on("message", (topic, msg) => {
        const value = msg.toString();
        console.log("A ➜", topic, value);

        switch(topic){

            // ----- SISTEMA -----
            case "central/sistema":
                document.getElementById("sistema").innerText =
                    value == "1" ? "Ligado" : "Desligado";
                break;

            // ----- NÍVEL -----
            case "central/nivel":
                document.getElementById("nivel").innerText =
                    value == "1" ? "Enchendo" : "Cheio";
                break;

            // ----- POÇO ATIVO -----
            case "central/poco_ativo":
                document.getElementById("pocoAtivo").innerText = value;
                break;

            // ----- RETROLAVAGEM -----
            case "central/retrolavagem":
                document.getElementById("retro").innerText =
                    value == "1" ? "Ligada" : "Desligada";
                break;

            // ----- RETROPOÇOS -----
            case "central/retropocos":
                document.getElementById("retropocos").innerText = value;
                break;

            // ----- P1/P2/P3 ONLINE -----
            case "central/p1_online":
                document.getElementById("p1_online").innerText =
                    value == "1" ? "Online" : "OFF-line";
                break;

            case "central/p2_online":
                document.getElementById("p2_online").innerText =
                    value == "1" ? "Online" : "OFF-line";
                break;

            case "central/p3_online":
                document.getElementById("p3_online").innerText =
                    value == "1" ? "Online" : "OFF-line";
                break;
        }
    });

    // =============================
    //   PROCESSAR MENSAGENS B
    // =============================
    clientB.on("message", (topic, msg) => {
        const value = msg.toString();
        console.log("B ➜", topic, value);

        switch(topic){

            case "pocos/fluxo1":
                document.getElementById("fluxo1").innerText =
                    value == "1" ? "Presente" : "Ausente";
                break;

            case "pocos/fluxo2":
                document.getElementById("fluxo2").innerText =
                    value == "1" ? "Presente" : "Ausente";
                break;

            case "pocos/fluxo3":
                document.getElementById("fluxo3").innerText =
                    value == "1" ? "Presente" : "Ausente";
                break;
        }
    });

    // =============================
    //   ERROS
    // =============================
    clientA.on("error", err => console.error("Erro A:", err));
    clientB.on("error", err => console.error("Erro B:", err));
}
