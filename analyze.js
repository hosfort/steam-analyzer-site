// Arquivo: api/analyze.js

const axios = require('axios');

// A função exportada é o que a Vercel vai executar
module.exports = async (req, res) => {
    try {
        // Pega a URL do Steam que o frontend enviou nos parâmetros da query
        // Ex: /api/analyze?url=https://steamcommunity.com/...
        const steamUrl = req.query.url;

        if (!steamUrl ) {
            return res.status(400).json({ error: 'URL do Steam não fornecida.' });
        }

        // Extrai o AppID e o Market Hash Name da URL
        const url = new URL(steamUrl);
        const pathParts = url.pathname.split('/market/listings/');
        if (pathParts.length < 2) {
            return res.status(400).json({ error: 'URL do Steam inválida.' });
        }
        const [appId, marketHashName] = pathParts[1].split('/');

        // Monta a URL da API do Steam
        const steamApiUrl = `https://steamcommunity.com/market/pricehistory/?appid=${appId}&market_hash_name=${encodeURIComponent(marketHashName )}&country=US&currency=1`;

        // Faz a requisição para a API do Steam usando axios
        const steamResponse = await axios.get(steamApiUrl);

        // Habilita o CORS para que seu site na Hostinger possa acessar esta API
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        // Retorna os dados do Steam (apenas o array 'prices') como resposta
        res.status(200).json(steamResponse.data.prices);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha ao buscar dados do Steam.' });
    }
};
