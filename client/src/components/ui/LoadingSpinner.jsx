import React from 'react';

const styles = `
@keyframes loaderFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}
.ios-spinner {
    color: #8c8c8c;
    display: inline-block;
    position: relative;
}
.ios-spinner div {
    transform-origin: 50% 50%;
    animation: ios-spinner 1.2s linear infinite;
}
.ios-spinner div:after {
    content: " ";
    display: block;
    position: absolute;
    top: 0%;
    left: 45.5%;
    width: 9%;
    height: 25%;
    border-radius: 20%;
    background: currentColor;
}
.ios-spinner div:nth-child(1) { transform: rotate(0deg); animation-delay: -1.1s; }
.ios-spinner div:nth-child(2) { transform: rotate(30deg); animation-delay: -1s; }
.ios-spinner div:nth-child(3) { transform: rotate(60deg); animation-delay: -0.9s; }
.ios-spinner div:nth-child(4) { transform: rotate(90deg); animation-delay: -0.8s; }
.ios-spinner div:nth-child(5) { transform: rotate(120deg); animation-delay: -0.7s; }
.ios-spinner div:nth-child(6) { transform: rotate(150deg); animation-delay: -0.6s; }
.ios-spinner div:nth-child(7) { transform: rotate(180deg); animation-delay: -0.5s; }
.ios-spinner div:nth-child(8) { transform: rotate(210deg); animation-delay: -0.4s; }
.ios-spinner div:nth-child(9) { transform: rotate(240deg); animation-delay: -0.3s; }
.ios-spinner div:nth-child(10) { transform: rotate(270deg); animation-delay: -0.2s; }
.ios-spinner div:nth-child(11) { transform: rotate(300deg); animation-delay: -0.1s; }
.ios-spinner div:nth-child(12) { transform: rotate(330deg); animation-delay: 0s; }
@keyframes ios-spinner {
    0% { opacity: 1; }
    100% { opacity: 0.15; }
}
`;

export const PageLoader = () => (
    <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999,
        animation: 'loaderFadeIn 0.25s ease',
    }}>
        <style>{styles}</style>
        <div className="ios-spinner" style={{ width: 48, height: 48 }}>
            {Array.from({ length: 12 }).map((_, i) => <div key={i} style={{ position: 'absolute', width: '100%', height: '100%' }} />)}
        </div>
    </div>
);

const LoadingSpinner = ({ size = 24 }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        <style>{styles}</style>
        <div className="ios-spinner" style={{ width: size, height: size }}>
            {Array.from({ length: 12 }).map((_, i) => <div key={i} style={{ position: 'absolute', width: '100%', height: '100%' }} />)}
        </div>
    </div>
);

export default LoadingSpinner;
