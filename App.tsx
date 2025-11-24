import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { LiveConversation } from './components/LiveConversation';
import { VeoAnimator } from './components/VeoAnimator';
import { ImageEditor } from './components/ImageEditor';
import { SearchQuery } from './components/SearchQuery';
import { AppMode } from './types';

// NOTE: In a real production app, this should be handled securely. 
// For this demo structure, we assume process.env.API_KEY is available as per instructions.
const API_KEY = process.env.API_KEY || '';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LIVE_CONVERSATION);

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE_CONVERSATION:
        return <LiveConversation apiKey={API_KEY} />;
      case AppMode.VEO_ANIMATOR:
        return <VeoAnimator />;
      case AppMode.SCENARIO_BUILDER:
        return <ImageEditor apiKey={API_KEY} />;
      case AppMode.CULTURAL_SEARCH:
        return <SearchQuery apiKey={API_KEY} />;
      default:
        return <LiveConversation apiKey={API_KEY} />;
    }
  };

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50">
        <Navigation currentMode={mode} onModeChange={setMode} />
        <main className="flex-1 overflow-hidden relative">
            {renderContent()}
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
