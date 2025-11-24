export enum AppMode {
  LIVE_CONVERSATION = 'conversation',
  VEO_ANIMATOR = 'animator',
  SCENARIO_BUILDER = 'scenario',
  CULTURAL_SEARCH = 'search',
}

export interface NavItem {
  id: AppMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}
