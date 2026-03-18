import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, History, Download, Plus, LogOut, CheckCircle, XCircle, BarChart3, FileUp, User } from 'lucide-react';

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
    try {
        const [hRes, sRes] = await Promise.all([
            fetch('/api/history', { headers }),
            fetch('/api/stats', { headers })
        ]);
        if (hRes.ok) setHistory(await hRes.json());
        if (sRes.ok) setStats(await sRes.json());
    } catch (e) { console.error("Fetch error", e); }
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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <nav className="border-b border-white/10 bg-[#141414] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center"><FileText className="text-black" /></div>
          <span className="text-xl font-bold">MasterPDF</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <User className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium">{user?.username}</span>
            <button onClick={downloadReport} className="ml-2 text-[10px] bg-emerald-500 text-black px-2 py-1 rounded font-bold hover:bg-emerald-400">
              DOWNLOAD REPORT
            </button>
          </div>
          <button onClick={logout} className="p-2 hover:bg-white/5 rounded-lg"><LogOut className="w-5 h-5" /></button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[ { l: 'Total Conversions', v: stats.total, i: BarChart3, c: 'text-blue-400' }, { l: 'Success Logs', v: stats.success, i: CheckCircle, c: 'text-emerald-400' }, { l: 'Failed Logs', v: stats.failed, i: XCircle, c: 'text-red-400' } ].map((s, i) => (
            <div key={i} className="bg-[#141414] border border-white/10 p-6 rounded-2xl">
              <div className="flex justify-between mb-2"><span className="text-gray-400 text-xs uppercase font-bold">{s.l}</span><s.i className={s.c} /></div>
              <p className="text-3xl font-bold">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl h-fit">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-500" /> New Conversion</h2>
            <form onSubmit={handleConvert} className="space-y-4">
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center relative hover:border-emerald-500/50 transition-colors">
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e)=>setFiles(e.target.files)} />
                <FileUp className="mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-400">{files ? `${files.length} files selected` : 'Click or Drag files'}</p>
                <p className="text-[10px] text-gray-600 mt-2">PDFs will merge, Images/Text will convert to PDF</p>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400 bg-black/30 p-3 rounded-lg">
                <span>Enable OCR (Images Only)</span>
                <button type="button" onClick={()=>setUseOCR(!useOCR)} className={`w-10 h-5 rounded-full relative transition-colors ${useOCR ? 'bg-emerald-500':'bg-white/10'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useOCR?'left-6':'left-1'}`} />
                </button>
              </div>
              <button disabled={!files || isConverting} className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl disabled:opacity-50">
                {isConverting ? 'Processing Files...' : 'Start Conversion'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/10 font-bold flex items-center gap-2"><History className="text-emerald-500" /> History & Logs</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] text-gray-500 uppercase bg-black/50">
                  <tr>
                    <th className="px-6 py-4">File / Original Names</th>
                    <th className="px-6 py-4">Conv. Type</th>
                    <th className="px-6 py-4">Stats</th>
                    <th className="px-6 py-4">Timestamps</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map((item) => (
                    <tr key={item._id} className="text-xs hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-white font-bold">{item.fileName}</p>
                        <p className="text-[10px] text-gray-500 truncate w-48 italic">
                          From: {item.originalFileNames?.join(', ')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-white/5 px-2 py-1 rounded text-emerald-500 border border-emerald-500/20">
                            {item.fileType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-300">{item.numFiles} Files</p>
                        <p className="text-[10px] text-emerald-400">{item.downloadCount} Downloads</p>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        <p>Conv: {new Date(item.convertTime).toLocaleString()}</p>
                        <p>Last DL: {item.downloadTime ? new Date(item.downloadTime).toLocaleDateString() : 'Never'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a href={item.fileUrl} className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-500 hover:text-black transition-all inline-flex items-center gap-1">
                          <Download className="w-3 h-3" /> Download
                        </a>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-500">No conversions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
