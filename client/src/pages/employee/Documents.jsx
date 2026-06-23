import React, { useEffect, useState } from 'react';
import { FileText, Download, Eye, FolderOpen } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import logoPdf from '../../assets/logo-pdf.svg';

const DOC_TYPE_LABELS = {
    appointment_letter: 'Appointment Letter',
    experience_letter: 'Experience Letter',
    salary_revision: 'Salary Revision Letter',
    offer_letter: 'Offer Letter',
    payslip: 'Payslip',
    id_proof: 'ID Proof',
    certificate: 'Certificate',
    bgv: 'BGV Report',
    other: 'Other'
};

// Brand colors
const PURPLE = [124, 92, 252];      // #7C5CFC (Violet/Purple)
const PURPLE_DARK = [124, 92, 252]; // #7C5CFC (Matching background)

const loadSvgAsPngBase64 = (svgUrl, width, height) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = svgUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 4; // High resolution rendering scale
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => reject(err);
    });
};

const MyDocuments = () => {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewDoc, setViewDoc] = useState(null);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/documents/mine');
                setDocs(Array.isArray(data.data?.documents) ? data.data.documents : []);
            } catch { toast.error('Failed to load documents'); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    const handleDownload = async (doc) => {
        if (!doc.content) { toast.error('No content available'); return; }
        try {
            const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            // Load logo image dynamically
            let logoData = null;
            try {
                // Aspect ratio width: ~39.6mm, height: 12mm
                logoData = await loadSvgAsPngBase64(logoPdf, 150, 45);
            } catch (e) {
                console.error('Failed to load logo image:', e);
            }

            // Header band
            pdf.setFillColor(...PURPLE_DARK);
            pdf.rect(0, 0, pageW, 28, 'F');
            pdf.setFillColor(...PURPLE);
            pdf.rect(0, 28, pageW, 2.5, 'F');

            // Draw Logo or Fallback Text
            if (logoData) {
                pdf.addImage(logoData, 'PNG', 14, 5.5, 39.6, 12);
            } else {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(18);
                pdf.setTextColor(255, 255, 255);
                pdf.text('Learnlike', 14, 13);
            }
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(220, 210, 255);
            pdf.text('Attendance & Payroll Management System', 14, 22);

            // Document title (right)
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.setTextColor(255, 255, 255);
            pdf.text(doc.title.toUpperCase(), pageW - 14, 11, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(220, 210, 255);
            pdf.text(DOC_TYPE_LABELS[doc.type] || doc.type, pageW - 14, 17, { align: 'right' });
            pdf.text(`Date: ${new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - 14, 23, { align: 'right' });

            // Content area
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(30, 30, 30);
            const lines = pdf.splitTextToSize(doc.content || 'No content available.', pageW - 28);
            pdf.text(lines, 14, 42);

            // Footer
            pdf.setFillColor(...PURPLE_DARK);
            pdf.rect(0, pageH - 12, pageW, 12, 'F');
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(7.5);
            pdf.setTextColor(220, 210, 255);
            pdf.text('This is a system-generated document. | Learnlike AMS — Confidential', pageW / 2, pageH - 5, { align: 'center' });

            pdf.save(`${doc.title}.pdf`);
            toast.success('Downloaded as PDF!');
        } catch (err) {
            console.error('PDF download error:', err);
            toast.error('Failed to generate PDF');
        }
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>My Documents</h1>
                <p>Access your HR-issued letters and documents</p>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {Array(6).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 110 }} />)}
                </div>
            ) : docs.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><FolderOpen size={48} /></div><h3>No documents yet</h3><p>Your HR-issued documents will appear here</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {docs.map(doc => (
                        <div key={doc.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ width: 42, height: 42, background: '#EEF2FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FileText size={20} color="#4F46E5" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 2 }}>{DOC_TYPE_LABELS[doc.type] || doc.type}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(doc.createdAt).toLocaleDateString('en-IN')} · v{doc.version}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setViewDoc(doc)}>
                                    <Eye size={13} /> Preview
                                </button>
                                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleDownload(doc)}>
                                    <Download size={13} /> Download
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.title || 'Document'} size="lg">
                {viewDoc && (
                    <div>
                        <div style={{ padding: 20, background: 'var(--bg-light)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 440, overflowY: 'auto', border: '1px solid var(--border)' }}>
                            {viewDoc.content || 'No content available.'}
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setViewDoc(null)}>Close</button>
                            <button className="btn btn-primary" onClick={() => { handleDownload(viewDoc); setViewDoc(null); }}><Download size={14} /> Download</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MyDocuments;
