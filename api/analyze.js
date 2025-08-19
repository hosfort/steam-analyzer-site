// Arquivo: api/analyze.js (versão corrigida sem cors-anywhere)

const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

module.exports = async (req, res) => {
    // Headers CORS mais específicos
    res.setHeader('Access-Control-Allow-Origin', 'https://anunciarvender.com.br');
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

        // Fazendo a requisição diretamente para a Steam API
        const steamApiUrl = `https://steamcommunity.com/market/pricehistory/?appid=${appId}&market_hash_name=${encodeURIComponent(marketHashName)}&country=US&currency=1`;
        
        console.log('Fazendo requisição para:', steamApiUrl);

        const steamData = await makeHttpsRequest(steamApiUrl);

        if (!steamData || !steamData.success) {
            console.error('Steam API response:', steamData);
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

function makeHttpsRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://steamcommunity.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            // Handle gzip/deflate compression
            let stream = res;
            if (res.headers['content-encoding'] === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            } else if (res.headers['content-encoding'] === 'deflate') {
                stream = res.pipe(zlib.createInflate());
            }

            stream.on('data', (chunk) => {
                data += chunk;
            });

            stream.on('end', () => {
                try {
                    console.log('Resposta da Steam API:', data.substring(0, 200) + '...');
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (parseError) {
                    console.error('Erro ao parsear JSON:', parseError);
                    console.error('Dados recebidos:', data);
                    reject(new Error('Resposta inválida da Steam API'));
                }
            });
        });

        req.on('error', (error) => {
            console.error('Erro na requisição HTTPS:', error);
            reject(error);
        });

        req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('Timeout na requisição'));
        });

        req.end();
    });
}