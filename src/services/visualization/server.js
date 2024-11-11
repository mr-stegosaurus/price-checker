const express = require('express');
const path = require('path');
const uniswap = require('../dexes/uniswap');
const sushiswap = require('../dexes/sushiswap');
const { PROVIDERS } = require('../../config/providers');
const { TOKENS } = require('../../config/tokens');

const app = express();
const PORT = 3000;

// Define DEX services
const DEX_SERVICES = [
    uniswap,
    sushiswap
];

app.use(express.static(path.join(__dirname, 'web')));

app.get('/api/prices', async (req, res) => {
    try {
        const prices = {};
        const chains = [
            { name: 'Mainnet', chainId: 1, provider: PROVIDERS.MAINNET, tokens: TOKENS.MAINNET },
            { name: 'Arbitrum', chainId: 42161, provider: PROVIDERS.ARBITRUM, tokens: TOKENS.ARBITRUM },
            { name: 'Optimism', chainId: 10, provider: PROVIDERS.OPTIMISM, tokens: TOKENS.OPTIMISM },
            { name: 'Polygon', chainId: 137, provider: PROVIDERS.POLYGON, tokens: TOKENS.POLYGON }
        ];

        for (const chain of chains) {
            prices[chain.name] = {};
            
            // Fetch prices from all DEXs in parallel
            const dexPrices = await Promise.all(
                DEX_SERVICES.map(dex => 
                    dex.getPrice(
                        chain.chainId,
                        chain.provider,
                        chain.tokens.WETH,
                        chain.tokens.USDC
                    )
                )
            );

            // Add valid prices to response
            dexPrices.forEach(price => {
                if (price) {
                    prices[chain.name][price.source] = price;
                }
            });
        }

        res.json({
            timestamp: new Date(),
            prices
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
}); 