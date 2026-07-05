import { useLocation, Navigate, Link } from 'react-router-dom';
import { Download, RefreshCw, Trash2, ArrowLeft, FolderOpen } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface GeneratedImage {
  type: string;
  url: string;
}

export default function ResultsPage() {
  const location = useLocation();
  const state = location.state as { images: GeneratedImage[], originalFront: string, outputDir: string | null } | null;

  if (!state) {
    return <Navigate to="/" />;
  }

  const handleDownloadAll = async () => {
    try {
      const zip = new JSZip();
      
      // Fetch each image and add it to the zip
      for (let i = 0; i < state.images.length; i++) {
        const img = state.images[i];
        const response = await fetch(img.url);
        const blob = await response.blob();
        zip.file(`${img.type.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'generated_product_images.zip');
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert('Failed to download images as ZIP.');
    }
  };

  const handleDownloadSingle = async (url: string, type: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, `${type.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Generated Images</h2>
          <p className="text-slate-600">Successfully generated 4 virtual try-on variations of your product.</p>
        </div>
        
        <div className="flex gap-3">
          <Link to="/" className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 py-2 px-4 rounded-xl font-medium hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18} /> New Product
          </Link>
          <button 
            onClick={handleDownloadAll}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl font-medium shadow-sm transition-colors"
          >
            <Download size={18} /> Download All (ZIP)
          </button>
        </div>
      </div>

      {state.outputDir && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 flex items-start gap-3 mb-8">
          <FolderOpen className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Automatically Saved!</h4>
            <p className="text-sm opacity-90 mt-1">
              Your images have been saved to your selected local directory: <span className="font-mono bg-white px-1.5 py-0.5 rounded text-xs ml-1 border border-green-100">{state.outputDir}</span>
            </p>
          </div>
        </div>
      )}

      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {state.images.map((img, idx) => (
          <div key={idx} className="break-inside-avoid bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
            <div className="relative aspect-[4/5] bg-slate-100 flex items-center justify-center overflow-hidden">
              {/* Fallback rendering since we are using placeholder URLs */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-0 opacity-20">
                <img src={state.originalFront} alt="Original watermark" className="w-full h-full object-contain blur-sm" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                <button className="bg-white/90 backdrop-blur text-slate-800 p-2.5 rounded-full hover:bg-white hover:scale-105 transition-all shadow-lg" title="Regenerate">
                  <RefreshCw size={18} />
                </button>
                <div className="flex gap-2">
                  <button className="bg-red-500/90 backdrop-blur text-white p-2.5 rounded-full hover:bg-red-600 hover:scale-105 transition-all shadow-lg" title="Delete">
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDownloadSingle(img.url, img.type)}
                    className="bg-blue-600/90 backdrop-blur text-white p-2.5 rounded-full hover:bg-blue-700 hover:scale-105 transition-all shadow-lg" 
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
              <h3 className="relative z-10 text-xl font-bold text-slate-800 bg-white/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-200 shadow-sm shadow-black/5">
                {img.type}
              </h3>
            </div>
            <div className="p-4 bg-white border-t border-slate-100">
              <h4 className="font-semibold text-slate-800 text-sm">{img.type}</h4>
              <p className="text-xs text-slate-500 mt-1">Resolution: 1024x1024</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
