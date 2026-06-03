import React from 'react';
import { createRoot } from 'react-dom/client';
import FiguresApp from './components/FiguresApp';
// import './index.css';

const root = createRoot(document.getElementById('figures-root')!);
root.render(<FiguresApp />);