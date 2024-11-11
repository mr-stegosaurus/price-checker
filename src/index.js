const { TOKENS } = require('./config/tokens');
const { PROVIDERS } = require('./config/providers');
const { CHAIN_IDS } = require('./config/chains');
const uniswap = require('./services/dexes/uniswap');
const curve = require('./services/dexes/curve');

// Add helper functions at the top
function calculateArbitrageProfit(amount, buyPrice, sellPrice, gasCost) {
    if (!amount || !buyPrice || !sellPrice || buyPrice === 0) {
        return {
            profit: 0,
            profitAfterGas: 0,
            received: 0,
            final: 0
        };
    }

    // Calculate how much ETH we get for our input amount
    const ethReceived = amount / buyPrice;
    
    // Calculate how much we get when selling the ETH
    const final = ethReceived * sellPrice;
    
    // Calculate profit
    const profit = final - amount;
    const profitAfterGas = profit - (gasCost || 0);

    return {
        profit,
        profitAfterGas,
        received: ethReceived,
        final
    };
}

function getGasCost(chain1, chain2) {
    const gasCosts = {
        MAINNET: 30,
        ARBITRUM: 1.2,
        OPTIMISM: 0.5,
        POLYGON: 0.3
    };
    return gasCosts[chain1] + (chain2 ? gasCosts[chain2] : 0);
}

function calculatePriceDiff(price1, price2) {
    if (!price1 || !price2 || price1 === 0 || price2 === 0) return null;
    return ((price1 - price2) / price2 * 100);
}

async function main() {
    // Initialize price objects
    const prices = {
        MAINNET: { 
            uniswap: null, 
            curve: { price: null, buyPrice: null, sellPrice: null } 
        },
        ARBITRUM: { 
            uniswap: null, 
            curve: { price: null, buyPrice: null, sellPrice: null } 
        },
        OPTIMISM: { 
            uniswap: null, 
            curve: { price: null, buyPrice: null, sellPrice: null } 
        },
        POLYGON: { 
            uniswap: null, 
            curve: { price: null, buyPrice: null, sellPrice: null } 
        }
    };

    // Fetch prices and store them in the prices object
    try {
        // Check if we have all required providers
        for (const chain of Object.keys(CHAIN_IDS)) {
            if (!PROVIDERS[chain]) {
                console.warn(`Warning: No provider found for ${chain}`);
            }
        }

        // Fetch all prices and store them
        for (const chain of Object.keys(CHAIN_IDS)) {
            const provider = PROVIDERS[chain];
            if (!provider) continue;  // Skip if no provider instead of checking inside

            try {
                // Fetch Uniswap price
                const uniswapPrice = await uniswap.getPrice(CHAIN_IDS[chain], provider);
                if (uniswapPrice) {
                    prices[chain].uniswap = uniswapPrice.price;
                }

                // Fetch Curve price if not Polygon
                if (chain !== 'POLYGON') {
                    const curvePrice = await curve.getPrice(CHAIN_IDS[chain], provider);
                    if (curvePrice) {
                        prices[chain].curve = curvePrice;
                    }
                }
            } catch (e) {
                console.error(`Error fetching prices for ${chain}:`, e.message);
            }
        }

        // Display results
        console.log('\nPrice Summary:');
        console.log('=============');
        
        // Display individual prices with token pairs
        Object.entries(prices).forEach(([chain, dexPrices]) => {
            console.log(`\n${chain}:`);
            
            // Display Uniswap price
            if (dexPrices.uniswap != null) {
                console.log(`  Uniswap (ETH/USDC): ${dexPrices.uniswap.toFixed(2)}`);
            }
            
            // Display Curve prices (skip for Polygon)
            if (chain !== 'POLYGON' && dexPrices.curve) {
                const curvePair = chain === 'MAINNET' ? 'ETH/USDC' : 'ETH/crvUSD';
                console.log(`  Curve (${curvePair}):`);
                if (dexPrices.curve.sellPrice > 0) {
                    console.log(`    Sell ETH: ${dexPrices.curve.sellPrice.toFixed(2)}`);
                }
                if (dexPrices.curve.buyPrice > 0) {
                    console.log(`    Buy ETH: ${dexPrices.curve.buyPrice.toFixed(2)}`);
                }
            }
        });

        // Cross-chain analysis
        console.log('\nCross-Chain Analysis:');
        console.log('====================');

        // Compare Uniswap prices across chains
        const chains = Object.keys(prices);
        for (let i = 0; i < chains.length; i++) {
            for (let j = i + 1; j < chains.length; j++) {
                const chain1 = chains[i];
                const chain2 = chains[j];
                
                // Compare Uniswap prices
                if (prices[chain1].uniswap && prices[chain2].uniswap) {
                    const diff = calculatePriceDiff(prices[chain1].uniswap, prices[chain2].uniswap);
                    if (diff !== null) {
                        const arrow = diff > 0 ? '↑' : '↓';
                        console.log(`${chain1} vs ${chain2} Uniswap (ETH/USDC): ${Math.abs(diff).toFixed(2)}% ${arrow}`);
                    }
                }
                
                // Compare Curve prices (skip if either chain is Polygon)
                if (chain1 !== 'POLYGON' && chain2 !== 'POLYGON' && 
                    prices[chain1].curve?.sellPrice && prices[chain2].curve?.sellPrice) {
                    const diff = calculatePriceDiff(prices[chain1].curve.sellPrice, prices[chain2].curve.sellPrice);
                    if (diff !== null) {
                        const arrow = diff > 0 ? '↑' : '↓';
                        console.log(`${chain1} vs ${chain2} Curve: ${Math.abs(diff).toFixed(2)}% ${arrow}`);
                    }
                }
            }
        }

        // DEX Comparisons within chains
        console.log('\nDEX Comparisons:');
        console.log('===============');
        Object.entries(prices).forEach(([chain, dexPrices]) => {
            // Skip if either price is missing or if it's Polygon
            if (chain === 'POLYGON') return;
            
            if (dexPrices.uniswap && dexPrices.curve?.price) {  // Add null check for curve.price
                const diff = calculatePriceDiff(dexPrices.uniswap, dexPrices.curve.price);
                if (diff !== null) {  // Add check for valid diff result
                    const arrow = diff > 0 ? '↑' : '↓';
                    const curvePair = chain === 'MAINNET' ? 'USDC' : 'crvUSD';
                    console.log(`${chain} Uniswap (USDC) vs Curve (${curvePair}): ${diff.toFixed(2)}% ${arrow}`);
                }
            }
        });

        // Arbitrage Opportunities
        console.log('\nArbitrage Opportunities:');
        console.log('======================');
        const THRESHOLD = 0.3; // 0.3% threshold
        const TEST_AMOUNT = 1000; // Test with 1000 USD
        const TEST_ETH = 1; // Test with 1 ETH

        function analyzeCrossChainArbitrage(chain1, chain2, prices) {
            const opportunities = [];

            const formatOpp = (type, buyChain, sellChain, buyDex, sellDex, diff, buyPrice, sellPrice) => {
                let adjustedBuyPrice = buyPrice;
                let adjustedSellPrice = sellPrice;

                // Use correct price direction for Curve pools
                if (buyDex === 'Curve') {
                    adjustedBuyPrice = prices[buyChain].curve.buyPrice; // Price for buying ETH
                }
                if (sellDex === 'Curve') {
                    adjustedSellPrice = prices[sellChain].curve.sellPrice; // Price for selling ETH
                }

                const gasCost = getGasCost(buyChain, sellChain);
                const buyToken = buyDex === 'Curve' && buyChain !== 'MAINNET' ? 'crvUSD' : 'USDC';
                const sellToken = sellDex === 'Curve' && sellChain !== 'MAINNET' ? 'crvUSD' : 'USDC';

                // Calculate profit based on token types
                let result;
                if (buyToken === sellToken) {
                    // Same token type (USDC-USDC or crvUSD-crvUSD)
                    result = calculateArbitrageProfit(TEST_AMOUNT, adjustedBuyPrice, adjustedSellPrice, gasCost);
                } else {
                    // Different token types (USDC-crvUSD or crvUSD-USDC)
                    // Assume 1:1 rate between USDC and crvUSD for now
                    result = calculateArbitrageProfit(TEST_AMOUNT, adjustedBuyPrice, adjustedSellPrice, gasCost);
                }

                return {
                    type,
                    buyChain,
                    sellChain,
                    buyDex,
                    sellDex,
                    diff: Math.abs(diff),
                    buyPrice: adjustedBuyPrice,
                    sellPrice: adjustedSellPrice,
                    buyToken,
                    sellToken,
                    ...result,
                    gasCost
                };
            };

            // Check all possible combinations
            const dexes = ['uniswap', 'curve'];
            for (const buyDex of dexes) {
                for (const sellDex of dexes) {
                    if (prices[chain1][buyDex] && prices[chain2][sellDex]) {
                        let price1 = prices[chain1][buyDex];
                        let price2 = prices[chain2][sellDex];

                        // Compare prices in the same denomination (ETH)
                        const diff = calculatePriceDiff(price2, price1);
                        if (Math.abs(diff) > THRESHOLD) {
                            const opp = formatOpp(
                                'cross-chain',
                                chain1,
                                chain2,
                                buyDex.charAt(0).toUpperCase() + buyDex.slice(1),
                                sellDex.charAt(0).toUpperCase() + sellDex.slice(1),
                                diff,
                                price1,
                                price2
                            );
                            if (opp) opportunities.push(opp);
                        }
                    }
                }
            }

            return opportunities;
        }

        function analyzeIntraChainArbitrage(chain, prices) {
            const opportunities = [];
            
            if (prices[chain].uniswap && prices[chain].curve) {
                const uniswapPrice = prices[chain].uniswap;
                const curveBuyPrice = prices[chain].curve.buyPrice;
                const curveSellPrice = prices[chain].curve.sellPrice;

                // Skip if prices are invalid
                if (!uniswapPrice || !curveBuyPrice || !curveSellPrice || 
                    uniswapPrice === 0 || curveBuyPrice === 0 || curveSellPrice === 0) {
                    return opportunities;
                }

                // Check Uniswap -> Curve
                const uniToCurveDiff = calculatePriceDiff(curveSellPrice, uniswapPrice);
                if (Math.abs(uniToCurveDiff) > THRESHOLD) {
                    opportunities.push({
                        type: 'intra-chain',
                        chain,
                        buyDex: 'Uniswap',
                        sellDex: 'Curve',
                        diff: Math.abs(uniToCurveDiff),
                        buyPrice: uniswapPrice,
                        sellPrice: curveSellPrice,
                        buyToken: 'USDC',
                        sellToken: chain !== 'MAINNET' ? 'crvUSD' : 'USDC',
                        ...calculateArbitrageProfit(
                            TEST_ETH * uniswapPrice,
                            uniswapPrice,
                            curveSellPrice,
                            getGasCost(chain)
                        )
                    });
                }

                // Check Curve -> Uniswap
                const curveToUniDiff = calculatePriceDiff(uniswapPrice, curveBuyPrice);
                if (Math.abs(curveToUniDiff) > THRESHOLD) {
                    opportunities.push({
                        type: 'intra-chain',
                        chain,
                        buyDex: 'Curve',
                        sellDex: 'Uniswap',
                        diff: Math.abs(curveToUniDiff),
                        buyPrice: curveBuyPrice,
                        sellPrice: uniswapPrice,
                        buyToken: chain !== 'MAINNET' ? 'crvUSD' : 'USDC',
                        sellToken: 'USDC',
                        ...calculateArbitrageProfit(
                            TEST_ETH * curveBuyPrice,
                            curveBuyPrice,
                            uniswapPrice,
                            getGasCost(chain)
                        )
                    });
                }
            }

            return opportunities;
        }

        // Analyze all opportunities
        let allOpportunities = [];

        // Cross-chain opportunities
        for (let i = 0; i < chains.length; i++) {
            for (let j = i + 1; j < chains.length; j++) {
                const crossChainOpps = analyzeCrossChainArbitrage(chains[i], chains[j], prices);
                allOpportunities = allOpportunities.concat(crossChainOpps);
            }
        }

        // Intra-chain opportunities
        chains.forEach(chain => {
            const intraChainOpps = analyzeIntraChainArbitrage(chain, prices);
            allOpportunities = allOpportunities.concat(intraChainOpps);
        });

        // Before sorting opportunities
        allOpportunities = allOpportunities
            .filter(opp => opp !== null)
            .filter(opp => opp.buyPrice > 0 && opp.sellPrice > 0)
            .filter(opp => !isNaN(opp.profitAfterGas));

        // Sort opportunities by profit
        allOpportunities.sort((a, b) => b.profitAfterGas - a.profitAfterGas);

        // Display opportunities
        console.log('\nAll Arbitrage Opportunities (Sorted by Net Profit):');
        console.log('===============================================');

        allOpportunities.forEach(opp => {
            try {
                if (opp.type === 'cross-chain') {
                    console.log(`\n${opp.buyChain}-${opp.sellChain} (${opp.buyDex}-${opp.sellDex}):`);
                    console.log(`  Price Difference: ${opp.diff?.toFixed(2) || 0}%`);
                    console.log(`  Buy: ${opp.buyDex} on ${opp.buyChain} @ ${opp.buyPrice?.toFixed(2) || 0} ${opp.buyToken}`);
                    console.log(`  Sell: ${opp.sellDex} on ${opp.sellChain} @ ${opp.sellPrice?.toFixed(2) || 0} ${opp.sellToken}`);
                    console.log(`  Test Amount: ${TEST_AMOUNT} ${opp.buyToken}`);
                    console.log(`  Expected Return: ${opp.final?.toFixed(2) || 0} ${opp.sellToken}`);
                    console.log(`  Gross Profit: $${opp.profit?.toFixed(2) || 0}`);
                    console.log(`  Gas Cost: $${opp.gasCost?.toFixed(2) || 0}`);
                    console.log(`  Net Profit: $${opp.profitAfterGas?.toFixed(2) || 0}`);
                    console.log(opp.profitAfterGas > 0 ? '  ✅ Profitable' : '  ❌ Not profitable after gas');
                } else if (opp.type === 'intra-chain') {
                    console.log(`\n${opp.chain} Internal (${opp.buyDex}-${opp.sellDex}):`);
                    console.log(`  Price Difference: ${opp.diff?.toFixed(2) || 0}%`);
                    console.log(`  Buy: ${opp.buyDex} @ ${opp.buyPrice?.toFixed(2) || 0}`);
                    console.log(`  Sell: ${opp.sellDex} @ ${opp.sellPrice?.toFixed(2) || 0}`);
                    console.log(`  Test Amount: ${TEST_ETH} ETH`);
                    console.log(`  Expected Return: ${opp.final?.toFixed(2) || 0} ETH`);
                    console.log(`  Gross Profit: $${opp.profit?.toFixed(2) || 0}`);
                    console.log(`  Gas Cost: $${opp.gasCost?.toFixed(2) || 0}`);
                    console.log(`  Net Profit: $${opp.profitAfterGas?.toFixed(2) || 0}`);
                    console.log(opp.profitAfterGas > 0 ? '  ✅ Profitable' : '  ❌ Not profitable after gas');
                }
            } catch (error) {
                console.error('Error displaying opportunity:', error);
                console.log('Problematic opportunity object:', JSON.stringify(opp, null, 2));
            }
        });
    } catch (error) {
        console.error('Failed to fetch prices:', error);
        process.exit(1);
    } finally {
        // Cleanup providers if needed
        for (const provider of Object.values(PROVIDERS)) {
            if (provider?.destroy) {
                await provider.destroy();
            }
        }
    }
}

main().catch(console.error); 