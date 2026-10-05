import { createRoot } from 'react-dom/client';
import App from './App';
const node = document.getElementById('root');
if (node) createRoot(node).render(<App />);
