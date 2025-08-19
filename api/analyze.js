// Arquivo: api/analyze.js (versão atualizada)

const axios = require('axios');

module.exports = async (req, res) => {
    try {
        const steamUrl = req.query.url;

        if (!steamUrl) {
            return res.status(400).json({ error: 'URL do Steam não fornecida.' });
        }

        const url = new URL(steamUrl);
        const pathParts = url.pathname.split('/market/listings/');
        if (pathParts.length < 2) {
            return res.status(400).json({ error: 'URL do Steam inválida.' });
        }
        const [appId, marketHashName] = pathParts[1].split('/');

        const steamApiUrl = `https://steamcommunity.com/market/pricehistory/?appid=${appId}&market_hash_name=${encodeURIComponent(marketHashName )}&country=US&currency=1`;

        // --- INÍCIO DA MODIFICAÇÃO ---
        // Adicionamos um cabeçalho User-Agent para simular um navegador
        // e evitar bloqueios da API do Steam.
        const steamResponse = await axios.get(steamApiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36'
            }
        });
        // --- FIM DA MODIFICAÇÃO ---

        // Verifica se a resposta do Steam foi bem-sucedida
        if (!steamResponse.data || !steamResponse.data.success) {
             // Se o Steam retornou um erro, repassamos a mensagem
            return res.status(502).json({ error: 'API do Steam retornou uma resposta inválida.', steam_response: steamResponse.data });
        }

        // Habilita o CORS para que seu site na Hostinger possa acessar esta API
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        // Retorna os dados do Steam
        res.status(200).json(steamResponse.data.prices);

    } catch (error) {
        console.error("Erro na função da Vercel:", error.message);
        res.status(500).json({ error: 'Falha ao buscar dados do Steam.', details: error.message });
    }
};
