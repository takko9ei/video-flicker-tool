import { useState, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function FlickerAnalysis() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [videoInfo, setVideoInfo] = useState<{
    filename: string;
    url: string;
  } | null>(null);
  
  const [analysisData, setAnalysisData] = useState<{
    fps: number;
    total_frames: number;
    data: { frame: number; intensity: number }[];
    fourier?: {
      A0: number;
      harmonics: { n: number; a: number; b: number }[];
    };
  } | null>(null);
  
  const [harmonicsN, setHarmonicsN] = useState<number>(10);
  const [amplitudeScale, setAmplitudeScale] = useState<number>(1.0);
  
  const [syncFrame, setSyncFrame] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setIsUploading(true);
    setAnalysisData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload the video
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      setVideoInfo({
        filename: uploadData.filename,
        url: `/api/video/${uploadData.filename}`
      });
      setIsUploading(false);
      setIsAnalyzing(true);
      
      // 2. Request analysis
      const analyzeRes = await fetch('/api/analyze', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ filename: uploadData.filename })
      });
      
      const analyzeData = await analyzeRes.json();
      setAnalysisData(analyzeData);
      
    } catch (err) {
      console.error("Process failed", err);
      alert("Failed to process video.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };
  
  /**
   * Video-Chart Synchronization Core Logic
   * 
   * Triggers natively built-in `onTimeUpdate` multiple times per second.
   */
  const handleTimeUpdate = () => {
    if (!videoRef.current || !analysisData) return;
    
    // Extrapolate integer frame number from continuous float time.
    // e.g. currentTime = 1.25s, fps = 30 -> 1.25 * 30 = 37.5
    // `Math.floor` drops the decimal, anchoring cleanly back exactly to standard integer frame 37.
    // This perfectly correlates float time with our discrete `[frame]` JSON indices.
    const currentFrame = Math.floor(videoRef.current.currentTime * analysisData.fps);
    
    // Clamp to prevent out-of-bounds frame indexing
    const clampedFrame = Math.max(0, Math.min(currentFrame, analysisData.total_frames - 1));
    setSyncFrame(clampedFrame);
  };

  const syncHover = (e: any) => {
    if (e.activeTooltipIndex !== undefined && videoRef.current && analysisData) {
      const selectedFrame = e.activeTooltipIndex;
      videoRef.current.currentTime = selectedFrame / analysisData.fps;
    }
  }

  const chartData = useMemo(() => {
    if (!analysisData) return [];
    
    if (!analysisData.fourier) {
      return analysisData.data;
    }

    const { A0, harmonics } = analysisData.fourier;
    const w = (2 * Math.PI) / analysisData.total_frames;

    return analysisData.data.map(d => {
      let fitted = A0;
      for (let i = 0; i < harmonicsN; i++) {
        const h = harmonics[i];
        if (!h) break;
        fitted += h.a * Math.cos(h.n * w * d.frame) + h.b * Math.sin(h.n * w * d.frame);
      }
      fitted *= amplitudeScale;
      return { ...d, fitted };
    });
  }, [analysisData, harmonicsN, amplitudeScale]);

  const generateMotionScript = () => {
    if (!analysisData?.fourier) return;
    
    const L = analysisData.total_frames;
    const w = (2 * Math.PI) / L;
    let script = `// Auto-generated Fourier Motion Script\n`;
    script += `// Seamless Looping: N (Harmonics) = ${harmonicsN}, Scale = ${amplitudeScale}\n\n`;
    script += `float w = ${w.toFixed(6)}f;\n`;
    script += `float t = Time.time * ${analysisData.fps.toFixed(2)}f; // Replace with your driving time/frame variable\n\n`;
    script += `float offset = ${analysisData.fourier.A0.toFixed(4)}f;\n`;
    
    for(let i=0; i<harmonicsN; i++) {
      const h = analysisData.fourier.harmonics[i];
      if (!h) break;
      script += `offset += ${h.a.toFixed(4)}f * Mathf.Cos(${h.n} * w * t) + ${h.b.toFixed(4)}f * Mathf.Sin(${h.n} * w * t);\n`;
    }
    script += `\noffset *= ${amplitudeScale.toFixed(4)}f;\n`;
    
    // Example usage for Unity
    script += `// transform.localPosition = new Vector3(transform.localPosition.x, offset, transform.localPosition.z);\n`;

    navigator.clipboard.writeText(script);
    alert("Motion script copied to clipboard!");
  };

  return (
    <div className="panel">
      {!videoInfo ? (
        <div className="upload-section">
          <h2>Flicker Analysis Tracker</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
            Upload a cropped video to generate a pixel intensity time-series chart.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <input 
              type="file" 
              accept="video/mp4" 
              onChange={handleFileChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button 
              className="btn btn-sm" 
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </button>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
              {file ? file.name : "No cropped video chosen"}
            </span>
          </div>
          <button className="btn accent" onClick={handleUploadAndAnalyze} disabled={isUploading || isAnalyzing || !file}>
            {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing Intensity...' : 'Import & Analyze'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{fontSize: '1.5rem', fontWeight: 800}}>Intensity Oscilloscope</h2>
             <div className="coordinate-display">
                Current Frame: <span style={{color: 'var(--primary)', fontWeight: 800}}>{syncFrame}</span>
             </div>
          </div>
          
          {/* Dual Pane Layout (Stacked here for full responsive chart width) */}
          <div className="video-container" style={{ maxWidth: '800px', margin: '0 auto', borderRadius: '4px' }}>
            <video 
              ref={videoRef}
              src={videoInfo.url}
              className="video-element"
              controls
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          <div className="panel" style={{ height: '400px', padding: '1.5rem' }}>
            {analysisData ? (
               <ResponsiveContainer width="100%" height="100%">
                 {/* onMouseMove handles clicking/scrubbing backwards from chart to video! */}
                 <LineChart data={chartData} onClick={syncHover}>
                   <XAxis 
                     dataKey="frame" 
                     stroke="var(--text-main)" 
                     tick={{ fill: 'var(--text-main)', fontWeight: 700 }}
                     minTickGap={30}
                   />
                   <YAxis 
                     domain={['auto', 'auto']}
                     stroke="var(--text-main)" 
                     tick={{ fill: 'var(--text-main)', fontWeight: 700 }}
                   />
                   <Tooltip 
                     contentStyle={{ 
                       backgroundColor: 'var(--panel-bg)', 
                       border: 'var(--thick-border)',
                       boxShadow: '4px 4px 0px #000',
                       fontWeight: 800,
                       color: 'var(--text-main)'
                     }}
                   />
                   <Line 
                     type="monotone" 
                     dataKey="intensity" 
                     stroke="var(--primary)" 
                     strokeWidth={3}
                     dot={false}
                     isAnimationActive={false} 
                   />
                   <Line 
                     type="monotone" 
                     dataKey="fitted" 
                     stroke="#ff00ff" 
                     strokeWidth={2}
                     dot={false}
                     isAnimationActive={false} 
                   />
                   {/* This vertical cursor moves synchronously with the video */}
                   <ReferenceLine 
                     x={syncFrame} 
                     stroke="var(--danger)" 
                     strokeWidth={3} 
                   />
                 </LineChart>
               </ResponsiveContainer>
            ) : (
               <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  Processing frame data... Please wait...
               </div>
            )}
          </div>
          
          {analysisData?.fourier && (
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--panel-bg)', borderRadius: '4px', border: 'var(--thick-border)' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 800 }}>Fourier Synthesis Controls</h3>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontWeight: 700 }}>Harmonics (N)</label>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{harmonicsN}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="50" step="1" 
                    value={harmonicsN} 
                    onChange={e => setHarmonicsN(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontWeight: 700 }}>Amplitude Scale</label>
                    <span style={{ fontWeight: 800, color: '#ff00ff' }}>{amplitudeScale.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" max="5.0" step="0.1" 
                    value={amplitudeScale} 
                    onChange={e => setAmplitudeScale(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
                <button className="btn accent" onClick={generateMotionScript}>
                  Copy Motion Script (C#)
                </button>
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
