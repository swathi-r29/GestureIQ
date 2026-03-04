import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ChevronLeft,
    Image as ImageIcon,
    Video,
    FileText,
    Upload,
    Trash2,
    CheckCircle2,
    Play,
    Plus,
    X,
    Maximize2,
    Save
} from 'lucide-react';
import BorderPattern from '../../components/BorderPattern';

const TABS = { IMAGES: 'IMAGES', VIDEOS: 'VIDEOS', DESCRIPTION: 'DESCRIPTION' };

export default function MudraContentEditor() {
    const { mudraName } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(TABS.IMAGES);
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewVideo, setPreviewVideo] = useState(null);
    const fileInputRef = useRef(null);

    // Form state for description
    const [descForm, setDescForm] = useState({
        meaning: '',
        fingerPosition: '',
        usage: '',
        culturalSignificance: '',
        steps: ['', '', '']
    });

    useEffect(() => {
        fetchContent();
    }, [mudraName]);

    const fetchContent = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/admin/mudra/content/${mudraName}`, {
                headers: { 'x-auth-token': token }
            });
            setContent(res.data);
            setDescForm({
                meaning: res.data.description?.meaning || '',
                fingerPosition: res.data.description?.fingerPosition || '',
                usage: res.data.description?.usage || '',
                culturalSignificance: res.data.description?.culturalSignificance || '',
                steps: res.data.description?.steps?.length > 0 ? res.data.description.steps : ['', '', '']
            });
        } catch (err) {
            console.error('Failed to fetch mudra content', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('mudraName', mudraName);
        formData.append('isPrimary', 'false');
        formData.append(type === 'image' ? 'imageFile' : 'videoFile', file);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/admin/mudra/upload-${type}`, formData, {
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            await fetchContent();
        } catch (err) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (type, filename) => {
        if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/mudra/delete-${type}`, {
                headers: { 'x-auth-token': token },
                data: { mudraName, [type === 'image' ? 'imageName' : 'videoName']: filename }
            });
            await fetchContent();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handleSetPrimary = async (type, filename) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/admin/mudra/set-primary-${type}`,
                { mudraName, [type === 'image' ? 'imageName' : 'videoName']: filename },
                { headers: { 'x-auth-token': token } }
            );
            await fetchContent();
        } catch (err) {
            alert('Update failed');
        }
    };

    const handleSaveDescription = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/admin/mudra/update-description',
                { mudraName, ...descForm },
                { headers: { 'x-auth-token': token } }
            );
            alert('Mudra content updated successfully');
        } catch (err) {
            alert('Update failed');
        }
    };

    const addStep = () => setDescForm({ ...descForm, steps: [...descForm.steps, ''] });
    const removeStep = (index) => setDescForm({ ...descForm, steps: descForm.steps.filter((_, i) => i !== index) });
    const updateStep = (index, val) => {
        const newSteps = [...descForm.steps];
        newSteps[index] = val;
        setDescForm({ ...descForm, steps: newSteps });
    };

    if (loading) return <div className="p-12 text-center tracking-[10px] uppercase text-[10px] opacity-50">Opening Mudra Records...</div>;

    return (
        <div className="space-y-10 animate-fadeIn">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/admin/mudra-content')} className="flex items-center gap-2 text-xs tracking-widest uppercase hover:text-accent transition-colors opacity-50 hover:opacity-100">
                    <ChevronLeft size={16} /> Back to Repository
                </button>
                <div className="text-right">
                    <h1 className="text-4xl font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>{mudraName}</h1>
                    <div className="text-[9px] tracking-[6px] uppercase opacity-30 mt-1" style={{ color: 'var(--text-muted)' }}>Content Editor</div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-2 p-1 rounded-2xl border w-fit" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                {Object.values(TABS).map(tab => (
                    <button key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-3 rounded-xl text-[10px] tracking-[4px] uppercase font-bold transition-all flex items-center gap-3 ${activeTab === tab ? 'bg-accent text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                        {tab === TABS.IMAGES && <ImageIcon size={14} />}
                        {tab === TABS.VIDEOS && <Video size={14} />}
                        {tab === TABS.DESCRIPTION && <FileText size={14} />}
                        {tab}
                    </button>
                ))}
            </div>

            <div className="rounded-3xl border min-h-[500px] overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                {/* TAB 1: IMAGES */}
                {activeTab === TABS.IMAGES && (
                    <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Current Images */}
                        <div>
                            <h3 className="text-xs tracking-[4px] uppercase font-bold mb-8 flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                                <ImageIcon size={16} /> Current Image Gallery
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {content?.images?.map(img => (
                                    <div key={img} className="relative aspect-square rounded-2xl overflow-hidden border group" style={{ borderColor: 'var(--border)' }}>
                                        <img src={`http://localhost:5000/uploads/mudras/${mudraName}/images/${img}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            {content.primaryImage === img ? (
                                                <div className="px-3 py-1 bg-green-500 text-white text-[8px] tracking-[2px] uppercase font-bold rounded-lg border-2 border-white/20">Primary</div>
                                            ) : (
                                                <button onClick={() => handleSetPrimary('image', img)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"><CheckCircle2 size={16} /></button>
                                            )}
                                            <button onClick={() => handleDelete('image', img)} className="p-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-white transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                                {content?.images?.length === 0 && <div className="col-span-2 py-20 text-center opacity-20 italic">No images in gallery</div>}
                            </div>
                        </div>

                        {/* Upload Zone */}
                        <div className="flex flex-col">
                            <h3 className="text-xs tracking-[4px] uppercase font-bold mb-8 flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                                <Upload size={16} /> Upload New Imagery
                            </h3>
                            <div onClick={() => fileInputRef.current.click()}
                                className="flex-1 rounded-3xl border-4 border-dashed border-opacity-20 flex flex-col items-center justify-center p-12 transition-all cursor-pointer hover:border-accent hover:bg-accent/5"
                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6 border border-accent/20">
                                    <Upload className="text-accent" />
                                </div>
                                <p className="text-[10px] tracking-[4px] uppercase font-bold text-center">Drag and drop images here<br /><span className="opacity-40">Or click to browse files</span></p>
                                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />

                                {uploading && (
                                    <div className="mt-8 w-full max-w-xs">
                                        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-2 font-bold" style={{ color: 'var(--accent)' }}>
                                            <span>Processing...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-accent transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: VIDEOS */}
                {activeTab === TABS.VIDEOS && (
                    <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Video List */}
                        <div>
                            <h3 className="text-xs tracking-[4px] uppercase font-bold mb-8 flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                                <Video size={16} /> Tutorial & Demo Videos
                            </h3>
                            <div className="space-y-4">
                                {content?.videos?.map(vid => (
                                    <div key={vid} className="flex items-center justify-between p-4 rounded-2xl border group" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center">
                                                <Video size={18} className="text-white/20" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold tracking-tight truncate max-w-[150px]">{vid}</div>
                                                {content.primaryVideo === vid && <span className="text-[8px] uppercase tracking-widest text-accent font-bold">Primary</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPreviewVideo(vid)} className="p-2 hover:bg-black/5 rounded-lg opacity-40 hover:opacity-100 transition-all"><Maximize2 size={16} /></button>
                                            <button onClick={() => handleDelete('video', vid)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg opacity-40 hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                                {content?.videos?.length === 0 && <div className="py-20 text-center opacity-20 italic">No videos uploaded</div>}
                            </div>
                        </div>

                        {/* Upload Zone */}
                        <div className="flex flex-col">
                            <h3 className="text-xs tracking-[4px] uppercase font-bold mb-8 flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                                <Upload size={16} /> Add Lesson Video
                            </h3>
                            <div className="flex-1 rounded-3xl border-4 border-dashed border-opacity-20 flex flex-col items-center justify-center p-12 transition-all cursor-pointer hover:border-accent hover:bg-accent/5"
                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6 border border-accent/20">
                                    <Play className="text-accent" />
                                </div>
                                <p className="text-[10px] tracking-[4px] uppercase font-bold text-center">Drag and drop video here<br /><span className="opacity-40">MP4, WEBM allowed (Max 100MB)</span></p>
                                <input type="file" hidden accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: DESCRIPTION */}
                {activeTab === TABS.DESCRIPTION && (
                    <div className="p-10 max-w-4xl mx-auto space-y-12">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] tracking-[4px] uppercase font-bold mb-2 block" style={{ color: 'var(--text-muted)' }}>Core Meaning</label>
                                    <input type="text" value={descForm.meaning} onChange={e => setDescForm({ ...descForm, meaning: e.target.value })} className="w-full rounded-xl p-4 text-xs border focus:outline-none" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }} placeholder="e.g. Flag" />
                                </div>
                                <div>
                                    <label className="text-[9px] tracking-[4px] uppercase font-bold mb-2 block" style={{ color: 'var(--text-muted)' }}>Finger Position</label>
                                    <textarea rows={4} value={descForm.fingerPosition} onChange={e => setDescForm({ ...descForm, fingerPosition: e.target.value })} className="w-full rounded-xl p-4 text-xs border focus:outline-none resize-none" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }} placeholder="Describe the hand shape..." />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] tracking-[4px] uppercase font-bold mb-2 block" style={{ color: 'var(--text-muted)' }}>Historical significance</label>
                                    <textarea rows={8} value={descForm.culturalSignificance} onChange={e => setDescForm({ ...descForm, culturalSignificance: e.target.value })} className="w-full rounded-xl p-4 text-xs border focus:outline-none resize-none" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }} placeholder="Mythological or symbolic background..." />
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="text-[10px] tracking-[4px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Step-by-Step Instructions</h4>
                                <button onClick={addStep} className="p-2 bg-accent/10 text-accent rounded-lg border border-accent/20 hover:bg-accent hover:text-white transition-all"><Plus size={16} /></button>
                            </div>
                            <div className="space-y-3">
                                {descForm.steps.map((step, i) => (
                                    <div key={i} className="flex gap-4 items-center animate-fadeIn">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 opacity-40" style={{ borderColor: 'var(--border)' }}>{i + 1}</div>
                                        <input type="text" value={step} onChange={e => updateStep(i, e.target.value)} className="flex-1 rounded-xl p-4 text-xs border focus:outline-none" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }} />
                                        <button onClick={() => removeStep(i)} className="p-2 opacity-20 hover:opacity-100 text-red-500 transition-all"><X size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="pt-10 border-t flex justify-center" style={{ borderColor: 'var(--border)' }}>
                            <button onClick={handleSaveDescription} className="px-12 py-5 bg-accent text-white rounded-2xl font-bold text-xs tracking-[6px] uppercase flex items-center gap-4 hover:scale-[1.02] shadow-xl shadow-accent/20 transition-all">
                                <Save size={18} /> Seal Content
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Video Preview Modal */}
            {previewVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/90 backdrop-blur-sm animate-fadeIn">
                    <button onClick={() => setPreviewVideo(null)} className="absolute top-10 right-10 text-white/50 hover:text-white"><X size={32} /></button>
                    <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
                        <video src={`http://localhost:5000/uploads/mudras/${mudraName}/videos/${previewVideo}`} controls autoPlay className="w-full h-full" />
                    </div>
                </div>
            )}
        </div>
    );
}
