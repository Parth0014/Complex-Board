import { createRoot } from 'react-dom/client';
import App from './App';
import { applyFluentTheme } from './studio/design-system/fluentTheme';
applyFluentTheme(document);
const node = document.getElementById('root');
if (node) createRoot(node).render(<App />);
