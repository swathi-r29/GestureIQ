import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Image as ImageIcon, Video, Edit3, Search, Filter } from 'lucide-react';
import BorderPattern from '../../components/BorderPattern';

const MUDRA_LIST = [
    'pataka', 'tripataka', 'ardhapataka', 'kartarimukha', 'mayura', 'ardhachandra', 'arala', 'shukatunda',
    'mushti', 'shikhara', 'kapittha', 'katakamukha', 'suchi', 'chandrakala', 'padmakosha', 'sarpashira',
    'mrigashira', 'simhamukha', 'kangula', 'alapadma', 'chatura', 'bhramara', 'hamsasya', 'hamsapaksha',
    'sandamsha', 'mukula', 'tamrachuda', 'trishula'
];

export default function MudraContentList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [mudraData, setMudraData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllMudraStats();
    }, []);

    const fetchAllMudraStats = async () => {
        try {
            const token = localStorage.getItem('token');
            // We'll fetch all at once or individually. For 28, individual is okay, but let's assume we have a bulk endpoint or just map.
            // Since we don't have a bulk stats endpoint yet, let's just fetch them. 
            // Better: Let's fetch what's in the DB.
            const stats = {};
            for (const name of MUDRA_LIST) {
                const res = await axios.get(`/api/admin/mudra/content/${name}`, {
                    headers: { 'x-auth-token': token }
                });
                stats[name] = res.data;
            }
            setMudraData(stats);
        } catch (err) {
            console.error('Failed to fetch mudra stats', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredMudras = MUDRA_LIST.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) return <div className="p-12 text-center tracking-[10px] uppercase text-[10px] opacity-50">Loading Mudra Repository...</div>;

    return (
        <div className="space-y-10 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Mudra Content</h1>
                    <p className="text-xs tracking-widest uppercase opacity-50" style={{ color: 'var(--text-muted)' }}>Manage images, videos & descriptions</p>
                </div>

                <div className="relative w-full md:w-80 group">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredMudras.map((name) => {
                    const data = mudraData[name] || {};
                    const hasImage = !!data.primaryImage;
                    const imageCount = data.images?.length || 0;
                    const videoCount = data.videos?.length || 0;

                    return (
                        <div key={name} className="group p-6 rounded-2xl border transition-all hover:shadow-xl hover:scale-[1.02]"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                            {/* Preview Placeholder */}
                            <div className="w-full aspect-square rounded-xl mb-6 relative overflow-hidden flex items-center justify-center border-2 border-dashed"
                                style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                                {hasImage ? (
                                    <img src={`http://localhost:5000/uploads/mudras/${name}/images/${data.primaryImage}`}
                                        alt={name} className="w-full h-full object-cover" />
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
                                className="w-full py-3 bg-accent text-white rounded-xl text-[10px] tracking-[4px] uppercase font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                <Edit3 size={14} /> Edit Content
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
