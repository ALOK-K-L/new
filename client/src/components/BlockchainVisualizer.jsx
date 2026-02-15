import React from 'react';
import { Link, ShieldCheck, Clock, MapPin, Hash, User, FileText } from 'lucide-react';

const BlockchainVisualizer = ({ blocks }) => {
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                <ShieldCheck size={48} className="mb-4 opacity-20" />
                <p className="font-mono text-sm">Waiting for genesis block...</p>
            </div>
        );
    }

    // Sort blocks by index ascending (Genesis -> Latest)
    const sortedBlocks = [...blocks].sort((a, b) => a.index - b.index);

    return (
        <div className="w-full overflow-x-auto pb-6 custom-scrollbar">
            <div className="flex items-start gap-4 min-w-max px-2">
                {sortedBlocks.map((block, index) => {
                    let data = {};
                    try {
                        data = typeof block.data === 'string' ? JSON.parse(block.data) : block.data || {};
                    } catch (e) {
                        data = { action: 'ERROR', message: 'Invalid Data Format' };
                    }

                    const isGenesis = block.index === 0;
                    const isVerified = data.action?.includes('VERIFIED');
                    const hasError = data.action?.includes('ERROR') || data.action?.includes('FALLBACK');

                    return (
                        <div key={block.index} className="flex items-center">
                            {/* Connector Line (Left side for non-genesis) */}
                            {/* We use a right-connector pattern below, so this is implicit in the flex gap/arrows */}

                            {/* Block Card */}
                            {/* Block Card */}
                            <div className={`relative group w-[400px] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                                rounded-xl border-2 overflow-hidden
                                ${isGenesis ? 'bg-amber-50/50 border-amber-200' :
                                    hasError ? 'bg-orange-50/50 border-orange-200' :
                                        'bg-white border-slate-200 hover:border-blue-400'
                                }`}>

                                {/* Header / Hash Bar */}
                                <div className={`px-4 py-2 border-b flex justify-between items-center text-[10px] font-mono
                                    ${isGenesis ? 'bg-amber-100/50 text-amber-800 border-amber-200' :
                                        hasError ? 'bg-orange-100/50 text-orange-800 border-orange-200' :
                                            'bg-slate-50 text-slate-500 border-slate-200'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <Hash size={12} />
                                        <span className="truncate w-24" title={block.hash}>
                                            {block.hash.substring(0, 16)}...
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-75">
                                        <Clock size={12} />
                                        <span>{new Date(block.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                                Block #{block.index}
                                            </div>
                                            <h4 className={`text-lg font-bold truncate w-64 ${hasError ? 'text-blue-600' : 'text-slate-800'}`} title={data.action}>
                                                {data.action === 'COMPLAINT_FILED_FALLBACK' ? 'PENDING VERIFICATION' : (data.action?.replace(/_/g, ' ') || 'RECORD')}
                                            </h4>
                                        </div>
                                        {isVerified && <ShieldCheck size={24} className="text-green-500" />}
                                        {hasError && <div className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded">PROVISIONAL</div>}
                                    </div>

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="text-[10px] uppercase text-slate-400 block mb-1">Target</span>
                                            <div className="font-semibold truncate" title={data.department}>{data.department || 'General'}</div>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="text-[10px] uppercase text-slate-400 block mb-1">Reference</span>
                                            <div className="font-mono truncate">ID: {data.complaint_id || 'N/A'}</div>
                                        </div>
                                    </div>

                                    {/* Location & User */}
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                                        <div className="flex items-center gap-1" title="Location">
                                            <MapPin size={12} />
                                            {data.location ? `${Number(data.location.lat).toFixed(4)}, ${Number(data.location.lng).toFixed(4)}` : 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-1" title="User ID">
                                            <User size={12} />
                                            {data.user_id || 'System'}
                                        </div>
                                    </div>

                                    {/* Previous Hash (Verification Link) */}
                                    <div className="mt-3 text-[10px] font-mono text-slate-400 truncate flex items-center gap-1 group/hash cursor-help">
                                        <Link size={10} className="text-slate-300" />
                                        <span className="opacity-50 group-hover/hash:opacity-100 transition-opacity">
                                            Prev: {block.previous_hash.substring(0, 20)}...
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Link Connector */}
                            {index < sortedBlocks.length - 1 && (
                                <div className="flex items-center justify-center px-2 text-slate-300">
                                    <div className="w-8 h-1 bg-slate-200 rounded-full relative">
                                        <div className="absolute -right-1 -top-1.5 text-slate-300">▶</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BlockchainVisualizer;
