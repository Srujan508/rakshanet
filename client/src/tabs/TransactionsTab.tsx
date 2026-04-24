import React, { useState } from 'react';
import { Panel, PanelHeader, LiveBadge } from '../components/Panel';
import TxnItem from '../components/TxnItem';
import { ClipboardList } from 'lucide-react';
import type { Transaction, Decision } from '../types';

interface TransactionsTabProps {
  transactions: Transaction[];
}

type Filter = 'ALL' | Decision;

const FILTERS: { label: string; value: Filter; color: string }[] = [
  { label: 'All',      value: 'ALL',      color: '#94a3b8' },
  { label: 'Blocked',  value: 'BLOCK',    color: '#f43f5e' },
  { label: 'Friction', value: 'FRICTION', color: '#f59e0b' },
  { label: 'Allowed',  value: 'ALLOW',    color: '#10b981' },
];

const TransactionsTab: React.FC<TransactionsTabProps> = ({ transactions }) => {
  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = filter === 'ALL' ? transactions : transactions.filter(t => t.decision === filter);

  return (
    <div className="space-y-4 fade-up">
      <Panel>
        <PanelHeader
          icon={<ClipboardList size={18} className="text-cyan-400" />}
          iconBg="rgba(6,182,212,0.12)"
          title="Transaction History"
          badge={<LiveBadge />}
        />

        {/* Filter pills */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200
                          ${filter === f.value
                            ? 'border-white/20 bg-white/10'
                            : 'border-white/[0.06] bg-transparent text-slate-400 hover:text-slate-200 hover:border-white/10'
                          }`}
              style={filter === f.value ? { color: f.color, boxShadow: `0 0 12px ${f.color}30` } : {}}
            >
              {f.label}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                {f.value === 'ALL' ? transactions.length : transactions.filter(t => t.decision === f.value).length}
              </span>
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-0.5">
          {filtered.length === 0 ? (
            <div className="text-center text-slate-600 py-12 text-sm">No transactions match filter</div>
          ) : (
            filtered.map(t => <TxnItem key={t.id} txn={t} />)
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-600">
          <span>Showing {filtered.length} of {transactions.length} transactions</span>
          <span className="font-mono">Last 100 stored in memory</span>
        </div>
      </Panel>
    </div>
  );
};

export default TransactionsTab;
