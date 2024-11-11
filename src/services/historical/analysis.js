class HistoricalAnalysis {
    calculateTWAP(prices, period = 24) {
        if (prices.length < 2) return null;

        const timeWeightedPrices = prices.map((price, i, arr) => {
            const nextTimestamp = arr[i + 1]?.timestamp || Date.now() / 1000;
            const timeWeight = nextTimestamp - price.timestamp;
            return price.price * timeWeight;
        });

        const totalTime = prices[prices.length - 1].timestamp - prices[0].timestamp;
        return timeWeightedPrices.reduce((a, b) => a + b, 0) / totalTime;
    }

    calculateVolatility(prices) {
        const returns = prices.map((price, i, arr) => {
            if (i === 0) return 0;
            return (price.price - arr[i-1].price) / arr[i-1].price;
        });

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    findPriceExtremes(prices) {
        const sorted = [...prices].sort((a, b) => a.price - b.price);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1]
        };
    }

    calculateLiquidityTrend(prices) {
        const liquidityValues = prices.map(p => BigInt(p.liquidity));
        const averageLiquidity = liquidityValues.reduce((a, b) => a + b, 0n) / BigInt(liquidityValues.length);
        return {
            average: averageLiquidity.toString(),
            trend: liquidityValues[liquidityValues.length - 1] > liquidityValues[0] ? 'increasing' : 'decreasing'
        };
    }
}

module.exports = new HistoricalAnalysis();
