// ==========================================================
// CONFIGURAÇÃO DE CONEXÃO
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const user = "Admin";
const pass = "Admin";

let client = null;
let inicializado = false;

// Função para facilitar a escrita na tela
const setText = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
};

// ==========================================================
// PROCESSAMENTO DOS DADOS (O que vem da Central)
// ==========================================================
function onMessage(msg) {
    if (msg.destinationName === "smart_level/central/status_geral") {
        try {
            const d = JSON.parse(msg.payloadString);

            // --- Status Geral (Dashboard) ---
            setText("sistema", d.ligado == 1 ? "LIGADO" : "DESLIGADO");
            setText("retrolavagem", d.retro == 1 ? "RETROLAVAGEM" : "CTRL. NÍVEL");
            setText("manual", d.manu == 1 ? "MANUAL" : "AUTOMÁTICO");
            setText("poco_ativo", "Poço " + d.ativo);
            setText("rodizio_min", d.cfg_rod + " min");
            
            // CORREÇÃO: Preenchendo os campos que estavam com " - "
            setText("retroA_status", "Poço " + d.cfg_ra);
            setText("retroB_status", "Poço " + d.cfg_rb);
            setText("poco_manual_sel", "P" + d.cfg_m);
            // Se o nível não vem no JSON, podemos deixar como OK se sistema ligado
            setText("nivel", d.ligado == 1 ? "OK" : "STANDBY");

            // --- Cloro ---
            setText("cloro_peso", d.cloro_kg + " kg");
            const barra = document.getElementById("cloro_bar");
            if (barra) barra.style.width = (parseFloat(d.cloro_kg) * 10) + "%"; 

            // --- Poços e Histórico ---
            const listaH = document.getElementById("history_list");
            if (listaH) listaH.innerHTML = ""; // Limpa histórico para atualizar

            d.pocos.forEach((p, i) => {
                const id = i + 1;
                
                // Dashboard Poços
                const elOn = document.getElementById(`p${id}_online`);
                if (elOn) {
                    elOn.textContent = p.on == 1 ? "ONLINE" : "OFFLINE";
                    elOn.style.color = p.on == 1 ? "#27ae60" : "#e74c3c";
                }

                // Cálculo Elétrico (kWh e Custo)
                let kwh = (p.par / 3600) * p.kw;
                let custo = kwh * d.cfg_tar;
                setText(`p${id}_timer`, (p.tot / 3600).toFixed(1) + "h");
                setText(`p${id}_kwh`, kwh.toFixed(2) + " kWh");
                setText(`p${id}_custo`, "R$ " + custo.toFixed(2));

                // Histórico (Preenche a aba Histórico)
                if (listaH) {
                    const li = document.createElement("li");
                    li.className = "history-item";
                    li.innerHTML = `<strong>Poço 0${id}</strong> <span>Uso: ${(p.tot/3600).toFixed(2)}h</span>`;
                    listaH.appendChild(li);
                }
            });

            // Sincroniza os Selects de Configuração (uma única vez)
            if (!inicializado) {
                document.getElementById("cfg_rodizio_h").value = Math.floor(d.cfg_rod / 60);
                document.getElementById("cfg_rodizio_m").value = d.cfg_rod % 60;
                document.getElementById("cfg_retroA").value = d.cfg_ra;
                document.getElementById("cfg_retroB").value = d.cfg_rb;
                document.getElementById("cfg_tarifa").value = d.cfg_tar;
                document.getElementById("cfg_manual_poco").value = d.cfg_m;
                inicializado = true;
            }

        } catch (e) { console.error("Erro JSON:", e); }
    }
}

// ==========================================================
// CONEXÃO E COMANDOS (O que vai para a Central)
// ==========================================================
function conectar() {
    client = new Paho.MQTT.Client(host, port, path, "Fenix_App_" + Math.random().toString(16).slice(2, 8));
    client.onMessageArrived = onMessage;
    client.onConnectionLost = () => { setText("mqtt_status", "MQTT: Desconectado"); setTimeout(conectar, 5000); };

    client.connect({
        useSSL: true, userName: user, password: pass,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            client.subscribe("smart_level/central/status_geral");
        }
    });
}

// Botão Salvar Operacional
document.getElementById("btnSalvarConfig").onclick = () => {
    const h = parseInt(document.getElementById("cfg_rodizio_h").value) || 0;
    const m = parseInt(document.getElementById("cfg_rodizio_m").value) || 0;
    const cmd = {
        cfg_rod: (h * 60) + m,
        cfg_ra: parseInt(document.getElementById("cfg_retroA").value),
        cfg_rb: parseInt(document.getElementById("cfg_retroB").value),
        cfg_m: document.getElementById("cfg_manual_poco").value
    };
    const msg = new Paho.MQTT.Message(JSON.stringify(cmd));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
    alert("Configuração Operacional Enviada!");
};

// Botão Salvar Elétrica
document.getElementById("btnSalvarEletrica").onclick = () => {
    const cmd = {
        config_eletrica: true,
        cfg_tar: parseFloat(document.getElementById("cfg_tarifa").value),
        p1_kw: parseFloat(document.getElementById("cfg_p1_kw").value),
        p2_kw: parseFloat(document.getElementById("cfg_p2_kw").value),
        p3_kw: parseFloat(document.getElementById("cfg_p3_kw").value)
    };
    const msg = new Paho.MQTT.Message(JSON.stringify(cmd));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
    alert("Dados Elétricos Enviados!");
};

document.getElementById("btnToggle").onclick = () => {
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
};

conectar();
