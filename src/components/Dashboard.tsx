import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, History, Download, Plus, LogOut, CheckCircle, 
  XCircle, BarChart3, FileUp, User, Zap, ShieldCheck, Clock
} from 'lucide-react';

interface Conversion {
  _id: string;
  fileName: string;
  fileType: string;
  numFiles: number;
  status: string;
  convertTime: string;
  downloadCount: number;
  downloadTime: string | null;
  fileUrl: string;
  originalFileNames?: string[];
}

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [history, setHistory] = useState<Conversion[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const [files, setFiles] = useState<FileList | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [useOCR, setUseOCR] = useState(false);

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    const [hRes, sRes] = await Promise.all([
      fetch('/api/history', { headers }),
      fetch('/api/stats', { headers })
    ]);
    if (hRes.ok) setHistory(await hRes.json());
    if (sRes.ok) setStats(await sRes.json());
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleConvert = async (e: FormEvent) => {
    e.preventDefault();
    if (!files) return;
    setIsConverting(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    fd.append('useOCR', useOCR.toString());

    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd,
    });

    if (res.ok) {
      fetchData();
      setFiles(null);
    } else {
      alert("Conversion Failed");
    }
    setIsConverting(false);
  };

  const downloadReport = async () => {
    const res = await fetch('/api/report', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MasterPDF_Report_${user?.username}.pdf`;
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* --- GLOSS NAV --- */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform">
            <Zap className="text-black w-6 h-6 fill-black" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white">Master<span className="text-emerald-500">PDF</span></span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <User className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight">{user?.username}</span>
                <button onClick={downloadReport} className="text-[9px] text-emerald-500 font-bold hover:text-emerald-400 text-left uppercase tracking-widest">
                  Generate Report
                </button>
            </div>
          </div>
          <button onClick={logout} className="p-3 hover:bg-red-500/10 rounded-xl transition-colors text-slate-400 hover:text-red-500 group">
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-12">
        
        {/* --- HERO STATS --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Jobs', val: stats.total, icon: BarChart3, color: 'from-blue-500/20 to-transparent', border: 'border-blue-500/20', text: 'text-blue-400' },
            { label: 'Success Rate', val: stats.success, icon: ShieldCheck, color: 'from-emerald-500/20 to-transparent', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            { label: 'System Errors', val: stats.failed, icon: XCircle, color: 'from-red-500/20 to-transparent', border: 'border-red-500/20', text: 'text-red-400' }
          ].map((s, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              key={i} className={`relative overflow-hidden bg-[#0F0F0F] border ${s.border} p-8 rounded-3xl group`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${s.color} blur-3xl -mr-16 -mt-16 opacity-50`} />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{s.label}</p>
                  <h3 className="text-4xl font-black text-white">{s.val}</h3>
                </div>
                <s.icon className={`${s.text} w-6 h-6`} />
              </div>
            </motion.div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* --- CONVERTER CARD --- */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0F0F0F] border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30" />
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Plus className="w-5 h-5 text-emerald-500" /> Start Processing
              </h2>
              
              <form onSubmit={handleConvert} className="space-y-6">
                <div className="group relative border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300">
                  <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e)=>setFiles(e.target.files)} />
                  <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FileUp className="text-emerald-500 w-8 h-8" />
                  </div>
                  <p className="text-white font-bold">{files ? `${files.length} Files Selected` : 'Drop files here'}</p>
                  <p className="text-xs text-slate-500 mt-2">PDF, Images, or TXT</p>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-slate-300">OCR Engine</span>
                    </div>
                    <button type="button" onClick={()=>setUseOCR(!useOCR)} className={`w-11 h-6 rounded-full transition-all relative ${useOCR ? 'bg-emerald-500' : 'bg-white/10'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-lg ${useOCR ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <button disabled={!files || isConverting} className="w-full relative group overflow-hidden bg-emerald-500 text-black font-black py-4 rounded-2xl transition-all hover:bg-emerald-400 disabled:opacity-30">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isConverting ? <Clock className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5" />}
                    {isConverting ? 'Processing...' : 'Run Conversion'}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* --- LOGS TABLE --- */}
          <div className="lg:col-span-8">
            <div className="bg-[#0F0F0F] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h2 className="font-bold text-white flex items-center gap-3">
                  <History className="w-5 h-5 text-emerald-500" /> Activity Logs
                </h2>
                <span className="text-[10px] bg-white/5 px-3 py-1 rounded-full text-slate-500 font-mono">LIVE_FEED_01</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-[0.2em] bg-white/[0.01]">
                      <th className="px-8 py-5 font-black">Asset Details</th>
                      <th className="px-8 py-5 font-black">Method</th>
                      <th className="px-8 py-5 font-black text-center">Stats</th>
                      <th className="px-8 py-5 font-black text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence>
                    {history.map((item, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        key={item._id} className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                                <FileText className="w-5 h-5 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white mb-0.5">{item.fileName}</p>
                                <p className="text-[10px] text-slate-500 italic truncate w-48">Ref: {item.originalFileNames?.join(', ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {item.fileType}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-slate-300">{item.downloadCount}</span>
                            <span className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter">Downloads</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <a href={item.fileUrl} className="inline-flex items-center gap-2 text-xs font-black text-emerald-500 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 px-4 py-2.5 rounded-xl transition-all group/btn">
                            <Download className="w-3.5 h-3.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            GET FILE
                          </a>
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <div className="opacity-20 flex flex-col items-center">
                            <History className="w-12 h-12 mb-4" />
                            <p className="text-sm font-bold">No Records Found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
