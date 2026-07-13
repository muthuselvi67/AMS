import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

const TimePicker = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Default to empty strings for display
    let h = '--';
    let m = '--';
    let ampm = '--';

    if (value) {
        // value is expected to be 'HH:mm' in 24h format, e.g. '14:30'
        const parts = value.split(':');
        if (parts.length === 2) {
            let hour24 = parseInt(parts[0], 10);
            const min = parts[1];
            
            if (!isNaN(hour24)) {
                ampm = hour24 >= 12 ? 'PM' : 'AM';
                let hour12 = hour24 % 12;
                if (hour12 === 0) hour12 = 12;
                
                h = hour12.toString().padStart(2, '0');
                m = min;
            }
        }
    }

    // Generate arrays for hours, minutes
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    const ampms = ['AM', 'PM'];

    const handleSelect = (type, val) => {
        let newH = h !== '--' ? h : '12';
        let newM = m !== '--' ? m : '00';
        let newAmpm = ampm !== '--' ? ampm : 'AM';

        if (type === 'hour') newH = val;
        if (type === 'minute') newM = val;
        if (type === 'ampm') newAmpm = val;

        // Convert back to 24h
        let hour24 = parseInt(newH, 10);
        if (newAmpm === 'PM' && hour24 !== 12) hour24 += 12;
        if (newAmpm === 'AM' && hour24 === 12) hour24 = 0;

        const val24 = `${hour24.toString().padStart(2, '0')}:${newM}`;
        onChange(val24);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (!value) {
            setInputValue('');
            return;
        }
        const parts = value.split(':');
        if (parts.length === 2) {
            let hour24 = parseInt(parts[0], 10);
            const min = parts[1];
            if (!isNaN(hour24)) {
                let ampm = hour24 >= 12 ? 'PM' : 'AM';
                let hour12 = hour24 % 12;
                if (hour12 === 0) hour12 = 12;
                setInputValue(`${hour12.toString().padStart(2, '0')} : ${min}   ${ampm}`);
            }
        }
    }, [value]);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        // Basic parsing to try to set the value if it's a valid complete time string
        // Match formats like 10:30, 10:30AM, 10:30 AM, 2:15pm
        const match = e.target.value.replace(/\s+/g, '').match(/^(1[0-2]|0?[1-9]):([0-5][0-9])(AM|PM|am|pm)?$/);
        if (match) {
            let hr = parseInt(match[1], 10);
            let mn = match[2];
            let am_pm = (match[3] || 'AM').toUpperCase();
            
            if (am_pm === 'PM' && hr !== 12) hr += 12;
            if (am_pm === 'AM' && hr === 12) hr = 0;
            
            onChange(`${hr.toString().padStart(2, '0')}:${mn}`);
        } else {
            // Also allow 24h format matching
            const match24 = e.target.value.replace(/\s+/g, '').match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
            if (match24) {
                onChange(`${match24[1].padStart(2, '0')}:${match24[2]}`);
            }
        }
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div 
                className="form-control" 
                style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    cursor: 'text', background: 'var(--bg-white)', padding: '10px 14px',
                    border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                    boxShadow: isOpen ? '0 0 0 3px rgba(155, 124, 253, 0.15)' : 'none',
                    transition: 'all 0.2s'
                }}
                onClick={() => setIsOpen(true)}
            >
                <input 
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="-- : --"
                    onFocus={() => setIsOpen(true)}
                    style={{ 
                        border: 'none', background: 'transparent', outline: 'none', 
                        width: '100%', fontSize: '14px', fontWeight: 500, 
                        color: 'var(--text-primary)', letterSpacing: '1px' 
                    }}
                />
                <Clock size={16} color="var(--text-primary)" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} />
            </div>

            {isOpen && (
                <div style={{ 
                    position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 100, 
                    background: 'var(--bg-white)', borderRadius: '12px', boxShadow: '0 12px 32px rgba(155, 124, 253, 0.15)', 
                    display: 'flex', border: '1px solid var(--border-light)', padding: '16px', gap: '16px' 
                }}>
                    {/* Triangle pointer */}
                    <div style={{ 
                        position: 'absolute', top: '-6px', left: '24px', width: '12px', height: '12px', 
                        background: 'var(--bg-white)', transform: 'rotate(45deg)', borderLeft: '1px solid var(--border-light)', 
                        borderTop: '1px solid var(--border-light)' 
                    }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', letterSpacing: '0.5px' }}>HOUR</div>
                        <div style={{ height: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', scrollbarWidth: 'none', paddingRight: '4px' }}>
                            {hours.map(hour => (
                                <div 
                                    key={hour} 
                                    onClick={() => handleSelect('hour', hour)}
                                    style={{ 
                                        padding: '8px 20px', cursor: 'pointer', borderRadius: '8px', textAlign: 'center', fontSize: '14px',
                                        background: h === hour ? 'var(--primary)' : 'transparent',
                                        color: h === hour ? 'white' : 'var(--text-primary)',
                                        fontWeight: h === hour ? 600 : 400,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {hour}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', letterSpacing: '0.5px' }}>MINUTE</div>
                        <div style={{ height: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', scrollbarWidth: 'none', paddingRight: '4px' }}>
                            {minutes.map(minute => (
                                <div 
                                    key={minute} 
                                    onClick={() => handleSelect('minute', minute)}
                                    style={{ 
                                        padding: '8px 20px', cursor: 'pointer', borderRadius: '8px', textAlign: 'center', fontSize: '14px',
                                        background: m === minute ? 'var(--primary)' : 'transparent',
                                        color: m === minute ? 'white' : 'var(--text-primary)',
                                        fontWeight: m === minute ? 600 : 400,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {minute}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', letterSpacing: '0.5px' }}>AM/PM</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                            {ampms.map(a => (
                                <div 
                                    key={a} 
                                    onClick={() => handleSelect('ampm', a)}
                                    style={{ 
                                        padding: '8px 20px', cursor: 'pointer', borderRadius: '8px', textAlign: 'center', fontSize: '14px',
                                        background: ampm === a ? 'var(--primary)' : 'transparent',
                                        color: ampm === a ? 'white' : 'var(--text-primary)',
                                        fontWeight: ampm === a ? 600 : 400,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {a}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimePicker;
