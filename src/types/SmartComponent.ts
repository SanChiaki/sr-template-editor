export interface SmartComponent {
  id: string;
  location: string;
  type: 'Text' | 'Table' | 'Chart' | 'Image' | 'Formula';
  prompt: string;
  name: string;
  shapeId?: string;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}

export const ComponentTypes = ['Text', 'Table', 'Chart', 'Image', 'Formula'] as const;

export const DefaultColors = {
  Text: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' },
  Table: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981' },
  Chart: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b' },
  Image: { bg: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6' },
  Formula: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444' },
};
