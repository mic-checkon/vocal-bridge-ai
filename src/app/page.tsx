'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { VoiceControl } from '@/components/VoiceControl';
import { ComparisonView } from '@/components/ComparisonView';
import { useVoiceAgent, FilterState } from '@/hooks/useVoiceAgent';
import salesData from '@/data/sales_data.json';
import {
    Mic, X, TrendingUp, TrendingDown, MapPin, Package, Calendar, AlertTriangle,
    HelpCircle, Undo2, Loader2, MessageSquare, User, Clock
} from 'lucide-react';

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

interface InsightData {
    title: string;
    value: string;
    description: string;
    icon: 'region' | 'product' | 'quarter' | 'status' | 'trend-up' | 'trend-down' | 'user';
    color: string;
}

const allData = salesData as SalesRecord[];

const formatCompact = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
};

// Voice Command Cheatsheet data
const VOICE_COMMANDS = [
    {
        category: 'Filtering', commands: [
            '"Show me critical deals"',
            '"Focus on US-West"',
            '"Filter by Cloud Platform"',
            '"Show Q4 results"',
            '"Deals closing in January"',
        ]
    },
    {
        category: 'Analysis', commands: [
            '"Best region by performance"',
            '"Why is US-West underperforming?"',
            '"Top sales rep"',
            '"Compare US-East and US-West"',
        ]
    },
    {
        category: 'Navigation', commands: [
            '"Show everything" / "Reset"',
            '"Go back" / "Undo"',
            '"Zoom into Sarah Chen\'s deals"',
        ]
    },
];

const getMonthFromDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { month: 'long' });
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Home() {
    const [filters, setFilters] = useState<FilterState>({});
    const [filterHistory, setFilterHistory] = useState<FilterState[]>([{}]);
    const [spotlight, setSpotlight] = useState<SpotlightTarget>(null);
    const [insight, setInsight] = useState<InsightData | null>(null);
    const [showCheatsheet, setShowCheatsheet] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [comparison, setComparison] = useState<{ item1: string; item2: string; type: 'region' | 'product' | 'quarter' | 'rep' } | null>(null);
    const lastContextRef = useRef<string>('');

    // Determine spotlight target based on active filters
    useEffect(() => {
        const activeFilters = Object.entries(filters).filter(([, v]) => v);

        if (activeFilters.length === 0) {
            setSpotlight(null);
            setInsight(null);
            return;
        }

        // Set spotlight based on filter type
        const [filterType, filterValue] = activeFilters[activeFilters.length - 1];

        switch (filterType) {
            case 'region':
                setSpotlight('region');
                break;
            case 'product':
                setSpotlight('product');
                break;
            case 'quarter':
                setSpotlight('quarter');
                break;
            case 'status':
                setSpotlight('status');
                break;
            case 'rep':
                setSpotlight('rep');
                break;
            default:
                setSpotlight('table');
        }

        // Generate insight based on ALL active filters
        const filteredForInsight = allData.filter((r) => {
            if (filters.region && r.region !== filters.region) return false;
            if (filters.product && r.product !== filters.product) return false;
            if (filters.quarter && r.quarter !== filters.quarter) return false;
            if (filters.status && r.status !== filters.status) return false;
            if (filters.rep && r.rep !== filters.rep) return false;
            return true;
        });

        const revenue = filteredForInsight.reduce((s, r) => s + r.revenue, 0);
        const target = filteredForInsight.reduce((s, r) => s + r.target, 0);
        const perf = target > 0 ? Math.round((revenue / target) * 100) : 0;
        const deals = filteredForInsight.reduce((s, r) => s + r.deals, 0);

        const iconMap: { [key: string]: InsightData['icon'] } = {
            region: 'region',
            product: 'product',
            quarter: 'quarter',
            status: 'status',
            rep: 'user',
        };

        const colorMap: { [key: string]: string } = {
            region: '#6366f1',
            product: '#22c55e',
            quarter: '#f59e0b',
            status: filterValue === 'Critical' ? '#ef4444' : filterValue === 'Warning' ? '#f59e0b' : '#22c55e',
            rep: '#8b5cf6',
        };

        // Build title from all active filters
        const filterLabels = activeFilters.map(([k, v]) => `${k}: ${v}`).join(' • ');

        setInsight({
            title: filterLabels,
            value: formatCompact(revenue),
            description: `${filteredForInsight.length.toLocaleString()} records • ${deals.toLocaleString()} deals • ${perf}% of target`,
            icon: iconMap[filterType] || 'trend-up',
            color: colorMap[filterType] || '#6366f1',
        });

    }, [filters]);

    // Handle agent actions (filters, comparisons, undo)
    const handleAgentAction = useCallback((action: string, payload: Record<string, unknown>) => {

        // Show loading briefly
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 300);

        switch (action) {
            case 'set_filter':
                setFilters((prev) => {
                    const newFilters = { ...prev };
                    if (payload.region !== undefined) newFilters.region = payload.region as string || undefined;
                    if (payload.product !== undefined) newFilters.product = payload.product as string || undefined;
                    if (payload.quarter !== undefined) newFilters.quarter = payload.quarter as string || undefined;
                    if (payload.status !== undefined) newFilters.status = payload.status as string || undefined;
                    if (payload.rep !== undefined) newFilters.rep = payload.rep as string || undefined;
                    if (payload.closeMonth !== undefined) newFilters.closeMonth = payload.closeMonth as string || undefined;

                    // Save to history for undo
                    setFilterHistory((h) => [...h, newFilters]);
                    return newFilters;
                });
                break;
            case 'clear_filters':
                setFilters({});
                setSpotlight(null);
                setInsight(null);
                setFilterHistory((h) => [...h, {}]);
                break;
            case 'undo':
                handleUndo();
                break;
            case 'compare':
                if (payload.item1 && payload.item2 && payload.type) {
                    setComparison({
                        item1: payload.item1 as string,
                        item2: payload.item2 as string,
                        type: payload.type as 'region' | 'product' | 'quarter' | 'rep',
                    });
                }
                break;
            default:
                console.log('Unknown action:', action);
        }
    }, []);

    const {
        isConnected,
        isConnecting,
        isMicEnabled,
        transcript,
        agentTranscript,
        isProcessing,
        connect,
        disconnect,
        toggleMic,
        sendDataContext,
    } = useVoiceAgent(handleAgentAction);

    // Apply filters to data
    const filteredData = useMemo(() => {
        setIsLoading(true);
        const result = allData.filter((record) => {
            if (filters.region && record.region !== filters.region) return false;
            if (filters.product && record.product !== filters.product) return false;
            if (filters.quarter && record.quarter !== filters.quarter) return false;
            if (filters.status && record.status !== filters.status) return false;
            if (filters.rep && record.rep !== filters.rep) return false;
            if (filters.closeMonth && getMonthFromDate(record.closeDate) !== filters.closeMonth) return false;
            return true;
        });
        setTimeout(() => setIsLoading(false), 100);
        return result;
    }, [filters]);

    // Build context for agent
    const contextSummary = useMemo(() => {
        const totalRevenue = filteredData.reduce((sum, r) => sum + r.revenue, 0);
        const totalTarget = filteredData.reduce((sum, r) => sum + r.target, 0);
        const performance = totalTarget > 0 ? ((totalRevenue / totalTarget) * 100) : 0;
        const criticalCount = filteredData.filter((r) => r.status === 'Critical').length;
        const warningCount = filteredData.filter((r) => r.status === 'Warning').length;
        const goodCount = filteredData.filter((r) => r.status === 'Good').length;
        const totalDeals = filteredData.reduce((sum, r) => sum + r.deals, 0);

        const regions = [...new Set(filteredData.map((r) => r.region))];
        const products = [...new Set(filteredData.map((r) => r.product))];
        const quarters = [...new Set(filteredData.map((r) => r.quarter))];
        const reps = [...new Set(filteredData.map((r) => r.rep))];

        const regionPerf: Record<string, { revenue: number; target: number }> = {};
        filteredData.forEach((r) => {
            if (!regionPerf[r.region]) regionPerf[r.region] = { revenue: 0, target: 0 };
            regionPerf[r.region].revenue += r.revenue;
            regionPerf[r.region].target += r.target;
        });
        const regionRanking = Object.entries(regionPerf)
            .map(([region, v]) => ({ region, perf: v.target > 0 ? Math.round((v.revenue / v.target) * 100) : 0, revenue: v.revenue, target: v.target }))
            .sort((a, b) => b.perf - a.perf);

        const bestRegion = regionRanking[0];
        const worstRegion = regionRanking[regionRanking.length - 1];

        const productBreakdown = Object.entries(
            filteredData.reduce((acc, r) => { acc[r.product] = (acc[r.product] || 0) + r.revenue; return acc; }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]);

        const repRevenue: Record<string, { revenue: number; deals: number }> = {};
        filteredData.forEach((r) => {
            if (!repRevenue[r.rep]) repRevenue[r.rep] = { revenue: 0, deals: 0 };
            repRevenue[r.rep].revenue += r.revenue;
            repRevenue[r.rep].deals += r.deals;
        });
        const topReps = Object.entries(repRevenue)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const filterDesc = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ') || 'all data';

        const summary = `CURRENT VIEW: ${filterDesc}
RECORDS: ${filteredData.length.toLocaleString()} records
REVENUE: ${formatCompact(totalRevenue)} (${performance.toFixed(1)}% of ${formatCompact(totalTarget)} target)
DEALS: ${totalDeals.toLocaleString()} deals
STATUS: ${goodCount.toLocaleString()} Good, ${warningCount.toLocaleString()} Warning, ${criticalCount.toLocaleString()} Critical
BEST REGION: ${bestRegion?.region} at ${bestRegion?.perf}% (${formatCompact(bestRegion?.revenue || 0)})
WORST REGION: ${worstRegion?.region} at ${worstRegion?.perf}% (${formatCompact(worstRegion?.revenue || 0)} vs ${formatCompact(worstRegion?.target || 0)} target)
TOP PRODUCT: ${productBreakdown[0]?.[0]} with ${formatCompact(productBreakdown[0]?.[1] || 0)}
TOP REPS: ${topReps.map(r => `${r.name}: ${formatCompact(r.revenue)}`).join(', ')}
AVAILABLE REPS: ${reps.slice(0, 10).join(', ')}${reps.length > 10 ? ` (+${reps.length - 10} more)` : ''}`;

        return {
            summary,
            totalRevenue,
            totalTarget,
            performance: Math.round(performance),
            criticalCount,
            warningCount,
            goodCount,
            totalDeals,
            recordCount: filteredData.length,
            regions,
            products,
            quarters,
            reps: reps.slice(0, 20),
            availableMonths: MONTHS,
            regionRanking: regionRanking.map(r => `${r.region}: ${r.perf}%`),
            bestRegion: bestRegion ? { name: bestRegion.region, performance: bestRegion.perf, revenue: bestRegion.revenue } : null,
            worstRegion: worstRegion ? { name: worstRegion.region, performance: worstRegion.perf, revenue: worstRegion.revenue, target: worstRegion.target } : null,
            topProduct: productBreakdown[0] ? { name: productBreakdown[0][0], revenue: productBreakdown[0][1] } : null,
            topReps,
            activeFilters: filters,
            canUndo: filterHistory.length > 1,
        };
    }, [filteredData, filters, filterHistory.length]);

    // Send context to agent when data changes
    useEffect(() => {
        if (!isConnected) return;
        const contextString = JSON.stringify(contextSummary);
        if (contextString === lastContextRef.current) return;
        lastContextRef.current = contextString;
        const timeout = setTimeout(() => { sendDataContext(contextSummary); }, 500);
        return () => clearTimeout(timeout);
    }, [isConnected, contextSummary, sendDataContext]);

    const handleClearFilters = useCallback(() => {
        setFilters({});
        setSpotlight(null);
        setInsight(null);
        setFilterHistory((h) => [...h, {}]);
    }, []);

    const handleUndo = useCallback(() => {
        if (filterHistory.length <= 1) return;
        const newHistory = [...filterHistory];
        newHistory.pop(); // Remove current
        const previousState = newHistory[newHistory.length - 1] || {};
        setFilters(previousState);
        setFilterHistory(newHistory);
    }, [filterHistory]);

    const dismissInsight = useCallback(() => {
        setInsight(null);
        setSpotlight(null);
    }, []);

    const InsightIcon = ({ type }: { type: InsightData['icon'] }) => {
        const iconClass = "w-8 h-8";
        switch (type) {
            case 'region': return <MapPin className={iconClass} />;
            case 'product': return <Package className={iconClass} />;
            case 'quarter': return <Calendar className={iconClass} />;
            case 'status': return <AlertTriangle className={iconClass} />;
            case 'trend-up': return <TrendingUp className={iconClass} />;
            case 'trend-down': return <TrendingDown className={iconClass} />;
            case 'user': return <User className={iconClass} />;
            default: return <TrendingUp className={iconClass} />;
        }
    };

    return (
        <main className={`min-h-screen p-4 md:p-6 lg:p-8 ${spotlight ? 'spotlight-active' : ''}`}>
            {/* Voice Transcript Display (Siri-like feedback) */}
            {isConnected && (transcript || agentTranscript || isProcessing) && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="glass-card px-6 py-3 flex items-center gap-3 min-w-[300px] max-w-[600px]">
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                                <span className="text-indigo-300">Processing...</span>
                            </>
                        ) : agentTranscript ? (
                            <>
                                <MessageSquare className="w-5 h-5 text-purple-400" />
                                <span className="text-purple-300 italic">{agentTranscript}</span>
                            </>
                        ) : transcript ? (
                            <>
                                <Mic className="w-5 h-5 text-green-400" />
                                <span className="text-green-300">"{transcript}"</span>
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Loading Overlay for large datasets */}
            {isLoading && filteredData.length > 10000 && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
                    <div className="glass-card p-6 flex items-center gap-4">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        <span className="text-lg">Processing {filteredData.length.toLocaleString()} records...</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        ExecDeck
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Voice-First Executive Dashboard • {filteredData.length.toLocaleString()} records</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Undo Button */}
                    {filterHistory.length > 1 && (
                        <button
                            onClick={handleUndo}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                            title="Undo last filter"
                        >
                            <Undo2 size={20} />
                        </button>
                    )}

                    {/* Voice Command Cheatsheet Button */}
                    <button
                        onClick={() => setShowCheatsheet(!showCheatsheet)}
                        className={`p-2 rounded-lg transition-colors ${showCheatsheet ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'}`}
                        title="Voice commands"
                    >
                        <HelpCircle size={20} />
                    </button>

                    <VoiceControl
                        isConnected={isConnected}
                        isConnecting={isConnecting}
                        isMicEnabled={isMicEnabled}
                        onConnect={connect}
                        onDisconnect={disconnect}
                        onToggleMic={toggleMic}
                    />
                </div>
            </header>

            {/* Voice Command Cheatsheet */}
            {showCheatsheet && (
                <div className="glass-card p-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-indigo-400">Voice Commands</h3>
                        <button onClick={() => setShowCheatsheet(false)} className="text-gray-500 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {VOICE_COMMANDS.map((group) => (
                            <div key={group.category}>
                                <h4 className="text-xs uppercase text-gray-500 mb-2">{group.category}</h4>
                                <ul className="space-y-1">
                                    {group.commands.map((cmd, i) => (
                                        <li key={i} className="text-sm text-gray-300">{cmd}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Insight Card - Prominent display when filter is applied */}
            {insight && (
                <div className="insight-card mb-6 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div
                            className="p-4 rounded-2xl"
                            style={{ backgroundColor: `${insight.color}20`, color: insight.color }}
                        >
                            <InsightIcon type={insight.icon} />
                        </div>
                        <div>
                            <p className="insight-label">{insight.title}</p>
                            <p className="insight-value">{insight.value}</p>
                            <p className="text-gray-400 text-sm mt-1">{insight.description}</p>
                        </div>
                    </div>
                    <button
                        onClick={dismissInsight}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Voice Hint */}
            {!isConnected && !insight && (
                <div className="glass-card p-4 mb-6 flex items-center gap-3 border-l-4 border-indigo-500">
                    <Mic className="text-indigo-400 flex-shrink-0" size={20} />
                    <div>
                        <p className="text-sm font-medium">Voice Control Ready</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Try: &quot;Show critical deals&quot; • &quot;Best region by performance&quot; • &quot;How is US-West doing?&quot; • &quot;Focus on Q4&quot;
                        </p>
                    </div>
                </div>
            )}

            {/* Dashboard */}
            <Dashboard
                data={filteredData}
                filters={filters}
                onClearFilters={handleClearFilters}
                spotlight={spotlight}
            />

            {/* Comparison View Modal */}
            {comparison && (
                <ComparisonView
                    data={allData}
                    item1={comparison.item1}
                    item2={comparison.item2}
                    type={comparison.type}
                    onClose={() => setComparison(null)}
                />
            )}

            {/* Footer */}
            <footer className="mt-10 pt-6 border-t border-white/5 text-center text-sm text-gray-500">
                Built with{' '}
                <a href="https://vocalbridgeai.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Vocal Bridge
                </a>{' '}
                for the Voice AI Hackathon 2026
            </footer>
        </main>
    );
}
