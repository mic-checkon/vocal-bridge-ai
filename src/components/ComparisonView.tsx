'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from 'recharts';
import { X, TrendingUp, TrendingDown, Equal } from 'lucide-react';

interface SalesRecord {
    id: number;
    region: string;
    product: string;
    quarter: string;
    revenue: number;
    target: number;
    status: 'Good' | 'Warning' | 'Critical';
    deals: number;
    rep: string;
    closeDate: string;
}

interface ComparisonViewProps {
    data: SalesRecord[];
    item1: string;
    item2: string;
    type: 'region' | 'product' | 'quarter' | 'rep';
    onClose: () => void;
}

const COLORS = {
    item1: '#6366f1', // Indigo
    item2: '#ec4899', // Pink
};

const formatCompact = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
};

export function ComparisonView({ data, item1, item2, type, onClose }: ComparisonViewProps) {
    // Calculate metrics for each item
    const comparison = useMemo(() => {
        const filterByItem = (item: string) => {
            switch (type) {
                case 'region': return data.filter(r => r.region === item);
                case 'product': return data.filter(r => r.product === item);
                case 'quarter': return data.filter(r => r.quarter === item);
                case 'rep': return data.filter(r => r.rep === item);
                default: return [];
            }
        };

        const data1 = filterByItem(item1);
        const data2 = filterByItem(item2);

        const calcMetrics = (records: SalesRecord[]) => {
            const revenue = records.reduce((s, r) => s + r.revenue, 0);
            const target = records.reduce((s, r) => s + r.target, 0);
            const deals = records.reduce((s, r) => s + r.deals, 0);
            const critical = records.filter(r => r.status === 'Critical').length;
            const warning = records.filter(r => r.status === 'Warning').length;
            const good = records.filter(r => r.status === 'Good').length;
            const performance = target > 0 ? Math.round((revenue / target) * 100) : 0;

            return { revenue, target, deals, critical, warning, good, performance, count: records.length };
        };

        return {
            item1: { name: item1, ...calcMetrics(data1) },
            item2: { name: item2, ...calcMetrics(data2) },
        };
    }, [data, item1, item2, type]);

    // Bar chart data for revenue/target
    const barData = [
        { name: 'Revenue', [item1]: comparison.item1.revenue, [item2]: comparison.item2.revenue },
        { name: 'Target', [item1]: comparison.item1.target, [item2]: comparison.item2.target },
    ];

    // Radar chart data for multi-metric comparison
    const radarData = [
        { metric: 'Performance', [item1]: comparison.item1.performance, [item2]: comparison.item2.performance, fullMark: 150 },
        { metric: 'Deals', [item1]: Math.min(comparison.item1.deals / 100, 100), [item2]: Math.min(comparison.item2.deals / 100, 100), fullMark: 100 },
        { metric: 'Good %', [item1]: comparison.item1.count > 0 ? Math.round((comparison.item1.good / comparison.item1.count) * 100) : 0, [item2]: comparison.item2.count > 0 ? Math.round((comparison.item2.good / comparison.item2.count) * 100) : 0, fullMark: 100 },
        { metric: 'Records', [item1]: Math.min(comparison.item1.count / 100, 100), [item2]: Math.min(comparison.item2.count / 100, 100), fullMark: 100 },
    ];

    // Determine winner for each metric
    const getWinner = (v1: number, v2: number) => {
        if (v1 > v2) return 'item1';
        if (v2 > v1) return 'item2';
        return 'tie';
    };

    const revenueWinner = getWinner(comparison.item1.revenue, comparison.item2.revenue);
    const perfWinner = getWinner(comparison.item1.performance, comparison.item2.performance);
    const dealsWinner = getWinner(comparison.item1.deals, comparison.item2.deals);

    return (
        <div className="comparison-view fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">
                            <span style={{ color: COLORS.item1 }}>{item1}</span>
                            {' vs '}
                            <span style={{ color: COLORS.item2 }}>{item2}</span>
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Comparative Analysis by {type}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Key Metrics Comparison */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* Revenue */}
                    <div className={`p-4 rounded-xl border-2 ${revenueWinner === 'item1' ? 'border-indigo-500 bg-indigo-500/10' : revenueWinner === 'item2' ? 'border-pink-500 bg-pink-500/10' : 'border-gray-600 bg-gray-800/50'}`}>
                        <p className="text-xs text-gray-400 uppercase mb-2">Revenue</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xl font-bold" style={{ color: COLORS.item1 }}>{formatCompact(comparison.item1.revenue)}</p>
                                <p className="text-xs text-gray-500">{item1}</p>
                            </div>
                            <div className="text-gray-500">
                                {revenueWinner === 'item1' ? <TrendingUp className="text-indigo-400" /> :
                                    revenueWinner === 'item2' ? <TrendingDown className="text-pink-400" /> : <Equal />}
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold" style={{ color: COLORS.item2 }}>{formatCompact(comparison.item2.revenue)}</p>
                                <p className="text-xs text-gray-500">{item2}</p>
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className={`p-4 rounded-xl border-2 ${perfWinner === 'item1' ? 'border-indigo-500 bg-indigo-500/10' : perfWinner === 'item2' ? 'border-pink-500 bg-pink-500/10' : 'border-gray-600 bg-gray-800/50'}`}>
                        <p className="text-xs text-gray-400 uppercase mb-2">Performance</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xl font-bold" style={{ color: COLORS.item1 }}>{comparison.item1.performance}%</p>
                                <p className="text-xs text-gray-500">{item1}</p>
                            </div>
                            <div className="text-gray-500">
                                {perfWinner === 'item1' ? <TrendingUp className="text-indigo-400" /> :
                                    perfWinner === 'item2' ? <TrendingDown className="text-pink-400" /> : <Equal />}
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold" style={{ color: COLORS.item2 }}>{comparison.item2.performance}%</p>
                                <p className="text-xs text-gray-500">{item2}</p>
                            </div>
                        </div>
                    </div>

                    {/* Deals */}
                    <div className={`p-4 rounded-xl border-2 ${dealsWinner === 'item1' ? 'border-indigo-500 bg-indigo-500/10' : dealsWinner === 'item2' ? 'border-pink-500 bg-pink-500/10' : 'border-gray-600 bg-gray-800/50'}`}>
                        <p className="text-xs text-gray-400 uppercase mb-2">Total Deals</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xl font-bold" style={{ color: COLORS.item1 }}>{comparison.item1.deals.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{item1}</p>
                            </div>
                            <div className="text-gray-500">
                                {dealsWinner === 'item1' ? <TrendingUp className="text-indigo-400" /> :
                                    dealsWinner === 'item2' ? <TrendingDown className="text-pink-400" /> : <Equal />}
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold" style={{ color: COLORS.item2 }}>{comparison.item2.deals.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{item2}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Bar Chart - Revenue vs Target */}
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold mb-4">Revenue & Target Comparison</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barData} layout="vertical">
                                <XAxis type="number" tickFormatter={(v) => formatCompact(v)} stroke="#666" />
                                <YAxis type="category" dataKey="name" stroke="#666" width={60} />
                                <Tooltip
                                    formatter={(value: number) => formatCompact(value)}
                                    contentStyle={{ background: 'rgba(30,30,50,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Bar dataKey={item1} fill={COLORS.item1} radius={[0, 4, 4, 0]} />
                                <Bar dataKey={item2} fill={COLORS.item2} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Radar Chart - Multi-metric */}
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold mb-4">Performance Profile</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="metric" stroke="#888" />
                                <PolarRadiusAxis stroke="#444" />
                                <Radar name={item1} dataKey={item1} stroke={COLORS.item1} fill={COLORS.item1} fillOpacity={0.3} />
                                <Radar name={item2} dataKey={item2} stroke={COLORS.item2} fill={COLORS.item2} fillOpacity={0.3} />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="mt-6 grid grid-cols-2 gap-6">
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.item1 }}>{item1} - Deal Status</h3>
                        <div className="flex gap-4">
                            <div className="flex-1 text-center p-3 rounded-lg bg-green-500/10">
                                <p className="text-2xl font-bold text-green-400">{comparison.item1.good}</p>
                                <p className="text-xs text-gray-400">Good</p>
                            </div>
                            <div className="flex-1 text-center p-3 rounded-lg bg-yellow-500/10">
                                <p className="text-2xl font-bold text-yellow-400">{comparison.item1.warning}</p>
                                <p className="text-xs text-gray-400">Warning</p>
                            </div>
                            <div className="flex-1 text-center p-3 rounded-lg bg-red-500/10">
                                <p className="text-2xl font-bold text-red-400">{comparison.item1.critical}</p>
                                <p className="text-xs text-gray-400">Critical</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.item2 }}>{item2} - Deal Status</h3>
                        <div className="flex gap-4">
                            <div className="flex-1 text-center p-3 rounded-lg bg-green-500/10">
                                <p className="text-2xl font-bold text-green-400">{comparison.item2.good}</p>
                                <p className="text-xs text-gray-400">Good</p>
                            </div>
                            <div className="flex-1 text-center p-3 rounded-lg bg-yellow-500/10">
                                <p className="text-2xl font-bold text-yellow-400">{comparison.item2.warning}</p>
                                <p className="text-xs text-gray-400">Warning</p>
                            </div>
                            <div className="flex-1 text-center p-3 rounded-lg bg-red-500/10">
                                <p className="text-2xl font-bold text-red-400">{comparison.item2.critical}</p>
                                <p className="text-xs text-gray-400">Critical</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-pink-500/10 border border-white/10">
                    <p className="text-sm">
                        <strong className="text-indigo-400">{item1}</strong> has {comparison.item1.revenue > comparison.item2.revenue ? 'higher' : 'lower'} revenue
                        ({formatCompact(comparison.item1.revenue)} vs {formatCompact(comparison.item2.revenue)}) and is performing at{' '}
                        <strong className={comparison.item1.performance >= comparison.item2.performance ? 'text-green-400' : 'text-red-400'}>
                            {comparison.item1.performance}%
                        </strong>{' '}
                        compared to <strong className="text-pink-400">{item2}</strong>'s{' '}
                        <strong className={comparison.item2.performance >= comparison.item1.performance ? 'text-green-400' : 'text-red-400'}>
                            {comparison.item2.performance}%
                        </strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
