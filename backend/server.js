
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();

const allowedOrigins = [
    process.env.CLIENT_URL,
    // HTTP variants (legacy / localhost direct access)
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    // HTTPS variants — required now that Vite runs with basicSsl
    'https://localhost:5173',
    'https://localhost:5174',
    'https://127.0.0.1:5173',
    'https://127.0.0.1:5174',
    // Network IP — required for mobile access on same WiFi
    'http://10.161.112.28:5173',
    'https://10.161.112.28:5173',
    'http://10.161.112.28:5174',
    'https://10.161.112.28:5174',
];

app.use(cors({ 
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow server-to-server / curl

        // Exact match
        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Allow any localhost / 127.0.0.1 port (dev flexibility)
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        // Allow any local network IP (192.168.x.x or 10.x.x.x)
        if (/^https?:\/\/(192\.168\.|10\.)\d+\.\d+\.\d+(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    }, 
    credentials: true 
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/live', require('./routes/liveClass'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));

// Static files (for mudra images/videos)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
    }
};

connectDB();

mongoose.connection.on('connected', () => {
    console.log('✨ Mongoose default connection open');
});

mongoose.connection.on('error', err => {
    console.error('❌ MongoDB Runtime Error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB Disconnected. Checking connectivity...');
});

mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB Reconnected');
});

const PORT = process.env.PORT || 5000;
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
    cors: { 
        origin: '*',
        methods: ["GET", "POST"],
        credentials: false
    }
});

// Track socket to room/identity mapping for cleanup
const socketRegistry = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // ── Live Class Handshake ───────────────────────────────────
    socket.on('join_class', (data) => {
        const { classId, userId, name } = data;
        if (!classId) return;

        socket.join(classId);
        socketRegistry.set(socket.id, { classId, userId, name });

        console.log(`[Socket] User ${name} (${userId}) joined room ${classId}`);
        
        // Notify others in room
        socket.to(classId).emit('participant_joined', {
            id:     socket.id,
            userId: userId,
            name:   name
        });
    });

    socket.on('start_live_session', (classId) => {
        console.log(`[Socket] Class ${classId} starting LIVE`);
        
        // 1. Update classes_db.json (Sync for Dashboard)
        try {
            const dbPath = path.join(__dirname, 'classes_db.json');
            if (fs.existsSync(dbPath)) {
                let classes = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                let updated = false;
                classes = classes.map(c => {
                    if (c.classId === classId) {
                        updated = true;
                        return { ...c, status: 'live', isLive: true };
                    }
                    return c;
                });
                if (updated) {
                    fs.writeFileSync(dbPath, JSON.stringify(classes, null, 2));
                    console.log(`[Socket] classes_db.json updated for class ${classId}`);
                }
            }
        } catch (err) {
            console.error('[Socket] JSON DB update error:', err);
        }

        // 2. Global Broadcast to all students (even those not in the room)
        io.emit('class_started', { classId });
    });

    socket.on('set_target_mudra', (data) => {
        const { classId, target } = data;
        if (!classId) return;
        
        console.log(`[Socket] Room ${classId} target mudra -> ${target}`);
        io.to(classId).emit('target_changed', { target });
    });

    socket.on('modules_changed', (data) => {
        const { classId, modules } = data;
        socket.to(classId).emit('modules_changed', { modules });
    });

    socket.on('student_score_update', (data) => {
        io.to(data.classId).emit('score_update', data);
    });

    socket.on('class_ended', (classId) => {
        io.to(classId).emit('class_ended_broadcast');
    });

    // WebRTC Signaling
    socket.on('webrtc_offer', (data) => {
        if (data.to) {
            io.to(data.to).emit('teacher_broadcast_offer', {
                from:  socket.id,
                offer: data.offer
            });
        } else {
            socket.to(data.classId).emit('teacher_broadcast_offer', {
                from:  socket.id,
                offer: data.offer
            });
        }
    });

    socket.on('webrtc_answer', (data) => {
        io.to(data.to).emit('webrtc_answer_response', {
            from:   socket.id,
            answer: data.answer
        });
    });

    socket.on('webrtc_ice_candidate', (data) => {
        if (data.to) {
            io.to(data.to).emit('ice_candidate_received', {
                from:      socket.id,
                candidate: data.candidate
            });
        } else {
            socket.to(data.classId).emit('ice_candidate_received', {
                from:      socket.id,
                candidate: data.candidate
            });
        }
    });

    socket.on('disconnect', () => {
        const registry = socketRegistry.get(socket.id);
        if (registry) {
            console.log(`User ${registry.userId} left room ${registry.classId}`);
            socket.to(registry.classId).emit('participant_left', {
                id:     socket.id,
                userId: registry.userId
            });
            socketRegistry.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

//>>>>>>> Stashed changes
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));