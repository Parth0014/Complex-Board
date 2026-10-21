import './studio/design-system/index.css';
import { createRoot } from 'react-dom/client';
import { KonvaCanvasAdapter } from './vision/canvas/KonvaCanvasAdapter';
import { TemplateStudio } from './studio/TemplateStudio';
import { TooltipProvider } from './studio/ui/Tooltip';

const node = document.getElementById('root');
if (node)
  createRoot(node).render(
    <>
      <TemplateStudio createAdapter={(id) => new KonvaCanvasAdapter(window, id)} />
      <TooltipProvider ownerWindow={window} />
    </>,
  );
