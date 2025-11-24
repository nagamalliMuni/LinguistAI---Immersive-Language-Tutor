import React from 'react';
import { Mic, Clapperboard, Globe, Image as ImageIcon } from 'lucide-react';
import { AppMode, NavItem } from '../types';

interface NavigationProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const navItems: NavItem[] = [
  { id: AppMode.LIVE_CONVERSATION, label: 'Live Tutor', icon: <Mic className="w-5 h-5" />, description: 'Practice speaking in real-time' },
  { id: AppMode.SCENARIO_BUILDER, label: 'Scenario Builder', icon: <ImageIcon className="w-5 h-5" />, description: 'Edit images for roleplay contexts' },
  { id: AppMode.VEO_ANIMATOR, label: 'Visual Vocab', icon: <Clapperboard className="w-5 h-5" />, description: 'Animate words into video' },
  { id: AppMode.CULTURAL_SEARCH, label: 'Cultural Insight', icon: <Globe className="w-5 h-5" />, description: 'Ask grounded cultural questions' },
];

export const Navigation: React.FC<NavigationProps> = ({ currentMode, onModeChange }) => {
  return (
    <nav className="w-full md:w-64 bg-white border-r border-slate-200 h-full flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-2 text-indigo-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xl font-bold tracking-tight">LinguistAI</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Immersive Language Learning</p>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group
              ${currentMode === item.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <div className={`p-2 rounded-lg transition-colors ${currentMode === item.id ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-500'}`}>
              {item.icon}
            </div>
            <div>
              <div className="font-semibold text-sm">{item.label}</div>
              <div className="text-[10px] opacity-70 leading-tight">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-700 mb-1">Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Gemini 2.5 Active
          </div>
        </div>
      </div>
    </nav>
  );
};
