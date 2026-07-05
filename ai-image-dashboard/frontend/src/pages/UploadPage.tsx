import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, X, Image as ImageIcon, Wand2, FolderOpen } from 'lucide-react';

export default function UploadPage() {
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [imageWidth, setImageWidth] = useState('1024');
  const [imageHeight, setImageHeight] = useState('1024');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [isDraggingFront, setIsDraggingFront] = useState(false);
  const [isDraggingBack, setIsDraggingBack] = useState(false);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!frontImage || !backImage) return;
    
    // Pass state to processing page to start the API calls
    navigate('/processing', { 
      state: { 
        frontImage, 
        backImage, 
        imageSize: `${imageWidth}x${imageHeight}`,
        subjectDescription,
        outputDir
      } 
    });
  };

  const handleSelectFolder = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const directoryHandle = await window.showDirectoryPicker({
          mode: 'readwrite'
        });
        setOutputDir(directoryHandle.name);
        
        // In a real implementation, we'd store the handle in IndexedDB
        // to write files later. For now, we just save the name.
      } else {
        alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderDropzone = (
    file: File | null, 
    setFile: (f: File | null) => void, 
    isDragging: boolean, 
    setIsDragging: (v: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement>,
    label: string
  ) => {
    return (
      <div 
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50'}
          ${file ? 'border-none p-0' : 'p-6'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={inputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setFile(e.target.files[0]);
            }
          }}
        />
        
        {file ? (
          <div className="relative w-full h-full rounded-xl overflow-hidden group">
            <img 
              src={URL.createObjectURL(file)} 
              alt={label} 
              className="w-full h-full object-contain bg-slate-100"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors mr-2"
                title="Remove image"
              >
                <X size={20} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="bg-white text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-colors"
                title="Replace image"
              >
                <UploadCloud size={20} />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white text-sm font-medium truncate">{file.name}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-blue-100 p-4 rounded-full mb-4 text-blue-600">
              <UploadCloud size={32} />
            </div>
            <p className="text-slate-700 font-medium mb-1">Upload {label}</p>
            <p className="text-slate-500 text-sm text-center">Drag and drop your image here, or click to browse</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Virtual Try-On Generation</h2>
        <p className="text-slate-600">Upload your product images and let AI generate realistic models wearing your exact garment across 4 different angles.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="text-slate-400" size={20} />
              <h3 className="font-semibold text-slate-800">Front Side Image</h3>
            </div>
            {renderDropzone(frontImage, setFrontImage, isDraggingFront, setIsDraggingFront, frontInputRef, "Front Image")}
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="text-slate-400" size={20} />
              <h3 className="font-semibold text-slate-800">Back Side Image</h3>
            </div>
            {renderDropzone(backImage, setBackImage, isDraggingBack, setIsDraggingBack, backInputRef, "Back Image")}
          </div>
        </div>

        <hr className="border-slate-200 mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Output Settings</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Image Size (Width x Height)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={imageWidth} 
                  onChange={(e) => setImageWidth(e.target.value)}
                  placeholder="Width"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                />
                <span className="text-slate-500 font-medium">x</span>
                <input 
                  type="number" 
                  value={imageHeight} 
                  onChange={(e) => setImageHeight(e.target.value)}
                  placeholder="Height"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Model Description</label>
              <textarea 
                value={subjectDescription} 
                onChange={(e) => setSubjectDescription(e.target.value)}
                placeholder="e.g. 3 to 4 years girl wearing the product"
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none resize-none"
              ></textarea>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Local Folder Management</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-600 mb-3">Select a local folder on your computer to automatically save the generated images.</p>
              
              {outputDir ? (
                <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FolderOpen size={18} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-800 truncate">{outputDir}</span>
                  </div>
                  <button onClick={handleSelectFolder} className="text-xs text-blue-600 font-medium ml-2 flex-shrink-0">Change</button>
                </div>
              ) : (
                <button 
                  onClick={handleSelectFolder}
                  className="flex items-center justify-center gap-2 w-full bg-white border border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <FolderOpen size={18} /> Select Output Folder
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={handleGenerate}
            disabled={!frontImage || !backImage}
            className={`flex items-center gap-2 py-3 px-8 rounded-xl font-bold text-white transition-all transform active:scale-95
              ${(!frontImage || !backImage) 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30'}`}
          >
            <Wand2 size={20} />
            Generate 4 Model Images
          </button>
        </div>
      </div>
    </div>
  );
}
