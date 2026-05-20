console.log('Potion Rack started');

document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `
        <div style="text-align:center; padding:50px; font-family:sans-serif;">
            <h1>🧪 Potion Rack</h1>
            <p>Paint collection manager for miniature painting</p>
            <p style="color:#4CAF50">✅ Electron + TypeScript is working!</p>
            <button id="test-btn">Test Button</button>
        </div>
    `;
    
    document.getElementById('test-btn')?.addEventListener('click', () => {
        alert('Button works!');
    });
});
