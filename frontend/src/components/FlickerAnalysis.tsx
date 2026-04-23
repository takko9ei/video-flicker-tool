import { useState, useRef } from 'react';
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
  } | null>(null);
  
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
                 <LineChart data={analysisData.data} onClick={syncHover}>
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
          
        </div>
      )}
    </div>
  );
}
