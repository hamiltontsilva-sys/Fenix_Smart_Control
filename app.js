// ==========================================================
// 1. CONFIGURAÇÕES DE CONEXÃO (EMQX Cloud)
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const user = "Admin";
const pass = "Admin";

let client = null;
let inicializado = false; // Garante que os campos de config só preencham uma vez

// Função auxiliar para atualizar texto na tela
const atualizarTexto = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
};

// ==========================================================
// 2. PROCESSAMENTO DOS DADOS (O "CÉREBRO" DO APP)
// ==========================================================
function processarMensagem(mensagem) {
    if (mensagem.destinationName === "smart_level/central/status_geral") {
        try {
            const data = JSON.parse(mensagem.payloadString);

            // --- Status da Central ---
            atualizarTexto("sistema", data.ligado == 1 ? "LIGADO" : "DESLIGADO");
            atualizarTexto("manual", data.manu == 1 ? "MANUAL" : "AUTOMÁTICO");
            atualizarTexto("retrolavagem", data.retro == 1 ? "RETROLAVAGEM" : "CTRL. NÍVEL");
            atualizarTexto("poco_ativo", "Poço " + data.ativo);
            atualizarTexto("rodizio_min", data.cfg_rod + " min");
            atualizarTexto("poco_manual_sel", "P" + data.cfg_m);

            // --- Galão de Cloro ---
            atualizarTexto("cloro_peso", data.cloro_kg + " kg");
            const porcentagemCloro = Math.min(Math.max((data.cloro_kg / 5) * 100, 0), 100); // Ex: galão de 5kg
            const barraCloro = document.getElementById("cloro_bar");
            const textoCloroPct = document.getElementById("cloro_pct_txt");
            if (barraCloro) barraCloro.style.width = porcentagemCloro + "%";
            if (textoCloroPct) textoCloroPct.textContent = porcentagemCloro.toFixed(0) + "%";

            // --- Dados dos Poços (Array 'pocos' do JSON) ---
            data.pocos.forEach((poco, index) => {
                const pId = index + 1;
                
                // Status Online/Offline
                const elOnline = document.getElementById(`p${pId}_online`);
                if (elOnline) {
                    elOnline.textContent = poco.on == 1 ? "ONLINE" : "OFFLINE";
                    elOnline.style.color = poco.on == 1 ? "#27ae60" : "#e74c3c";
                }

                // Motor/Fluxo
                const motorIcon = document.getElementById(`p${pId}_motor`);
                if (motorIcon) {
                    if (poco.fl == 1) {
                        motorIcon.classList.add("spinning"); // Adicione essa classe no seu CSS para girar
                        atualizarTexto(`p${pId}_fluxo`, "COM FLUXO");
                    } else {
                        motorIcon.classList.remove("spinning");
                        atualizarTexto(`p${pId}_fluxo`, "SEM FLUXO");
                    }
                }

                // Timers e Energia
                atualizarTexto(`p${pId}_timer`, (poco.tot / 3600).toFixed(1) + "h");
                
                // Cálculo de kWh e Custo (kWh = Watts/1000 * horas)
                const horasParcial = poco.par / 3600;
                const kwh = horasParcial * poco.kw;
                const custo = kwh * data.cfg_tar;

                atualizarTexto(`p${pId}_kwh`, kwh.toFixed(2) + " kWh");
                atualizarTexto(`p${pId}_custo`, "R$ " + custo.toFixed(2));
            });

            // --- Sincronizar Aba de Configurações (Apenas na primeira mensagem) ---
            if (!inicializado) {
                if (document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = Math.floor(data.cfg_rod / 60);
                if (document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = data.cfg_rod % 60;
                if (document.getElementById("cfg_retroA")) document.getElementById("cfg_retroA").value = data.cfg_ra;
                if (document.getElementById("cfg_retroB")) document.getElementById("cfg_retroB").value = data.cfg_rb;
                if (document.getElementById("cfg_tarifa")) document.getElementById("cfg_tarifa").value = data.cfg_tar;
                if (document.getElementById("cfg_manual_poco")) document.getElementById("cfg_manual_poco").value = data.cfg_m;
                inicializado = true;
            }

        } catch (e) {
            console.error("Erro ao processar JSON:", e);
        }
    }
}

// ==========================================================
// 3. FUNÇÕES DE CONEXÃO MQTT
// ==========================================================
function conectarMQTT() {
    const clientId = "Fenix_App_" + Math.random().toString(16).substr(2, 8);
    client = new Paho.MQTT.Client(host, port, path, clientId);

    client.onMessageArrived = processarMensagem;
    client.onConnectionLost = (response) => {
        atualizarTexto("mqtt_status", "MQTT: Desconectado");
        console.log("Conexão perdida, tentando reconectar...", response.errorMessage);
        setTimeout(conectarMQTT, 5000);
    };

    const options = {
        useSSL: true,
        userName: user,
        password: pass,
        onSuccess: () => {
            atualizarTexto("mqtt_status", "MQTT: Conectado");
            client.subscribe("smart_level/central/status_geral");
            console.log("Inscrito no tópico com sucesso!");
        },
        onFailure: (err) => {
            console.error("Falha na conexão:", err.errorMessage);
            setTimeout(conectarMQTT, 5000);
        }
    };

    client.connect(options);
}

// ==========================================================
// 4. COMANDOS PARA A CENTRAL (ENVIAR DADOS)
// ==========================================================
function enviarComando(obj) {
    if (client && client.connected) {
        const mensagem = new Paho.MQTT.Message(JSON.stringify(obj));
        mensagem.destinationName = "smart_level/central/cmd";
        client.send(mensagem);
    }
}

// Eventos dos Botões
document.getElementById("btnToggle").onclick = () => enviarComando({ toggle: true });

document.getElementById("btnSalvarConfig").onclick = () => {
    const h = parseInt(document.getElementById("cfg_rodizio_h").value) || 0;
    const m = parseInt(document.getElementById("cfg_rodizio_m").value) || 0;
    enviarComando({
        rodizio: (h * 60) + m,
        retroA: parseInt(document.getElementById("cfg_retroA").value),
        retroB: parseInt(document.getElementById("cfg_retroB").value),
        manual_poco: document.getElementById("cfg_manual_poco").value
    });
    alert("Configurações Operacionais enviadas!");
};

document.getElementById("btnSalvarEletrica").onclick = () => {
    enviarComando({
        config_eletrica: true,
        tarifa: parseFloat(document.getElementById("cfg_tarifa").value),
        p1_kw: parseFloat(document.getElementById("cfg_p1_kw").value),
        p2_kw: parseFloat(document.getElementById("cfg_p2_kw").value),
        p3_kw: parseFloat(document.getElementById("cfg_p3_kw").value)
    });
    alert("Dados Elétricos enviados!");
};

// Iniciar conexão ao carregar
conectarMQTT();
