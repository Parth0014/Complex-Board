import { TooltipProvider } from './studio/ui/Tooltip';
import { createRoot } from 'react-dom/client';
import App from './App';

const node = document.getElementById('root');
const url = new URL(window.location.href);
if (import.meta.env.DEV && url.searchParams.has('templateStudio')) {
  url.pathname = '/template-maker/';
  url.searchParams.delete('templateStudio');
  window.location.replace(url.href);
} else if (node)
  createRoot(node).render(
    <>
      <App />
      <TooltipProvider ownerWindow={window} />
    </>,
  );
