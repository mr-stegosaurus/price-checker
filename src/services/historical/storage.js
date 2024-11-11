const fs = require('fs').promises;
const path = require('path');

class HistoricalDataStorage {
    constructor() {
        this.dataDir = path.join(__dirname, '../../../data');
    }

    async initialize() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
        } catch (error) {
            console.error('Error creating data directory:', error);
        }
    }

    async storePriceData(chainId, pair, data) {
        const filename = `${chainId}_${pair}_${Date.now()}.json`;
        const filepath = path.join(this.dataDir, filename);
        
        try {
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            return filepath;
        } catch (error) {
            console.error('Error storing price data:', error);
            throw error;
        }
    }

    async loadPriceData(chainId, pair, startTime, endTime) {
        const files = await fs.readdir(this.dataDir);
        const relevantFiles = files.filter(f => f.startsWith(`${chainId}_${pair}_`));
        
        const data = [];
        for (const file of relevantFiles) {
            const content = JSON.parse(await fs.readFile(path.join(this.dataDir, file)));
            data.push(...content);
        }

        return data.filter(d => d.timestamp >= startTime && d.timestamp <= endTime);
    }
}

module.exports = new HistoricalDataStorage();
