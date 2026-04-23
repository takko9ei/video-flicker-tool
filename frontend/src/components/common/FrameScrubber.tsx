import { useRef, useState, useEffect } from 'react';
import type { MouseEvent } from 'react';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FrameScrubberProps {
  videoUrl: string;
  fps: number;
  totalFrames: number;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  selectionMode: boolean; // Is the crop tool active?
  onAreaSelected: (box: BoundingBox) => void;
  onVideoMetadata: (originalWidth: number, originalHeight: number) => void;
}

export default function FrameScrubber({
  videoUrl,
  fps,
  totalFrames,
  currentFrame,
  onFrameChange,
  selectionMode,
  onAreaSelected,
  onVideoMetadata
}: FrameScrubberProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Bounding box drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);

  // --- Frame-Accurate Seeking Logic ---
  // When currentFrame prop changes (from parent or internally), update video time
  useEffect(() => {
    if (videoRef.current && fps > 0) {
      const frameDuration = 1 / fps;
      // Calculate target time adding half a frame offset to avoid floating point precision issues
      const targetTime = (currentFrame / fps) + (frameDuration / 2);
      
      // Only seek if we are meaningfully out of sync
      if (Math.abs(videoRef.current.currentTime - targetTime) > frameDuration) {
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [currentFrame, fps]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFrame = parseInt(e.target.value, 10);
    onFrameChange(nextFrame);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      onVideoMetadata(videoRef.current.videoWidth, videoRef.current.videoHeight);
      onFrameChange(0); // initialize at 0
    }
  };

  // --- Bounding Box Core Logic ---
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!selectionMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPos({ x, y });
    setIsDrawing(true);
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Clamp coordinates to container bounds
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    setCurrentBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !containerRef.current || !currentBox) return;
    setIsDrawing(false);

    const rect = containerRef.current.getBoundingClientRect();
    
    // Convert relative CSS pixels to coordinate percentages, so parent can apply them to raw video pixels
    const percentageBox = {
      x: currentBox.x / rect.width,
      y: currentBox.y / rect.height,
      width: currentBox.width / rect.width,
      height: currentBox.height / rect.height
    };
    
    onAreaSelected(percentageBox);
  };

  return (
    <div className="scrubber-controls">
      {/* Container must be position: relative to host absolute bounding box */}
      <div 
        className="video-container" 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: selectionMode ? 'crosshair' : 'default' }}
      >
        <video 
          ref={videoRef}
          src={videoUrl}
          className="video-element"
          onLoadedMetadata={handleLoadedMetadata}
          preload="auto"
        />
        
        {/* Render bounding box */}
        {currentBox && currentBox.width > 0 && currentBox.height > 0 && (
          <div 
            className="bounding-box"
            style={{
              left: currentBox.x,
              top: currentBox.y,
              width: currentBox.width,
              height: currentBox.height
            }}
          />
        )}
      </div>

      <div className="scrubber-header">
        <span>Current Frame: <strong>{currentFrame}</strong> / Total Frames: {Math.max(0, totalFrames - 1)}</span>
      </div>
      
      <input 
        type="range" 
        min="0" 
        max={Math.max(0, totalFrames - 1)} 
        value={currentFrame} 
        onChange={handleSliderChange}
        disabled={totalFrames === 0}
      />
    </div>
  );
}
