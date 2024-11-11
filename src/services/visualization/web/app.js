let priceHistory = {
    Mainnet: {},
    Arbitrum: {},
    Optimism: {},
    Polygon: {}
};

let isLoading = false;

function formatLiquidity(liquidity) {
    const num = parseInt(liquidity);
    if (num > 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num > 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num > 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
}

function showLoading() {
    const container = document.getElementById('current-prices');
    container.innerHTML = '<div class="loading">Loading prices...</div>';
}

function updatePriceCards(prices) {
    if (!prices) return;
    
    const container = document.getElementById('current-prices');
    container.innerHTML = '';

    Object.entries(prices).forEach(([chain, dexPrices]) => {
        const card = document.createElement('div');
        card.className = 'price-card';
        
        let priceHtml = `<h2>${chain}</h2>`;
        Object.entries(dexPrices).forEach(([dex, data]) => {
            priceHtml += `
                <div class="dex-price">
                    <strong>${dex}:</strong> $${parseFloat(data.price).toFixed(2)}
                    <small>Liquidity: ${formatLiquidity(data.liquidity)}</small>
                </div>
            `;
        });
        
        card.innerHTML = priceHtml;
        container.appendChild(card);
    });
}

function updateChart() {
    const traces = [];
    
    Object.entries(priceHistory).forEach(([chain, dexPrices]) => {
        Object.entries(dexPrices).forEach(([dex, prices]) => {
            traces.push({
                name: `${chain} - ${dex}`,
                x: prices.map(p => p.timestamp),
                y: prices.map(p => p.price),
                type: 'scatter',
                mode: 'lines+markers'
            });
        });
    });

    const layout = {
        title: 'ETH/USDC Price History Across DEXs',
        xaxis: { 
            title: 'Time',
            range: [new Date(Date.now() - 30*60*1000), new Date()]
        },
        yaxis: { title: 'Price (USD)' },
        legend: { orientation: 'h', y: -0.2 }
    };

    Plotly.newPlot('priceChart', traces, layout);
}

async function fetchPrices() {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showLoading();
        
        const response = await fetch('/api/prices');
        const data = await response.json();
        
        Object.entries(data.prices).forEach(([chain, dexPrices]) => {
            if (!priceHistory[chain]) priceHistory[chain] = {};
            
            Object.entries(dexPrices).forEach(([dex, priceData]) => {
                if (!priceHistory[chain][dex]) priceHistory[chain][dex] = [];
                
                priceHistory[chain][dex].push({
                    timestamp: new Date(data.timestamp),
                    price: parseFloat(priceData.price),
                    liquidity: priceData.liquidity
                });

                // Keep only last 30 minutes of data
                const thirtyMinutesAgo = Date.now() - 30*60*1000;
                priceHistory[chain][dex] = priceHistory[chain][dex].filter(p => 
                    p.timestamp.getTime() > thirtyMinutesAgo
                );
            });
        });

        updatePriceCards(data.prices);
        updateChart();
    } catch (error) {
        console.error('Error fetching prices:', error);
    } finally {
        isLoading = false;
    }
}

// Fetch prices every 30 seconds
const FETCH_INTERVAL = 30 * 1000;
setInterval(fetchPrices, FETCH_INTERVAL);

// Initial fetch
fetchPrices();