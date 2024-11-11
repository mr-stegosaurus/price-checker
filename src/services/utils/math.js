function compareChainPrices(prices) {
    const entries = Object.entries(prices);
    
    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            const [chain1, dexPrices1] = entries[i];
            const [chain2, dexPrices2] = entries[j];
            
            // Compare prices for each DEX
            Object.keys(dexPrices1).forEach(dex => {
                const price1 = dexPrices1[dex]?.price;
                const price2 = dexPrices2[dex]?.price;
                
                if (price1 && price2) {
                    const priceDiff = ((price1 - price2) / price1) * 100;
                    console.log(`${chain1} vs ${chain2} ${dex} price difference: ${priceDiff.toFixed(2)}%`);
                }
            });
        }
    }
}

module.exports = { compareChainPrices };
