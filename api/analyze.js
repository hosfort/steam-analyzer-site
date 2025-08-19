// Arquivo: api/analyze.js (versão final com proxy)

const axios = require('axios');

module.exports = async (req, res) => {
    // Habilita o CORS para qualquer resposta, seja de sucesso ou de erro.
    // Isso garante que seu frontend sempre receberá uma resposta.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

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

        // --- INÍCIO DA MODIFICAÇÃO PRINCIPAL ---
        // Usamos um proxy para evitar o bloqueio do Steam.
        // O AllOrigins busca a URL para nós e nos devolve o conteúdo.
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(steamApiUrl )}`;

        const proxyResponse = await axios.get(proxyUrl);

        // O AllOrigins encapsula a resposta real dentro de um campo "contents".
        // Precisamos extrair e converter essa string para JSON.
        const steamData = JSON.parse(proxyResponse.data.contents);
        // --- FIM DA MODIFICAÇÃO PRINCIPAL ---

        if (!steamData || !steamData.success) {
            return res.status(502).json({ error: 'API do Steam retornou uma resposta inválida.', steam_response: steamData });
        }
        
        // Retorna os dados de preço do Steam
        res.status(200).json(steamData.prices);

    } catch (error) {
        console.error("Erro na função da Vercel:", error.message);
        res.status(500).json({ error: 'Falha ao processar a requisição.', details: error.message });
    }
};
