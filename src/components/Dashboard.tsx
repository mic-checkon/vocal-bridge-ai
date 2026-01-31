'use client';

import { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    LineChart,
    Line,
    Legend,
    ComposedChart,
    Area,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { FilterState } from '@/hooks/useVoiceAgent';

// Types
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

type SpotlightTarget = 'region' | 'product' | 'quarter' | 'status' | 'performance' | 'table' | 'rep' | null;

interface DashboardProps {
    data: SalesRecord[];
    filters: FilterState;
    onClearFilters: () => void;
    spotlight?: SpotlightTarget;
}

// Colors
const COLORS = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    good: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
    regions: {
        'US-East': '#6366f1',
        'US-West': '#ef4444',
        'EU-Central': '#22c55e',
        'APAC': '#f59e0b',
        'LATAM': '#8b5cf6',
        'MEA': '#06b6d4',
        'ANZ': '#ec4899',
    } as Record<string, string>,
    products: {
        'Cloud Platform': '#6366f1',
        'Data Analytics': '#22c55e',
        'Security Suite': '#f59e0b',
        'AI Services': '#ec4899',
        'DevOps Tools': '#06b6d4',
        'IoT Solutions': '#8b5cf6',
    } as Record<string, string>,
};

// Format currency
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

const formatCompact = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
};

// Status badge colors
const statusColors = {
    Good: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    Warning: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
    Critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-3 border border-white/10">
                <p className="text-sm font-medium mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {formatCurrency(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function Dashboard({ data, filters, onClearFilters, spotlight }: DashboardProps) {
    // Calculate metrics
    const metrics = useMemo(() => {
        const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0);
        const totalTarget = data.reduce((sum, r) => sum + r.target, 0);
        const totalDeals = data.reduce((sum, r) => sum + r.deals, 0);
        const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
        const performance = totalTarget > 0 ? ((totalRevenue / totalTarget) * 100) : 0;
        const criticalCount = data.filter((r) => r.status === 'Critical').length;
        const warningCount = data.filter((r) => r.status === 'Warning').length;
        const goodCount = data.filter((r) => r.status === 'Good').length;
        const uniqueReps = new Set(data.map((r) => r.rep)).size;

        return { totalRevenue, totalTarget, totalDeals, avgDealSize, performance, criticalCount, warningCount, goodCount, uniqueReps };
    }, [data]);

    // Region Performance Chart
    const regionPerformance = useMemo(() => {
        const grouped: Record<string, { revenue: number; target: number }> = {};
        data.forEach((r) => {
            if (!grouped[r.region]) grouped[r.region] = { revenue: 0, target: 0 };
            grouped[r.region].revenue += r.revenue;
            grouped[r.region].target += r.target;
        });
        return Object.entries(grouped)
            .map(([region, values]) => ({
                name: region,
                revenue: values.revenue,
                target: values.target,
                performance: values.target > 0 ? Math.round((values.revenue / values.target) * 100) : 0,
                fill: COLORS.regions[region] || COLORS.primary,
            }))
            .sort((a, b) => b.performance - a.performance);
    }, [data]);

    // Product Mix Chart
    const productMix = useMemo(() => {
        const grouped: Record<string, number> = {};
        data.forEach((r) => {
            grouped[r.product] = (grouped[r.product] || 0) + r.revenue;
        });
        return Object.entries(grouped).map(([product, revenue]) => ({
            name: product,
            value: revenue,
            fill: COLORS.products[product] || COLORS.primary,
        }));
    }, [data]);

    // Quarterly Trend
    const quarterlyTrend = useMemo(() => {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        return quarters.map((q) => {
            const quarterData = data.filter((r) => r.quarter === q);
            const revenue = quarterData.reduce((sum, r) => sum + r.revenue, 0);
            const target = quarterData.reduce((sum, r) => sum + r.target, 0);
            return {
                name: q,
                revenue,
                target,
                gap: target - revenue,
            };
        });
    }, [data]);

    // Status Distribution
    const statusDistribution = useMemo(() => [
        { name: 'Good', value: metrics.goodCount, fill: COLORS.good },
        { name: 'Warning', value: metrics.warningCount, fill: COLORS.warning },
        { name: 'Critical', value: metrics.criticalCount, fill: COLORS.critical },
    ], [metrics]);

    // Top/Bottom Performers (Reps)
    const repPerformance = useMemo(() => {
        const grouped: Record<string, { revenue: number; deals: number }> = {};
        data.forEach((r) => {
            if (!grouped[r.rep]) grouped[r.rep] = { revenue: 0, deals: 0 };
            grouped[r.rep].revenue += r.revenue;
            grouped[r.rep].deals += r.deals;
        });
        return Object.entries(grouped)
            .map(([rep, values]) => ({
                name: rep,
                revenue: values.revenue,
                deals: values.deals,
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [data]);

    // Active filters display
    const activeFilters = Object.entries(filters).filter(([, v]) => v);
    const hasFilters = activeFilters.length > 0;

    return (
        <div className="space-y-6">
            {/* Active Filters */}
            {hasFilters && (
                <div className="flex items-center gap-2 flex-wrap p-4 glass-card border-l-4 border-indigo-500">
                    <span className="text-sm text-gray-400 font-medium">Active Filters:</span>
                    {activeFilters.map(([key, value]) => (
                        <span key={key} className="filter-pill">
                            {key}: <span className="font-semibold text-white">{value}</span>
                        </span>
                    ))}
                    <button
                        onClick={onClearFilters}
                        className="text-sm text-indigo-400 hover:text-indigo-300 ml-2 px-3 py-1 rounded-full border border-indigo-500/30 hover:bg-indigo-500/10 transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Revenue</span>
                        <DollarSign className="text-indigo-400" size={18} />
                    </div>
                    <div className="mt-2">
                        <span className="text-xl font-bold">{formatCompact(metrics.totalRevenue)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                        {metrics.performance >= 100 ? (
                            <TrendingUp className="text-green-400" size={12} />
                        ) : (
                            <TrendingDown className="text-red-400" size={12} />
                        )}
                        <span className={`text-xs ${metrics.performance >= 100 ? 'text-green-400' : 'text-red-400'}`}>
                            {metrics.performance.toFixed(1)}% of target
                        </span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Target</span>
                        <Target className="text-purple-400" size={18} />
                    </div>
                    <div className="mt-2">
                        <span className="text-xl font-bold">{formatCompact(metrics.totalTarget)}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                        Gap: {formatCompact(metrics.totalTarget - metrics.totalRevenue)}
                    </div>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Deals</span>
                        <TrendingUp className="text-green-400" size={18} />
                    </div>
                    <div className="mt-2">
                        <span className="text-xl font-bold">{metrics.totalDeals}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                        Avg: {formatCurrency(metrics.avgDealSize)}
                    </div>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Critical</span>
                        <AlertTriangle className="text-red-400" size={18} />
                    </div>
                    <div className="mt-2">
                        <span className="text-xl font-bold text-red-400">{metrics.criticalCount}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Needs attention</div>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Warning</span>
                        <AlertTriangle className="text-yellow-400" size={18} />
                    </div>
                    <div className="mt-2">
                        <span className="text-xl font-bold text-yellow-400">{metrics.warningCount}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Monitor closely</div>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Reps</span>
                        <Users className="text-blue-400" size={18} />
                    </div>
                    <div className="mt-2">
                        <span className="text-xl font-bold">{metrics.uniqueReps}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{data.length} records</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Region Performance */}
                <div className={`glass-card p-6 chart-card ${spotlight === 'region' ? 'spotlight' : ''}`}>
                    <h3 className="text-lg font-semibold mb-1">Region Performance</h3>
                    <p className="text-xs text-gray-500 mb-4">Revenue vs Target by Region (sorted by %)</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={regionPerformance} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                <XAxis type="number" stroke="#71717a" fontSize={11} tickFormatter={(v) => formatCompact(v)} />
                                <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={11} width={70} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} barSize={16}>
                                    {regionPerformance.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                                <Line type="monotone" dataKey="target" name="Target" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {regionPerformance.map((r) => (
                            <span
                                key={r.name}
                                className="text-xs px-2 py-1 rounded-full"
                                style={{
                                    backgroundColor: `${r.fill}20`,
                                    color: r.fill,
                                    border: `1px solid ${r.fill}40`,
                                }}
                            >
                                {r.name}: {r.performance}%
                            </span>
                        ))}
                    </div>
                </div>

                {/* Quarterly Trend */}
                <div className={`glass-card p-6 chart-card ${spotlight === 'quarter' ? 'spotlight' : ''}`}>
                    <h3 className="text-lg font-semibold mb-1">Quarterly Trend</h3>
                    <p className="text-xs text-gray-500 mb-4">Revenue and Target by Quarter</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={quarterlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                                <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => formatCompact(v)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Area type="monotone" dataKey="target" name="Target" fill="rgba(168, 85, 247, 0.2)" stroke="#a855f7" strokeWidth={2} />
                                <Bar dataKey="revenue" name="Revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={40} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Product Mix */}
                <div className={`glass-card p-6 chart-card ${spotlight === 'product' ? 'spotlight' : ''}`}>
                    <h3 className="text-lg font-semibold mb-1">Product Mix</h3>
                    <p className="text-xs text-gray-500 mb-4">Revenue by Product</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={productMix}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {productMix.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1">
                        {productMix.map((p) => (
                            <div key={p.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
                                    <span className="text-gray-400">{p.name}</span>
                                </div>
                                <span className="font-medium">{formatCompact(p.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Distribution */}
                <div className={`glass-card p-6 chart-card ${spotlight === 'status' ? 'spotlight' : ''}`}>
                    <h3 className="text-lg font-semibold mb-1">Deal Health</h3>
                    <p className="text-xs text-gray-500 mb-4">Status Distribution</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-2">
                        {statusDistribution.map((s) => (
                            <div key={s.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.fill }} />
                                    <span className="text-sm text-gray-400">{s.name}</span>
                                </div>
                                <span className="text-sm font-bold">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Reps */}
                <div className="glass-card p-6 chart-card">
                    <h3 className="text-lg font-semibold mb-1">Top Performers</h3>
                    <p className="text-xs text-gray-500 mb-4">Sales Representatives</p>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {repPerformance.slice(0, 8).map((rep, i) => (
                            <div key={rep.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${i < 3 ? 'bg-indigo-500/30 text-indigo-400' : 'bg-gray-700 text-gray-400'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="text-sm truncate max-w-[100px]">{rep.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium">{formatCompact(rep.revenue)}</div>
                                    <div className="text-xs text-gray-500">{rep.deals} deals</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Data Table with Pagination */}
            <div className={`glass-card p-6 overflow-hidden chart-card ${spotlight === 'table' ? 'spotlight' : ''}`}>
                <DataTable data={data} />
            </div>
        </div>
    );
}

// Separate DataTable component with internal pagination state
function DataTable({ data }: { data: SalesRecord[] }) {
    const PAGE_SIZE = 25;
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, data.length);
    const paginatedData = data.slice(startIndex, endIndex);

    // Reset to page 1 when data changes (e.g., filters applied)
    useMemo(() => {
        setCurrentPage(1);
    }, [data.length]);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Detailed Records</h3>
                    <p className="text-xs text-gray-500">
                        Showing {startIndex + 1}-{endIndex} of {data.length.toLocaleString()} records
                    </p>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="First page"
                        >
                            <ChevronsLeft size={18} />
                        </button>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Previous page"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            <span className="text-sm">
                                Page <span className="font-bold text-indigo-400">{currentPage}</span> of {totalPages.toLocaleString()}
                            </span>
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Next page"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Last page"
                        >
                            <ChevronsRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="data-table">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th>Region</th>
                            <th>Product</th>
                            <th>Quarter</th>
                            <th>Revenue</th>
                            <th>Target</th>
                            <th>%</th>
                            <th>Rep</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((record) => {
                            const perf = record.target > 0 ? Math.round((record.revenue / record.target) * 100) : 0;
                            return (
                                <tr key={record.id}>
                                    <td>
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.regions[record.region] || '#888' }} />
                                            {record.region}
                                        </span>
                                    </td>
                                    <td className="text-gray-400">{record.product}</td>
                                    <td className="text-gray-400">{record.quarter}</td>
                                    <td className="font-medium">{formatCurrency(record.revenue)}</td>
                                    <td className="text-gray-500">{formatCurrency(record.target)}</td>
                                    <td className={perf >= 100 ? 'text-green-400' : perf >= 80 ? 'text-yellow-400' : 'text-red-400'}>
                                        {perf}%
                                    </td>
                                    <td className="text-gray-400 text-xs">{record.rep}</td>
                                    <td>
                                        <span
                                            className="px-2 py-1 rounded-full text-xs font-medium"
                                            style={{
                                                backgroundColor: statusColors[record.status].bg,
                                                color: statusColors[record.status].text,
                                                border: `1px solid ${statusColors[record.status].border}`,
                                            }}
                                        >
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Bottom pagination for large datasets */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <span className="text-xs text-gray-500">
                        {data.length.toLocaleString()} total records • {PAGE_SIZE} per page
                    </span>
                    <div className="flex items-center gap-1">
                        {/* Quick jump buttons for large datasets */}
                        {totalPages > 10 && (
                            <select
                                value={currentPage}
                                onChange={(e) => goToPage(Number(e.target.value))}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <option key={page} value={page}>
                                        Page {page}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
