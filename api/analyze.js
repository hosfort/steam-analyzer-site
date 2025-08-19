// Arquivo: api/analyze.js (versão final com correção de URI)

const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    try {
        const steamUrl = req.query.url;

        if (!steamUrl) {
            return res.status(400).json({ error: 'URL do Steam não fornecida.' });
        }

        const match = steamUrl.match(/market\/listings\/(\d+)\/(.*)/);

        if (!match || match.length < 3) {
            return res.status(400).json({ error: 'URL do Steam com formato inválido.' });
        }

        const appId = match[1];
        // --- INÍCIO DA CORREÇÃO ---
        // O nome do item já vem decodificado do parâmetro da URL,
        // então removemos a linha 'decodeURIComponent' que estava causando o erro.
        const marketHashName = match[2];
        // --- FIM DA CORREÇÃO ---

        const steamApiUrl = `https://steamcommunity.com/market/pricehistory/?appid=${appId}&market_hash_name=${encodeURIComponent(marketHashName )}&country=US&currency=1`;
        
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${steamApiUrl}`;

        const proxyResponse = await axios.get(proxyUrl, {
            headers: {
                'Origin': 'https://anunciarvender.com.br'
            }
        } );

        const steamData = proxyResponse.data;

        if (!steamData || !steamData.success) {
            return res.status(502).json({ error: 'API do Steam retornou uma resposta inválida.', steam_response: steamData });
        }
        
        res.status(200).json(steamData.prices);

    } catch (error) {
        console.error("Erro na função da Vercel:", error.message);
        res.status(500).json({ error: 'Falha ao processar a requisição.', details: error.message });
    }
};
