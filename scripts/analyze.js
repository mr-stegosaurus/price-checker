const { PROVIDERS } = require('../src/config/providers');
const { TOKENS } = require('../src/config/tokens');
const HistoricalDataFetcher = require('../src/services/historical/fetcher');
const HistoricalAnalysis = require('../src/services/historical/analysis');
const HistoricalDataStorage = require('../src/services/historical/storage');

async function analyzeHistoricalData() {
    try {
        // Initialize storage
        await HistoricalDataStorage.initialize();

        // Fetch historical data for Ethereum mainnet
        const prices = await HistoricalDataFetcher.getHistoricalPrices(
            PROVIDERS.MAINNET,
            poolAddress, // You'll need to compute this
            TOKENS.MAINNET.WETH,
            TOKENS.MAINNET.USDC,
            100 // Last 100 blocks
        );

        // Store the data
        await HistoricalDataStorage.storePriceData(1, 'WETH_USDC', prices);

        // Analyze the data
        const analysis = {
            twap: HistoricalAnalysis.calculateTWAP(prices),
            volatility: HistoricalAnalysis.calculateVolatility(prices),
            extremes: HistoricalAnalysis.findPriceExtremes(prices),
            liquidity: HistoricalAnalysis.calculateLiquidityTrend(prices)
        };

        console.log('Analysis Results:', analysis);
    } catch (error) {
        console.error('Analysis failed:', error);
    }
}

analyzeHistoricalData().catch(console.error);
