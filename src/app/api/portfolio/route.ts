import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Local positions.json file path
const POSITIONS_FILE_PATH = 'C:\\Users\\heukr\\OneDrive\\Cloud Cowork\\Trading\\positions.json';

// Static current market prices for offline resilience (from Wealth Journal June 2026 data)
const OFFLINE_PRICES: Record<string, number> = {
  VTI: 371.65,
  PLTR: 142.20,
  SPY: 520.00,
  VOO: 480.00,
  QQQ: 440.00,
  BTC: 63214.00,
  ETH: 1762.00,
  XRP: 1.17,
  DOGE: 0.089,
};

interface Position {
  ticker: string;
  shares: number;
  avg_cost: number;
  bucket: 'Core' | 'Stable' | 'Satellite' | 'Offensive';
}

interface PortfolioConfig {
  positions: Position[];
  _targets_pct: Record<string, number>;
  _caps_pct: Record<string, number>;
}

export async function GET() {
  try {
    if (!fs.existsSync(POSITIONS_FILE_PATH)) {
      // Fallback if file doesn't exist
      return NextResponse.json({
        success: false,
        error: 'positions.json not found',
        positions: [],
      });
    }

    const fileContent = fs.readFileSync(POSITIONS_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent) as PortfolioConfig;

    const positions = (data.positions || [])
      .filter((p) => p.shares > 0)
      .map((p) => {
        const currentPrice = OFFLINE_PRICES[p.ticker] || p.avg_cost || 0;
        const totalValue = p.shares * currentPrice;
        const totalCost = p.shares * p.avg_cost;
        const gainLoss = totalValue - totalCost;
        const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

        return {
          ticker: p.ticker,
          shares: p.shares,
          avgCost: p.avg_cost,
          currentPrice,
          totalValue,
          totalCost,
          gainLoss,
          gainLossPct,
          bucket: p.bucket,
        };
      });

    const totalPortfolioValue = positions.reduce((sum, p) => sum + p.totalValue, 0);
    const totalPortfolioCost = positions.reduce((sum, p) => sum + p.totalCost, 0);
    const totalGainLoss = totalPortfolioValue - totalPortfolioCost;
    const totalGainLossPct = totalPortfolioCost > 0 ? (totalGainLoss / totalPortfolioCost) * 100 : 0;

    // Bucket values
    const bucketValues: Record<string, number> = {
      Core: 0,
      Stable: 0,
      Satellite: 0,
      Offensive: 0,
    };
    positions.forEach((p) => {
      if (p.bucket in bucketValues) {
        bucketValues[p.bucket] += p.totalValue;
      }
    });

    const bucketPercentages: Record<string, number> = {};
    Object.keys(bucketValues).forEach((b) => {
      bucketPercentages[b] = totalPortfolioValue > 0 ? (bucketValues[b] / totalPortfolioValue) * 100 : 0;
    });

    return NextResponse.json({
      success: true,
      positions,
      summary: {
        totalValue: totalPortfolioValue,
        totalCost: totalPortfolioCost,
        gainLoss: totalGainLoss,
        gainLossPct: totalGainLossPct,
      },
      buckets: {
        values: bucketValues,
        percentages: bucketPercentages,
        targets: data._targets_pct || { Core: 60, Stable: 15, Satellite: 20, Offensive: 5 },
        caps: data._caps_pct || { Core: 75, Stable: 25, Satellite: 25, Offensive: 10 },
      },
    });
  } catch (err) {
    console.error('Portfolio API error:', err);
    return NextResponse.json({ error: 'Database or File error' }, { status: 500 });
  }
}
