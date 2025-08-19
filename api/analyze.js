// Arquivo: api/analyze.js (versão final com correção de codificação)

const https = require('https' );
const { URL } = require('url');
const zlib = require('zlib');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://anunciarvender.com.br' );
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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
        const marketHashName = match[2];

        // --- INÍCIO DA CORREÇÃO ---
        // Removemos o 'encodeURIComponent' porque o 'marketHashName' já vem codificado
        // da URL do query parameter.
        const steamApiUrl = `https://steamcommunity.com/market/pricehistory/?appid=${appId}&market_hash_name=${marketHashName}&country=US&currency=1`;
        // --- FIM DA CORREÇÃO ---
        
        const steamData = await makeHttpsRequest(steamApiUrl );

        if (!steamData || !steamData.success) {
            return res.status(502).json({ 
                error: 'API do Steam retornou uma resposta inválida.',
                steam_response: steamData 
            });
        }
        
        res.status(200).json(steamData.prices);

    } catch (error) {
        console.error("Erro na função da Vercel:", error.message);
        res.status(500).json({ 
            error: 'Falha ao processar a requisição.', 
            details: error.message 
        });
    }
};

// A função makeHttpsRequest continua a mesma, não precisa ser alterada.
function makeHttpsRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://steamcommunity.com/market/',
            }
        };

        const req = https.request(options, (res ) => {
            let data = '';
            let stream = res;
            if (res.headers['content-encoding'] === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            } else if (res.headers['content-encoding'] === 'deflate') {
                stream = res.pipe(zlib.createInflate());
            } else if (res.headers['content-encoding'] === 'br') {
                stream = res.pipe(zlib.createBrotliDecompress());
            }

            stream.on('data', (chunk) => { data += chunk; });
            stream.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Resposta não é JSON válido. Status: ${res.statusCode}`));
                }
            });
            stream.on('error', (err) => reject(err));
        });

        req.on('error', (err) => reject(err));
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Timeout na requisição'));
        });
        req.end();
    });
}
