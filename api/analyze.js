// Arquivo: api/analyze.js (versão final otimizada)

const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

module.exports = async (req, res) => {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
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

        console.log('URL recebida:', steamUrl);

        const match = steamUrl.match(/market\/listings\/(\d+)\/(.*)/);

        if (!match || match.length < 3) {
            return res.status(400).json({ error: 'URL do Steam com formato inválido.' });
        }

        const appId = match[1];
        const marketHashName = match[2];

        console.log('App ID:', appId);
        console.log('Market Hash Name:', marketHashName);

        // Construir URL da Steam API
        const steamApiUrl = `https://steamcommunity.com/market/pricehistory/?appid=${appId}&market_hash_name=${encodeURIComponent(marketHashName)}&country=US&currency=1`;
        
        console.log('Steam API URL:', steamApiUrl);

        const steamData = await makeHttpsRequest(steamApiUrl);

        console.log('Resposta da Steam:', JSON.stringify(steamData).substring(0, 500));

        if (!steamData) {
            return res.status(502).json({ error: 'Nenhuma resposta da Steam API.' });
        }

        if (!steamData.success) {
            console.error('Steam API não retornou success=true:', steamData);
            return res.status(502).json({ 
                error: 'API do Steam retornou uma resposta inválida.',
                steam_response: steamData 
            });
        }

        if (!steamData.prices || !Array.isArray(steamData.prices)) {
            console.error('Steam API não retornou array de preços:', steamData);
            return res.status(502).json({ 
                error: 'Dados de preços não encontrados.',
                steam_response: steamData 
            });
        }
        
        console.log('Retornando', steamData.prices.length, 'registros de preços');
        res.status(200).json(steamData.prices);

    } catch (error) {
        console.error("Erro na função da Vercel:", error.message);
        console.error("Stack trace:", error.stack);
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://steamcommunity.com/market/',
                'Origin': 'https://steamcommunity.com',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        };

        console.log('Fazendo requisição HTTPS para:', options.hostname + options.path);

        const req = https.request(options, (res) => {
            console.log('Status da resposta:', res.statusCode);
            console.log('Headers da resposta:', JSON.stringify(res.headers, null, 2));
            
            let data = '';
            
            // Handle gzip/deflate compression
            let stream = res;
            if (res.headers['content-encoding'] === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            } else if (res.headers['content-encoding'] === 'deflate') {
                stream = res.pipe(zlib.createInflate());
            } else if (res.headers['content-encoding'] === 'br') {
                stream = res.pipe(zlib.createBrotliDecompress());
            }

            stream.on('data', (chunk) => {
                data += chunk;
            });

            stream.on('end', () => {
                console.log('Dados brutos recebidos (primeiros 300 chars):', data.substring(0, 300));
                
                try {
                    if (!data.trim()) {
                        reject(new Error('Resposta vazia da Steam API'));
                        return;
                    }
                    
                    const jsonData = JSON.parse(data);
                    console.log('JSON parseado com sucesso. Chaves:', Object.keys(jsonData));
                    resolve(jsonData);
                } catch (parseError) {
                    console.error('Erro ao parsear JSON:', parseError.message);
                    console.error('Dados recebidos (primeiros 500 chars):', data.substring(0, 500));
                    
                    // Tentar extrair JSON de possível HTML
                    const jsonMatch = data.match(/\{.*\}/s);
                    if (jsonMatch) {
                        try {
                            const extractedJson = JSON.parse(jsonMatch[0]);
                            console.log('JSON extraído do HTML com sucesso');
                            resolve(extractedJson);
                            return;
                        } catch (e) {
                            console.error('Falha ao parsear JSON extraído:', e.message);
                        }
                    }
                    
                    reject(new Error(`Resposta não é JSON válido. Status: ${res.statusCode}`));
                }
            });

            stream.on('error', (error) => {
                console.error('Erro no stream de decompressão:', error);
                reject(error);
            });
        });

        req.on('error', (error) => {
            console.error('Erro na requisição HTTPS:', error);
            reject(error);
        });

        req.setTimeout(15000, () => {
            console.error('Timeout na requisição');
            req.destroy();
            reject(new Error('Timeout na requisição para Steam API'));
        });

        req.end();
    });
}