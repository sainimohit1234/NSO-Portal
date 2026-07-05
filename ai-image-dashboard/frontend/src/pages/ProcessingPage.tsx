import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export default function ProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Uploading images...');
  
  const state = location.state as { frontImage: File, backImage: File, imageSize: string, subjectDescription: string, outputDir: string | null } | null;

  useEffect(() => {
    if (!state) return;

    let mounted = true;
    
    const startProcessing = async () => {
      try {
        // Simulate upload progress
        for (let i = 0; i <= 30; i += 10) {
          if (!mounted) return;
          setProgress(i);
          await new Promise(r => setTimeout(r, 400));
        }

        if (!mounted) return;
        setStatus('Step 1: Generating Base Human Models...');
        setProgress(40);
        await new Promise(r => setTimeout(r, 800));

        // Create FormData
        const formData = new FormData();
        formData.append('frontImage', state.frontImage);
        formData.append('backImage', state.backImage);
        formData.append('imageSize', state.imageSize);
        formData.append('subjectDescription', state.subjectDescription);

        setStatus('Step 2: AI Garment Transfer (Virtual Try-On)...');
        setProgress(50);
        
        // Actually call our backend API
        const response = await fetch('http://localhost:3001/api/generate', {
          method: 'POST',
          body: formData,
        });

        if (!mounted) return;
        
        if (!response.ok) {
          throw new Error('API request failed');
        }

        setStatus('Rendering 4 final VTON variations...');
        setProgress(80);
        
        const data = await response.json();
        
        if (!mounted) return;
        setProgress(100);
        setStatus('Processing complete!');
        
        // Small delay before redirecting to results
        setTimeout(() => {
          navigate('/results', { 
            state: { 
              images: data.images,
              originalFront: URL.createObjectURL(state.frontImage),
              outputDir: state.outputDir
            } 
          });
        }, 800);

      } catch (error) {
        console.error('Error during processing', error);
        setStatus('Error generating images. Please try again.');
      }
    };

    startProcessing();

    return () => {
      mounted = false;
    };
  }, [state, navigate]);

  if (!state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
          <svg className="w-full h-full text-slate-100" viewBox="0 0 100 100">
            <circle className="stroke-current" strokeWidth="6" cx="50" cy="50" r="44" fill="transparent"></circle>
            <circle 
              className="text-blue-600 stroke-current transition-all duration-300 ease-out" 
              strokeWidth="6" 
              strokeLinecap="round" 
              cx="50" cy="50" r="44" 
              fill="transparent" 
              strokeDasharray="276.46" 
              strokeDashoffset={276.46 - (276.46 * progress) / 100}
              transform="rotate(-90 50 50)"
            ></circle>
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            {progress < 100 ? (
              <Loader2 size={32} className="text-blue-600 animate-spin" />
            ) : (
              <CheckCircle2 size={40} className="text-green-500" />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">{status}</h2>
        <p className="text-slate-500 mb-8 text-sm">Estimated time remaining: ~{Math.max(0, Math.floor((100 - progress) / 5))} seconds</p>

        <div className="grid grid-cols-4 gap-4 max-w-md mx-auto opacity-70">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`aspect-square rounded-lg flex items-center justify-center border-2 transition-all duration-500
              ${progress > i * 18 ? 'bg-blue-50 border-blue-200 text-blue-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
              <ImageIcon size={20} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
