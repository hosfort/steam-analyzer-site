// Arquivo: api/analyze.js (versão final com extração de URL corrigida)

const axios = require('axios');

module.exports = async (req, res) => {
    // Habilita o CORS para qualquer resposta.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    try {
        const steamUrl = req.query.url;

        if (!steamUrl) {
            return res.status(400).json({ error: 'URL do Steam não fornecida.' });
        }

        // --- INÍCIO DA CORREÇÃO ---
        // Usamos uma expressão regular para extrair os dados da URL de forma segura.
        // Isso é mais robusto do que usar 'new URL()'.
        const match = steamUrl.match(/market\/listings\/(\d+)\/(.*)/);

        if (!match || match.length < 3) {
            return res.status(400).json({ error: 'URL do Steam com formato inválido.' });
        }

        const appId = match[1];
        const marketHashName = decodeURIComponent(match[2]); // Decodifica o nome do item
        // --- FIM DA CORREÇÃO ---

        const steamApiUrl = `https://steamcommunity.com/market/pricehistory/?appid=${appId}&market_hash_name=${encodeURIComponent(marketHashName )}&country=US&currency=1`;
        
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(steamApiUrl )}`;

        const proxyResponse = await axios.get(proxyUrl);
        
        if (!proxyResponse.data || !proxyResponse.data.contents) {
            return res.status(502).json({ error: 'Proxy não retornou conteúdo válido.' });
        }

        const steamData = JSON.parse(proxyResponse.data.contents);

        if (!steamData || !steamData.success) {
            return res.status(502).json({ error: 'API do Steam retornou uma resposta inválida.', steam_response: steamData });
        }
        
        res.status(200).json(steamData.prices);

    } catch (error) {
        console.error("Erro na função da Vercel:", error.message);
        res.status(500).json({ error: 'Falha ao processar a requisição.', details: error.message });
    }
};
