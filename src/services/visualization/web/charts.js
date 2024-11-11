const express = require('express');
const app = express();

app.get('/api/chart-data', async (req, res) => {
    const prices = await HistoricalDataFetcher.getHistoricalPrices(/* ... */);
    
    const chartData = {
        prices: {
            x: prices.map(p => new Date(p.timestamp * 1000)),
            y: prices.map(p => p.price),
            type: 'scatter'
        },
        liquidity: {
            x: prices.map(p => new Date(p.timestamp * 1000)),
            y: prices.map(p => p.liquidity),
            type: 'bar'
        }
    };
    
    res.json(chartData);
}); 