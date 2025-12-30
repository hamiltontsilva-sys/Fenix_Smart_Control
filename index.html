<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fênix – Smart Control</title>
    <link rel="stylesheet" href="style.css" />
    <script src="https://unpkg.com/lucide@latest"></script>
</head>

<body>

<header class="top-header">
    <img src="logo.png" class="app-logo">
    <div class="header-center">
        <div class="app-title">Fênix Smart Control</div>
    </div>
    <div class="status-box">
        <div id="mqtt_status" class="status-off">MQTT: Off</div>
        <div id="central_status" class="status-off">Central: Off</div>
    </div>
</header>

<nav class="tabs">
    <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
    <button class="tab-btn" data-tab="config">Configurações</button>
</nav>

<section id="dashboard" class="tab-page visible">
    <div class="card main-status">
        <div class="card-header"><i data-lucide="activity"></i><span> Status Geral</span></div>
        <div class="status-grid">
            <div class="item"><label>Sistema:</label><div id="sistema">-</div></div>
            <div class="item"><label>Passo:</label><div id="retrolavagem">-</div></div>
            <div class="item"><label>Boia:</label><div id="nivel">-</div></div>
            <div class="item"><label>Poço Atual:</label><div id="poco_ativo">-</div></div>
            <div class="item"><label>Poços Ativos:</label><div id="poco_manual_sel">-</div></div>
            <div class="item"><label>Rodízio:</label><div id="rodizio_min">-</div></div>
        </div>
    </div>

    <div class="pocos-grid">
        <div class="card">
            <div class="card-header"><i data-lucide="server"></i><span> Poço 01</span></div>
            <div id="p1_online">-</div>
            <div class="fluxo-box"><i data-lucide="rotate-cw" id="p1_motor"></i><div id="p1_fluxo">-</div></div>
            <div id="p1_timer">-</div>
        </div>
        <div class="card">
            <div class="card-header"><i data-lucide="server"></i><span> Poço 02</span></div>
            <div id="p2_online">-</div>
            <div class="fluxo-box"><i data-lucide="rotate-cw" id="p2_motor"></i><div id="p2_fluxo">-</div></div>
            <div id="p2_timer">-</div>
        </div>
        <div class="card">
            <div class="card-header"><i data-lucide="server"></i><span> Poço 03</span></div>
            <div id="p3_online">-</div>
            <div class="fluxo-box"><i data-lucide="rotate-cw" id="p3_motor"></i><div id="p3_fluxo">-</div></div>
            <div id="p3_timer">-</div>
        </div>
    </div>
</section>

<section id="config" class="tab-page">
    <div class="card">
        <div class="card-header"><i data-lucide="settings-2"></i><span> Ajustes da Central</span></div>
        <div class="config-container">
            <div class="config-row">
                <label>Tempo de Rodízio:</label>
                <select id="cfg_rodizio">
                    <option value="10">10 min</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                </select>
            </div>
            <div class="config-row">
                <label>Retro A:</label>
                <select id="cfg_retroA">
                    <option value="1">Poço 01</option>
                    <option value="2">Poço 02</option>
                    <option value="3">Poço 03</option>
                </select>
            </div>
            <div class="config-row">
                <label>Retro B:</label>
                <select id="cfg_retroB">
                    <option value="1">Poço 01</option>
                    <option value="2">Poço 02</option>
                    <option value="3">Poço 03</option>
                </select>
            </div>
            <div class="config-row">
                <label>Poços Manuais:</label>
                <select id="cfg_manual_poco">
                    <option value="1">Poço 01</option>
                    <option value="2">Poço 02</option>
                    <option value="3">Poço 03</option>
                    <option value="12">Poços 01 e 02</option>
                    <option value="13">Poços 01 e 03</option>
                    <option value="23">Poços 02 e 03</option>
                    <option value="123">Poços 01, 02 e 03</option>
                </select>
            </div>
            <div class="config-actions">
                <button id="btnSalvarConfig" class="btn-save">Salvar na Central</button>
                <button id="btnToggle" class="btn-toggle-power">Ligar/Desligar</button>
            </div>
        </div>
    </div>
</section>

<script src="paho-mqtt.js"></script>
<script src="app.js"></script>
<script>
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('visible'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('visible');
        });
    });
    lucide.createIcons();
</script>
</body>
</html>
