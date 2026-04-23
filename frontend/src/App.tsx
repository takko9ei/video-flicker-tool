import { useState } from 'react';
import VideoCropper from './components/VideoCropper';
import ObjectPlaceholderAnalysis from './components/FlickerAnalysis'; // wait

export default function App() {
  const [activeTab, setActiveTab] = useState<'cropper' | 'flicker'>('cropper');

  return (
    <div className="app-container">
      <header className="header">
        <h1>Video Flicker Tool</h1>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'cropper' ? 'active' : ''}`}
            onClick={() => setActiveTab('cropper')}
          >
            Video Cropper
          </button>
          <button 
            className={`tab-btn ${activeTab === 'flicker' ? 'active' : ''}`}
            onClick={() => setActiveTab('flicker')}
          >
            Flicker Analysis
          </button>
        </div>
      </header>

      <main className="content-area">
        {activeTab === 'cropper' && <VideoCropper />}
        {activeTab === 'flicker' && <ObjectPlaceholderAnalysis />}
      </main>
    </div>
  );
}
