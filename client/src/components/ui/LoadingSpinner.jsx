import React from 'react';
import ringLoader from '../../assets/ring-loader.png';

const styles = `
@keyframes boltGlow {
    0%,100% { filter: drop-shadow(0 0 10px rgba(0,180,255,0.55)) drop-shadow(0 0 24px rgba(0,100,255,0.35)); }
    50%      { filter: drop-shadow(0 0 22px rgba(0,210,255,0.90)) drop-shadow(0 0 48px rgba(0,120,255,0.60)); }
}
@keyframes boltFloat {
    0%,100% { transform: translateY(0px);  }
    50%      { transform: translateY(-6px); }
}
@keyframes dotPulse {
    0%,100% { opacity:1;   transform:scale(1);   box-shadow: 0 0 6px rgba(30,100,255,0.7);  }
    50%      { opacity:0.4; transform:scale(0.65); box-shadow: 0 0 2px rgba(30,100,255,0.3);  }
}
@keyframes loaderFadeIn {
    from { opacity:0; }
    to   { opacity:1; }
}
`;

export const PageLoader = () => (
    <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#000000',
        zIndex: 9999,
        animation: 'loaderFadeIn 0.25s ease',
    }}>
        <style>{styles}</style>
        <img src={ringLoader} alt="Loading..." style={{ width: '100vw', height: '100vh', objectFit: 'cover' }} />
    </div>
);

/* ─── Small inline spinner for use inside cards/pages ─── */
const LoadingSpinner = ({ size }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        <img 
            src={ringLoader} 
            alt="Loading..." 
            style={{ 
                maxWidth: size ? `${size * 2}px` : '100%', 
                width: '100%', 
                height: size ? 'auto' : '100%',
                objectFit: 'cover',
                filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))'
            }} 
        />
    </div>
);

export default LoadingSpinner;
