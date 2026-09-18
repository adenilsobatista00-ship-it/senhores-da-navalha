const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

// Configuração da IA (Gemini)
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

// -------------------------------------------------------------
// 1. SERVIDOR WEB (Serve a Página de Agendamento)
// -------------------------------------------------------------
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barbearia do Batista - Agendamento</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; }
        body { background-color: #12151e; color: #ffffff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .container { background-color: #1a1e29; width: 100%; max-width: 420px; padding: 25px 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid rgba(212, 175, 55, 0.2); }
        .header { text-align: center; margin-bottom: 25px; }
        .header h2 { color: #d4af37; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .header h1 { color: #d4af37; font-size: 1.8rem; margin-top: 15px; text-align: left; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #e0e0e0; font-size: 0.95rem; }
        .input-container { position: relative; display: flex; align-items: center; }
        .input-container span.icon { position: absolute; left: 14px; color: #d4af37; font-size: 1.1rem; pointer-events: none; }
        .input-container input, .input-container select { width: 100%; padding: 14px 14px 14px 42px; background-color: #12151e; border: 1px solid #d4af37; border-radius: 12px; color: #ffffff; font-size: 0.95rem; outline: none; }
        .input-container select option { background-color: #1a1e29; color: #ffffff; }
        .btn-submit { width: 100%; padding: 16px; background: linear-gradient(135deg, #d4af37, #b8860b); border: none; border-radius: 25px; color: #000000; font-weight: bold; font-size: 1rem; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>✂ Barbearia do Batista ✂</h2>
            <h1>Novo<br>Agendamento</h1>
        </div>
        <form id="bookingForm">
            <div class="form-group">
                <label for="nome">Seu Nome:</label>
                <div class="input-container">
                    <span class="icon">👤</span>
                    <input type="text" id="nome" placeholder="Digite seu nome completo" required>
                </div>
            </div>
            <div class="form-group">
                <label for="whatsapp">WhatsApp:</label>
                <div class="input-container">
                    <span class="icon">💬</span>
                    <input type="tel" id="whatsapp" placeholder="(00) 00000-0000" required>
                </div>
            </div>
            <div class="form-group">
                <label for="servico">Serviço:</label>
                <div class="input-container">
                    <span class="icon">✂</span>
                    <select id="servico" required>
                        <option value="" disabled selected>Selecione um serviço</option>
                        <option value="Corte de Cabelo">Corte de Cabelo</option>
                        <option value="Barba Tradicional">Barba Tradicional</option>
                        <option value="Corte + Barba">Corte + Barba</option>
                        <option value="Sobrancelha">Sobrancelha</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label for="dataHora">Data e Horário:</label>
                <div class="input-container">
                    <span class="icon">📅</span>
                    <input type="datetime-local" id="dataHora" required>
                </div>
            </div>
            <button type="submit" class="btn-submit">CONFIRMAR AGENDAMENTO</button>
        </form>
    </div>
    <script>
        document.getElementById('bookingForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const nome = document.getElementById('nome').value;
            const whatsappCliente = document.getElementById('whatsapp').value;
            const servico = document.getElementById('servico').value;
            const dataHoraRaw = document.getElementById('dataHora').value;
            const dataObjeto = new Date(dataHoraRaw);
            const dataFormatada = dataObjeto.toLocaleDateString('pt-BR');
            const horaFormatada = dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const numeroSeu = '5548992108093';
            const mensagem = \`Olá, gostaria de agendar um horário na Barbearia do Batista!\\n\\n📌 *Nome:* \${nome}\\n📱 *WhatsApp:* \${whatsappCliente}\\n✂ *Serviço:* \${servico}\\n📅 *Data:* \${dataFormatada}\\n⏰ *Horário:* \${horaFormatada}\`;
            window.open(\`https://api.whatsapp.com/send?phone=\${numeroSeu}&text=\${encodeURIComponent(mensagem)}\`, '_blank');
        });
    </script>
</body>
</html>
    `);
});

// -------------------------------------------------------------
// 2. BOT DE IA DO WHATSAPP
// -------------------------------------------------------------
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escaneie o QR Code acima com o WhatsApp da barbearia!');
});

client.on('ready', () => {
    console.log('🤖 Bot da Barbearia do Batista ligado e pronto!');
});

client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) return;

    try {
        const systemPrompt = `Você é o assistente virtual da 'Barbearia do Batista'.
Seu objetivo é responder o cliente, confirmar agendamentos e tirar dúvidas.
Mensagem do cliente: "${msg.body}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
        });

        await msg.reply(response.text);
    } catch (err) {
        console.error('Erro na resposta da IA:', err);
    }
});

app.listen(port, () => console.log(`🌐 Site rodando na porta ${port}`));
client.initialize();
