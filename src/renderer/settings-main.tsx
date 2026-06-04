import React from 'react';
import { createRoot } from 'react-dom/client';
import SettingsApp from './components/SettingsApp';
import ToastContainer from './components/Toast';
import './themes/base.css';
import './themes/midnight.css';
import './themes/light.css';
import './themes/dark.css';
import './themes/retro.css';

let savedTheme: string | null = null;
try { savedTheme = localStorage.getItem('potion-rack-theme'); } catch (e) {}

const root = createRoot(document.getElementById('settings-root')!);
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

root.render(
    <>
        <SettingsApp />
        <ToastContainer />
    </>
);