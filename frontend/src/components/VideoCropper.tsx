import { useState, useRef } from 'react';
import FrameScrubber from './common/FrameScrubber';
import type { BoundingBox } from './common/FrameScrubber';

export default function VideoCropper() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{
    filename: string;
    fps: number;
    totalFrames: number;
    width: number;
    height: number;
    url: string;
  } | null>(null);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Selection box stored in pure pixels relative to original video resolution
  const [cropPixels, setCropPixels] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  
  const [startFrame, setStartFrame] = useState(0);
  const [endFrame, setEndFrame] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setProcessResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      setVideoInfo({
        filename: data.filename,
        fps: data.fps,
        totalFrames: data.total_frames,
        width: data.width,
        height: data.height,
        url: `/api/video/${data.filename}`
      });
      setEndFrame(data.total_frames > 0 ? data.total_frames - 1 : 0);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload video.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAreaSelected = (percentageBox: BoundingBox) => {
    if (!videoInfo) return;
    
    // Map float percentages [0.0..1.0] back to absolute video pixels
    const absoluteBox = {
      x: Math.round(percentageBox.x * videoInfo.width),
      y: Math.round(percentageBox.y * videoInfo.height),
      width: Math.round(percentageBox.width * videoInfo.width),
      height: Math.round(percentageBox.height * videoInfo.height)
    };
    
    setCropPixels(absoluteBox);
    setSelectionMode(false); // Turn off selection mode after drawing is complete
  };

  const handleProcess = async () => {
    if (!videoInfo || !cropPixels) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: videoInfo.filename,
          start_frame: startFrame,
          end_frame: endFrame,
          x: cropPixels.x,
          y: cropPixels.y,
          width: cropPixels.width,
          height: cropPixels.height
        })
      });

      const data = await response.json();
      if (response.ok) {
        setProcessResult(`Success! Saved to ${data.path}`);
      } else {
        alert("Processing failed: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
      alert("Error calling backend.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="panel">
      {!videoInfo ? (
        <div className="upload-section">
          <h2>Upload Video</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Start by uploading an MP4 file to begin processing.
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
              {file ? file.name : "No file chosen"}
            </span>
          </div>
          <button className="btn" onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading ? 'Uploading...' : 'Upload & Initialize'}
          </button>
        </div>
      ) : (
        <div className="cropper-layout">
          {/* LEFT: Video & Scrubber Area */}
          <div className="video-section">
            <FrameScrubber 
              videoUrl={videoInfo.url}
              fps={videoInfo.fps}
              totalFrames={videoInfo.totalFrames}
              currentFrame={currentFrame}
              onFrameChange={setCurrentFrame}
              selectionMode={selectionMode}
              onAreaSelected={handleAreaSelected}
              onVideoMetadata={() => {}} 
            />
          </div>

          {/* RIGHT: Tools & Constraints Area */}
          <div className="tool-panel">
            <div className="tool-group">
              <label>Resolution Info</label>
              <div className="coordinate-display">
                Original: {videoInfo.width}x{videoInfo.height} ({videoInfo.fps.toFixed(2)} FPS)
              </div>
            </div>

            <div className="tool-group">
              <label>1. Spatial Cropping</label>
              <button 
                className={`btn ${selectionMode ? 'accent' : ''}`} 
                onClick={() => setSelectionMode(!selectionMode)}
              >
                {selectionMode ? 'Drawing...' : 'Select Area'}
              </button>
              
              {cropPixels ? (
                 <div className="coordinate-display">
                   Selected: x:{cropPixels.x}, y:{cropPixels.y} <br/> 
                   Area: {cropPixels.width}x{cropPixels.height} px
                 </div>
              ) : (
                <div style={{color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 700}}>
                  No area selected.
                </div>
              )}
            </div>

            <div className="tool-group">
              <label>2. Temporal Range Selection</label>
              <div className="frame-inputs">
                 <div>
                    <label style={{fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>Start Frame</label>
                    <input 
                      type="number" 
                      value={startFrame} 
                      onChange={(e) => setStartFrame(parseInt(e.target.value) || 0)}
                      min="0"
                      max={videoInfo.totalFrames - 1}
                    />
                 </div>
                 <div>
                    <label style={{fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>End Frame</label>
                    <input 
                      type="number" 
                      value={endFrame} 
                      onChange={(e) => setEndFrame(parseInt(e.target.value) || 0)}
                      min="0"
                      max={videoInfo.totalFrames - 1}
                    />
                 </div>
              </div>
            </div>

            <hr />

            <button 
              className="btn accent" 
              onClick={handleProcess}
              disabled={isProcessing || !cropPixels}
              style={{ width: '100%', padding: '1rem' }}
            >
              {isProcessing ? 'Processing frames...' : 'Record & Export'}
            </button>
            
            {processResult && (
               <div style={{ marginTop: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800, padding: '1.5rem', background: 'var(--accent)', border: 'var(--thick-border)', boxShadow: '4px 4px 0px #000' }}>
                 {processResult}
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
