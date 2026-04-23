import os
import cv2
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math

app = FastAPI(title="Video Flicker Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ProcessRequest(BaseModel):
    filename: str
    start_frame: int
    end_frame: int
    x: int
    y: int
    width: int
    height: int

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename.endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only .mp4 files are supported")
    
    filepath = os.path.join(UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
        
    # Extract metadata using OpenCV
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Could not open video file")
        
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    cap.release()
    
    return {
        "filename": file.filename,
        "fps": fps,
        "total_frames": total_frames,
        "width": width,
        "height": height
    }

@app.get("/video/{filename}")
async def get_video(filename: str, request: Request):
    """
    Serves video with Range requests support (206 Partial Content),
    which is absolutely required for HTML5 exact frame seeking.
    """
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
        
    file_size = os.path.getsize(filepath)
    range_header = request.headers.get("range")
    
    if range_header:
        # e.g. "bytes=0-"
        byte1, byte2 = 0, None
        match = range_header.replace("bytes=", "").split("-")
        if match[0]:
            byte1 = int(match[0])
        if len(match) > 1 and match[1]:
            byte2 = int(match[1])
            
        length = file_size - byte1
        if byte2 is not None:
            length = byte2 + 1 - byte1
            
        def file_iterator(filepath, offset, chunk_size):
            with open(filepath, "rb") as f:
                f.seek(offset)
                chunk = f.read(chunk_size)
                while chunk:
                    yield chunk
                    chunk = f.read(chunk_size)
                    
        headers = {
            "Content-Range": f"bytes {byte1}-{byte1 + length - 1}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(file_iterator(filepath, byte1, length), status_code=206, headers=headers)
    else:
        return FileResponse(filepath, media_type="video/mp4")

@app.post("/process")
async def process_video(req: ProcessRequest):
    input_path = os.path.join(UPLOAD_DIR, req.filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Original video not found")
        
    name, ext = os.path.splitext(req.filename)
    output_filename = f"{name}_cropped_{req.start_frame}_{req.end_frame}{ext}"
    output_path = os.path.join(UPLOAD_DIR, output_filename)
    
    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    # Setup Video Writer
    fourcc = cv2.VideoWriter_fourcc(*'avc1') # typical fallback, or mp4v
    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (req.width, req.height))
    
    # Seek to start frame
    cap.set(cv2.CAP_PROP_POS_FRAMES, req.start_frame)
    current_frame = req.start_frame
    
    while True:
        ret, frame = cap.read()
        if not ret or current_frame > req.end_frame:
            break
            
        # Crop frame to bounding box [y:y+h, x:x+w]
        cropped = frame[req.y : req.y + req.height, req.x : req.x + req.width]
        out.write(cropped)
        
        current_frame += 1
        
    cap.release()
    out.release()
    
    # Note: OpenCV's mp4v writer might not be viewable natively in all browsers
    # To fix this, you might need to transcode with ffmpeg if browser playback is required.
    # For now, it outputs standard mp4 file perfectly readable by desktop video players.
    
    return {"message": "Success", "output_file": output_filename, "path": output_path}

class AnalyzeRequest(BaseModel):
    filename: str

@app.post("/analyze")
async def analyze_video(req: AnalyzeRequest):
    input_path = os.path.join(UPLOAD_DIR, req.filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Video not found")
        
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Could not open video file")
        
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    data = []
    current_frame = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Calculate mean pixel intensity
        mean_val = gray.mean()
        
        data.append({"frame": current_frame, "intensity": round(mean_val, 2)})
        current_frame += 1
        
    cap.release()
    
    return {
        "filename": req.filename,
        "fps": fps,
        "total_frames": total_frames,
        "data": data
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

