// Arquivo: api/analyze.js (versão final com novo proxy)

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
        const marketHashName = decodeURIComponent(match[2]);

        const steamApiUrl = `https://steamcommunity.com/market/pricehistory/?appid=${appId}&market_hash_name=${encodeURIComponent(marketHashName )}&country=US&currency=1`;
        
        // --- INÍCIO DA MODIFICAÇÃO ---
        // Trocamos o proxy 'api.allorigins.win' por 'cors-anywhere.herokuapp.com'
        // que é outra alternativa popular.
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${steamApiUrl}`;

        // Para este proxy, precisamos enviar um cabeçalho 'Origin' para que ele funcione.
        const proxyResponse = await axios.get(proxyUrl, {
            headers: {
                'Origin': 'https://anunciarvender.com.br' // Enviamos a origem do seu site
            }
        } );

        // A resposta deste proxy vem diretamente no corpo, não encapsulada.
        const steamData = proxyResponse.data;
        // --- FIM DA MODIFICAÇÃO ---

        if (!steamData || !steamData.success) {
            return res.status(502).json({ error: 'API do Steam retornou uma resposta inválida.', steam_response: steamData });
        }
        
        res.status(200).json(steamData.prices);

    } catch (error) {
        console.error("Erro na função da Vercel:", error.message);
        res.status(500).json({ error: 'Falha ao processar a requisição.', details: error.message });
    }
};
