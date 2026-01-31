#!/usr/bin/env node

/**
 * Sales Data Generator for ExecDeck
 * Generates ~100,000 realistic sales records for testing
 * 
 * Usage: node scripts/generate-data.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TARGET_RECORDS = 100000;

// Data pools
const REGIONS = ['US-East', 'US-West', 'EU-Central', 'APAC', 'LATAM', 'MEA', 'ANZ'];
const PRODUCTS = ['Cloud Platform', 'Data Analytics', 'Security Suite', 'AI Services', 'DevOps Tools', 'IoT Solutions'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const STATUSES = ['Good', 'Warning', 'Critical'];

// Sales reps by region
const REPS = {
    'US-East': ['Sarah Chen', 'Mike Johnson', 'Lisa Park', 'David Kim', 'Emily Rodriguez', 'James Wilson', 'Amanda Foster', 'Robert Blake'],
    'US-West': ['Alex Thompson', 'Rachel Green', 'Chris Martinez', 'Jennifer Lee', 'Tom Anderson', 'Nicole Davis', 'Kevin Wu', 'Maria Santos'],
    'EU-Central': ['Hans Mueller', 'Marie Dubois', 'Paolo Rossi', 'Sophie Bernard', 'Luca Bianchi', 'Anna Schmidt', 'Pierre Laurent', 'Elena Costa'],
    'APAC': ['Yuki Tanaka', 'Wei Zhang', 'Priya Sharma', 'Jin Park', 'Amit Patel', 'Kenji Yamamoto', 'Li Chen', 'Raj Kumar'],
    'LATAM': ['Carlos Silva', 'Ana Martinez', 'Pedro Gonzalez', 'Maria Santos', 'Diego Fernandez', 'Isabella Lopez', 'Fernando Reyes', 'Lucia Garcia'],
    'MEA': ['Ahmed Hassan', 'Fatima Al-Said', 'Omar Khalil', 'Sara Ibrahim', 'Youssef Mansour', 'Layla Nasser', 'Tariq Ahmed', 'Nadia Farouk'],
    'ANZ': ['James Cook', 'Emma Wilson', 'Liam Brown', 'Sophie Taylor', 'Oliver Smith', 'Charlotte Lee', 'Jack Robinson', 'Mia Thompson']
};

// Region performance profiles (relative target achievement rates)
const REGION_PERFORMANCE = {
    'US-East': { min: 85, max: 130 },    // Strong performer
    'US-West': { min: 30, max: 65 },     // Underperformer (story element)
    'EU-Central': { min: 80, max: 115 }, // Solid performer
    'APAC': { min: 70, max: 110 },       // Growing market
    'LATAM': { min: 60, max: 95 },       // Emerging market
    'MEA': { min: 55, max: 90 },         // Developing market
    'ANZ': { min: 75, max: 105 }         // Stable market
};

// Product performance profiles
const PRODUCT_PERFORMANCE = {
    'Cloud Platform': { baseTarget: 100000, variance: 0.4 },
    'Data Analytics': { baseTarget: 80000, variance: 0.35 },
    'Security Suite': { baseTarget: 60000, variance: 0.3 },
    'AI Services': { baseTarget: 70000, variance: 0.45 },
    'DevOps Tools': { baseTarget: 50000, variance: 0.35 },
    'IoT Solutions': { baseTarget: 45000, variance: 0.4 }
};

// Utility functions
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateCloseDate(quarter, year = 2026) {
    const quarterMonths = {
        'Q1': [0, 1, 2],   // Jan, Feb, Mar
        'Q2': [3, 4, 5],   // Apr, May, Jun
        'Q3': [6, 7, 8],   // Jul, Aug, Sep
        'Q4': [9, 10, 11]  // Oct, Nov, Dec
    };

    const month = randomChoice(quarterMonths[quarter]);
    const day = randomInt(1, 28);
    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0];
}

function determineStatus(performancePercent) {
    if (performancePercent >= 90) return 'Good';
    if (performancePercent >= 70) return 'Warning';
    return 'Critical';
}

// Generate records
function generateRecords(count) {
    const records = [];

    console.log(`Generating ${count.toLocaleString()} sales records...`);
    const startTime = Date.now();

    for (let i = 1; i <= count; i++) {
        const region = randomChoice(REGIONS);
        const product = randomChoice(PRODUCTS);
        const quarter = randomChoice(QUARTERS);
        const rep = randomChoice(REPS[region]);

        // Calculate target based on product
        const productProfile = PRODUCT_PERFORMANCE[product];
        const baseTarget = productProfile.baseTarget;
        const targetVariance = randomFloat(1 - productProfile.variance, 1 + productProfile.variance);
        const target = Math.round(baseTarget * targetVariance);

        // Calculate revenue based on region performance
        const regionProfile = REGION_PERFORMANCE[region];
        const performancePercent = randomFloat(regionProfile.min, regionProfile.max);
        const revenue = Math.round(target * (performancePercent / 100));

        // Calculate deals (revenue-based with some variance)
        const avgDealSize = randomInt(8000, 15000);
        const deals = Math.max(1, Math.round(revenue / avgDealSize));

        // Determine status
        const status = determineStatus(performancePercent);

        // Generate close date
        const closeDate = generateCloseDate(quarter);

        records.push({
            id: i,
            region,
            product,
            quarter,
            revenue,
            target,
            status,
            deals,
            rep,
            closeDate
        });

        // Progress indicator
        if (i % 10000 === 0) {
            console.log(`  Generated ${i.toLocaleString()} records...`);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Generated ${count.toLocaleString()} records in ${elapsed}s`);

    return records;
}

// Calculate statistics
function calculateStats(records) {
    const stats = {
        total: records.length,
        totalRevenue: 0,
        totalTarget: 0,
        totalDeals: 0,
        byStatus: { Good: 0, Warning: 0, Critical: 0 },
        byRegion: {},
        byProduct: {},
        byQuarter: {}
    };

    records.forEach(r => {
        stats.totalRevenue += r.revenue;
        stats.totalTarget += r.target;
        stats.totalDeals += r.deals;
        stats.byStatus[r.status]++;

        stats.byRegion[r.region] = (stats.byRegion[r.region] || 0) + 1;
        stats.byProduct[r.product] = (stats.byProduct[r.product] || 0) + 1;
        stats.byQuarter[r.quarter] = (stats.byQuarter[r.quarter] || 0) + 1;
    });

    return stats;
}

// Main
function main() {
    console.log('\n🚀 ExecDeck Sales Data Generator\n');

    // Generate records
    const records = generateRecords(TARGET_RECORDS);

    // Calculate stats
    const stats = calculateStats(records);

    // Write to file
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'sales_data.json');
    console.log(`\nWriting to ${outputPath}...`);

    fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));

    const fileSizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
    console.log(`✓ File written (${fileSizeMB} MB)`);

    // Print statistics
    console.log('\n📊 Dataset Statistics:');
    console.log(`   Records: ${stats.total.toLocaleString()}`);
    console.log(`   Total Revenue: $${(stats.totalRevenue / 1000000).toFixed(1)}M`);
    console.log(`   Total Target: $${(stats.totalTarget / 1000000).toFixed(1)}M`);
    console.log(`   Performance: ${((stats.totalRevenue / stats.totalTarget) * 100).toFixed(1)}%`);
    console.log(`   Total Deals: ${stats.totalDeals.toLocaleString()}`);
    console.log(`\n   By Status:`);
    console.log(`     Good: ${stats.byStatus.Good.toLocaleString()} (${((stats.byStatus.Good / stats.total) * 100).toFixed(1)}%)`);
    console.log(`     Warning: ${stats.byStatus.Warning.toLocaleString()} (${((stats.byStatus.Warning / stats.total) * 100).toFixed(1)}%)`);
    console.log(`     Critical: ${stats.byStatus.Critical.toLocaleString()} (${((stats.byStatus.Critical / stats.total) * 100).toFixed(1)}%)`);
    console.log(`\n   By Region:`);
    Object.entries(stats.byRegion).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
        console.log(`     ${region}: ${count.toLocaleString()}`);
    });

    console.log('\n✅ Done!\n');
}

main();
