import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  FileText, 
  History, 
  Download, 
  Plus, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  FileUp
} from 'lucide-react';

interface Conversion {
  _id: string;
  fileName: string;
  fileType: string;
  numFiles: number;
  status: string;
  convertTime: string;
  downloadCount: number;
  fileUrl: string;
  originalFileNames?: string[];
}

interface Stats {
  total: number;
  success: number;
  failed: number;
}

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [history, setHistory] = useState<Conversion[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, success: 0, failed: 0 });
  const [files, setFiles] = useState<FileList | null>(null);
  const [type, setType] = useState('image');
  const [isConverting, setIsConverting] = useState(false);
  const [useOCR, setUseOCR] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const fetchData = async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch('/api/history', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (historyRes.ok) setHistory(await historyRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error("Failed to fetch dashboard data");
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement> | FileList) => {
    const selectedFiles = 'target' in e ? e.target.files : e;
    if (!selectedFiles) return;
    setFiles(selectedFiles);
    
    const newPreviews: string[] = [];
    Array.from(selectedFiles).forEach((file: any) => {
      if (file.type.startsWith('image/')) {
        newPreviews.push(URL.createObjectURL(file));
      }
    });
    setPreviews(newPreviews);
  };

  const handleConvert = async (e: FormEvent) => {
    e.preventDefault();
    if (!files) return;

    setIsConverting(true);
    setProgress(10);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('useOCR', useOCR.toString());

    const interval = setInterval(() => {
      setProgress(prev => (prev < 90 ? prev + 5 : prev));
    }, 500);

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        setProgress(100);
        setTimeout(() => {
          alert('Conversion successful!');
          fetchData();
          setFiles(null);
          setPreviews([]);
          setProgress(0);
        }, 500);
      } else {
        alert('Conversion failed');
        setProgress(0);
      }
    } catch (err) {
      alert('Error connecting to server');
      setProgress(0);
    } finally {
      clearInterval(interval);
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Sidebar / Nav */}
      <nav className="border-b border-white/10 bg-[#141414] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <FileText className="text-black w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">MasterPDF</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={async () => {
              const res = await fetch('/api/report', { headers: { 'Authorization': `Bearer ${token}` } });
              if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `MasterPDF_Report_${user?.username}.pdf`;
                a.click();
              }
            }}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-white/10"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            Download Report
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Conversion', value: stats.total, icon: BarChart3, color: 'text-blue-400' },
            { label: 'Successful', value: stats.success, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-red-400' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#141414] border border-white/10 p-6 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Converter Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                New Conversion
              </h2>
              <form onSubmit={handleConvert} className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Select Files</label>
                  <p className="text-xs text-gray-500 mb-4 italic">MasterPDF automatically detects if you're uploading images, text, or PDFs to merge.</p>
                  <div 
                    className="relative group"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-emerald-500'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-emerald-500'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-emerald-500');
                      if (e.dataTransfer.files) handleFileChange(e.dataTransfer.files);
                    }}
                  >
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-white/10 group-hover:border-emerald-500/50 rounded-xl p-8 text-center transition-colors">
                      <FileUp className="w-8 h-8 text-gray-500 mx-auto mb-2 group-hover:text-emerald-500" />
                      <p className="text-sm text-gray-400">
                        {files ? `${files.length} files selected` : 'Click or drag files to upload'}
                      </p>
                    </div>
                  </div>
                </div>

                {previews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {previews.map((url, i) => (
                      <img key={i} src={url} className="w-full h-12 object-cover rounded border border-white/10" referrerPolicy="no-referrer" />
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-400">Enable OCR (Images only)</label>
                    <button 
                      type="button"
                      onClick={() => setUseOCR(!useOCR)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${useOCR ? 'bg-emerald-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useOCR ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                {isConverting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Processing...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <button 
                  disabled={!files || isConverting}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isConverting ? <Clock className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {isConverting ? 'Processing...' : 'Start Conversion'}
                </button>
              </form>
            </div>
          </div>

          {/* History Table */}
          <div className="lg:col-span-2">
            <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-500" />
                  Conversion History
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-white/5">
                      <th className="px-6 py-4 font-medium">File Name</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center">
                              <FileText className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{item.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {item.numFiles} files 
                                {item.originalFileNames && item.originalFileNames.length > 0 && (
                                  <span className="ml-1 opacity-60">
                                    ({item.originalFileNames.join(', ')})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 capitalize">
                            {item.fileType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {item.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={`text-xs ${item.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {item.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(item.convertTime).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a 
                            href={item.fileUrl} 
                            target="_blank"
                            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No conversions yet. Start by uploading some files!
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
