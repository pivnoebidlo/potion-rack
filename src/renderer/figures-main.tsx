import React from 'react';
import { createRoot } from 'react-dom/client';
import FiguresApp from './components/FiguresApp';
import ToastContainer from './components/Toast';
import './themes/base.css';
import './themes/midnight.css';
import './themes/light.css';
import './themes/dark.css';
import './themes/retro.css';

let savedTheme: string | null = null;
try { savedTheme = localStorage.getItem('potion-rack-theme'); } catch (e) {}

const root = createRoot(document.getElementById('figures-root')!);
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

root.render(
    <>
        <FiguresApp />
        <ToastContainer />
    </>
);