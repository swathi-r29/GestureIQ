import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Image as ImageIcon, Video, Edit3, Search, ChevronLeft, Layers, HandMetal, Plus, X } from 'lucide-react';
import BorderPattern from '../../components/BorderPattern';

const VIEW_MODES = {
    CATEGORIES: 'CATEGORIES',
    LIST: 'LIST'
};

export default function MudraContentList() {
    const [viewMode, setViewMode] = useState(VIEW_MODES.CATEGORIES);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [allMudras, setAllMudras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMudraName, setNewMudraName] = useState('');
    const [newMudraType, setNewMudraType] = useState('single');

    useEffect(() => {
        fetchMudraList();
    }, []);

    const fetchMudraList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/mudra/list', {
                headers: { 'x-auth-token': token }
            });
            setAllMudras(res.data);
        } catch (err) {
            console.error('Failed to fetch mudra list', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMudra = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/mudra/create', {
                mudraName: newMudraName,
                handType: newMudraType
            }, {
                headers: { 'x-auth-token': token }
            });
            setShowAddModal(false);
            setNewMudraName('');
            fetchMudraList();
        } catch (err) {
            console.error('Failed to create mudra', err);
            alert(err.response?.data?.msg || 'Failed to create mudra');
        }
    };

    const mudrasInCategory = allMudras.filter(m => {
        const type = selectedCategory === 'Single Hand' ? 'single' : 'double';
        return m.handType === type;
    });

    const filteredMudras = mudrasInCategory.filter(m => m.mudraName.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setViewMode(VIEW_MODES.LIST);
    };

    const handleBack = () => {
        setViewMode(VIEW_MODES.CATEGORIES);
        setSelectedCategory(null);
        setSearchTerm('');
    };

    const singleCount = allMudras.filter(m => m.handType === 'single').length;
    const doubleCount = allMudras.filter(m => m.handType === 'double').length;

    return (
        <div className="space-y-10 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Mudra Content</h1>
                    <p className="text-xs tracking-widest uppercase opacity-50" style={{ color: 'var(--text-muted)' }}>
                        {viewMode === VIEW_MODES.CATEGORIES ? 'Select Hand Category' : `Manage ${selectedCategory} Mudras`}
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {viewMode === VIEW_MODES.LIST && (
                        <button
                            onClick={handleBack}
                            className="p-3 rounded-xl border flex items-center gap-2 hover:bg-black/5 transition-all text-sm font-bold uppercase tracking-widest"
                            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                        >
                            <ChevronLeft size={16} /> Back
                        </button>
                    )}

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 text-white rounded-xl text-xs font-bold uppercase tracking-[3px] flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                        style={{ backgroundColor: 'var(--accent)' }}
                    >
                        <Plus size={16} /> Add Mudra
                    </button>

                    {viewMode === VIEW_MODES.LIST && (
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={16} />
                            <input
                                type="text"
                                placeholder="Search mudra..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl pl-12 pr-4 py-3 text-sm border focus:outline-none transition-all"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center tracking-[10px] uppercase text-[10px] opacity-50">Loading Repository...</div>
            ) : viewMode === VIEW_MODES.CATEGORIES ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
                    <div
                        onClick={() => handleCategorySelect('Single Hand')}
                        className="group p-12 rounded-3xl border-2 border-dashed cursor-pointer hover:border-accent hover:bg-accent/5 transition-all flex flex-col items-center text-center space-y-6"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
                    >
                        <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <HandMetal size={48} className="text-accent" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Single Hand</h2>
                            <p className="text-xs uppercase tracking-[3px] opacity-40 mt-2" style={{ color: 'var(--text-muted)' }}>Asamyuta Hastas</p>
                        </div>
                        <div className="px-6 py-2 rounded-full border text-[10px] font-bold tracking-[4px] uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                            {singleCount} Mudras Available
                        </div>
                    </div>

                    <div
                        onClick={() => handleCategorySelect('Double Hand')}
                        className="group p-12 rounded-3xl border-2 border-dashed cursor-pointer hover:border-accent hover:bg-accent/5 transition-all flex flex-col items-center text-center space-y-6"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
                    >
                        <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Layers size={48} className="text-accent" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Double Hand</h2>
                            <p className="text-xs uppercase tracking-[3px] opacity-40 mt-2" style={{ color: 'var(--text-muted)' }}>Samyuta Hastas</p>
                        </div>
                        <div className="px-6 py-2 rounded-full border text-[10px] font-bold tracking-[4px] uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                            {doubleCount > 0 ? `${doubleCount} Mudras Available` : 'Coming Soon'}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {filteredMudras.length === 0 ? (
                        <div className="p-20 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-xs uppercase tracking-[5px] opacity-30">No mudras found in this category</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredMudras.map((m) => {
                                const name = m.mudraName;
                                const hasImage = m.hasImage;
                                const imageCount = m.imageCount || 0;
                                const videoCount = m.videoCount || 0;

                                return (
                                    <div key={name} className="group p-6 rounded-2xl border transition-all hover:shadow-xl hover:scale-[1.02]"
                                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                                        <div className="w-full aspect-square rounded-xl mb-6 relative overflow-hidden flex items-center justify-center border shadow-inner"
                                            style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                                            {hasImage ? (
                                                <div className="w-full h-full relative overflow-hidden pointer-events-none">
                                                    {(() => {
                                                        const displayImage = m.primaryImage;
                                                        const imageUrl = `/uploads/mudras/${name}/images/${displayImage}`;
                                                        return (
                                                            <>
                                                                <div className="absolute inset-0 scale-110 blur-xl opacity-30 saturate-150"
                                                                    style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                                                <img src={imageUrl} alt={name} className="relative z-10 w-full h-full object-contain drop-shadow-md" />
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon className="mx-auto mb-2 opacity-10 group-hover:scale-110 transition-transform" size={40} />
                                                    <span className="text-[8px] tracking-[3px] uppercase opacity-30">No Image Uploaded</span>
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-black uppercase tracking-tighter mb-4" style={{ color: 'var(--text)' }}>{name}</h3>

                                        <div className="flex gap-2 mb-6">
                                            <div className="px-3 py-1 rounded-full border text-[9px] font-bold tracking-widest uppercase flex items-center gap-2"
                                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                                                <ImageIcon size={10} /> {imageCount}
                                            </div>
                                            <div className="px-3 py-1 rounded-full border text-[9px] font-bold tracking-widest uppercase flex items-center gap-2"
                                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                                                <Video size={10} /> {videoCount}
                                            </div>
                                        </div>

                                        <Link to={`/admin/mudra-content/${name}`}
                                            className="w-full py-3 text-white rounded-xl text-[10px] tracking-[4px] uppercase font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                                            style={{ backgroundColor: 'var(--accent)' }}
                                        >
                                            <Edit3 size={14} /> Edit Content
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Add Mudra Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-black/20 animate-fadeIn">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-6 right-6 hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text)' }}
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-8" style={{ color: '#F5E6C8' }}>Add New Mudra</h2>

                        <form onSubmit={handleCreateMudra} className="space-y-6">
                            <div>
                                <label className="text-[10px] uppercase tracking-[4px] font-bold block mb-2" style={{ color: '#F5E6C8' }}>Mudra Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newMudraName}
                                    onChange={(e) => setNewMudraName(e.target.value)}
                                    placeholder="Enter mudra name..."
                                    className="w-full p-4 rounded-xl border focus:outline-none focus:border-accent transition-all bg-transparent"
                                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] uppercase tracking-[4px] font-bold block mb-2" style={{ color: '#F5E6C8' }}>Hand Category</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setNewMudraType('single')}
                                        className={`p-4 rounded-xl border-2 transition-all font-bold text-[10px] uppercase tracking-widest ${newMudraType === 'single' ? 'bg-red-500/10' : 'border-dashed'}`}
                                        style={{
                                            borderColor: newMudraType === 'single' ? '#FF4D4D' : '#F5E6C8',
                                            color: newMudraType === 'single' ? '#FF4D4D' : '#F5E6C8',
                                            fontWeight: '900'
                                        }}
                                    >
                                        Single Hand
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewMudraType('double')}
                                        className={`p-4 rounded-xl border-2 transition-all font-bold text-[10px] uppercase tracking-widest ${newMudraType === 'double' ? 'bg-red-500/10' : 'border-dashed'}`}
                                        style={{
                                            borderColor: newMudraType === 'double' ? '#FF4D4D' : '#F5E6C8',
                                            color: newMudraType === 'double' ? '#FF4D4D' : '#F5E6C8',
                                            fontWeight: '900'
                                        }}
                                    >
                                        Double Hand
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 text-white rounded-xl text-xs font-bold uppercase tracking-[4px] hover:opacity-90 transition-all shadow-xl shadow-accent/20"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                Create Mudra
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
