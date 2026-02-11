export type SmartComponentType = 'Text' | 'Table' | 'Chart' | 'List' | 'Milestone' | 'Gantt' | 'Image' | 'Formula';

export interface SmartComponent {
  id: string;
  location: string;
  type: SmartComponentType;
  prompt: string;
  name: string;
  shapeId?: string;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}

export const ComponentTypes: SmartComponentType[] = ['Text', 'Table', 'Chart', 'List', 'Milestone', 'Gantt'];

export const DefaultColors = {
  Text: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' },
  Table: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981' },
  Chart: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b' },
  List: { bg: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6' },
  Milestone: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444' },
  Gantt: { bg: 'rgba(14, 165, 233, 0.1)', border: '#0ea5e9' },
  // 兼容旧类型
  Image: { bg: 'rgba(236, 72, 153, 0.1)', border: '#ec4899' },
  Formula: { bg: 'rgba(99, 102, 241, 0.1)', border: '#6366f1' },
};
