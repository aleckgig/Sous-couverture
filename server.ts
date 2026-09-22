import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface RoomPlayer {
  id: string;
  name: string;
  joinedAt: number;
  seatNumber?: number;
  roleId?: string;
  perceivedRoleId?: string;
  currentTeam?: 'Gang' | 'Forces de l\'ordre';
  isInformateur?: boolean;
  isPrisoner?: boolean;
  isAlive?: boolean;
  isReady?: boolean;
  deathReason?: string;
}

interface Room {
  code: string;
  storytellerName: string;
  targetPlayerCount: number;
  mode: 'phone' | 'physical';
  status: 'lobby' | 'playing' | 'ended';
  players: RoomPlayer[];
  gameState?: any;
  lastUpdated: number;
}

const rooms = new Map<string, Room>();

// Cleanup stale rooms older than 24 hours periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastUpdated > 24 * 60 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 60 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Ensure public/images directory exists
  const publicImagesDir = path.join(process.cwd(), 'public', 'images');
  if (!fs.existsSync(publicImagesDir)) {
    try {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create public/images dir:', e);
    }
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', roomsCount: rooms.size });
  });

  const rulesConfigFile = path.join(process.cwd(), 'public', 'rules_config.json');

  // Rules API: Read canon rules
  app.get('/api/rules', (req, res) => {
    try {
      if (fs.existsSync(rulesConfigFile)) {
        const data = fs.readFileSync(rulesConfigFile, 'utf-8');
        return res.json({ success: true, rules: JSON.parse(data) });
      }
      return res.json({ success: true, rules: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Rules API: Save canon rules
  app.post('/api/rules', (req, res) => {
    try {
      const { rules } = req.body;
      if (rules && typeof rules === 'object') {
        fs.writeFileSync(rulesConfigFile, JSON.stringify(rules, null, 2), 'utf-8');
        return res.json({ success: true, rules });
      }
      return res.status(400).json({ error: 'Format de règles invalide' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Images API: List available images
  app.get('/api/images/list', (req, res) => {
    try {
      const publicFiles = fs.existsSync(publicImagesDir) ? fs.readdirSync(publicImagesDir) : [];
      const assetsDir = path.join(process.cwd(), 'src', 'assets', 'images');
      const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
      const allFiles = Array.from(new Set([...publicFiles, ...assetFiles])).filter(
        (f) => !f.startsWith('.') && /\.(png|jpe?g|webp)$/i.test(f)
      );
      res.json({ success: true, images: allFiles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Images API: Upload images directly into public/images/
  app.post('/api/images/upload', (req, res) => {
    try {
      const { files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Aucun fichier fourni.' });
      }

      const savedFiles: string[] = [];

      for (const item of files) {
        const { filename, dataUrl } = item;
        if (!filename || !dataUrl) continue;

        // Clean filename and sanitize
        const safeName = path.basename(filename).replace(/[^a-zA-Z0-9_\- .]/g, '');
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const targetPath = path.join(publicImagesDir, safeName);

        fs.writeFileSync(targetPath, buffer);
        savedFiles.push(safeName);
      }

      res.json({ success: true, savedFiles, count: savedFiles.length });
    } catch (err: any) {
      console.error('Error saving image upload:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create or recover room
  app.post('/api/room/create', (req, res) => {
    const { storytellerName, targetPlayerCount, mode, customCode } = req.body;
    if (!storytellerName && !customCode) {
      return res.status(400).json({ error: 'Le nom du conteur ou un code de salle est requis.' });
    }

    let code = '';
    if (customCode && typeof customCode === 'string' && customCode.trim()) {
      code = customCode.trim().toUpperCase();
      // If room already exists, recover it
      const existing = rooms.get(code);
      if (existing) {
        if (storytellerName && String(storytellerName).trim()) {
          existing.storytellerName = String(storytellerName).trim();
        }
        existing.lastUpdated = Date.now();
        return res.json({ success: true, code: existing.code, room: existing, isExisting: true });
      }
    } else {
      // Generate readable 4-digit code (e.g., VILLAGE-4829)
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      code = `VILLAGE-${randomDigits}`;
    }

    const room: Room = {
      code,
      storytellerName: String(storytellerName || 'Conteur').trim(),
      targetPlayerCount: Number(targetPlayerCount) || 7,
      mode: mode === 'physical' ? 'physical' : 'phone',
      status: 'lobby',
      players: [],
      lastUpdated: Date.now(),
    };

    rooms.set(code, room);
    res.json({ success: true, code, room, isExisting: false });
  });

  // Get room info
  app.get('/api/room/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'Salle introuvable ou expirée.' });
    }
    res.json({
      code: room.code,
      storytellerName: room.storytellerName,
      targetPlayerCount: room.targetPlayerCount,
      mode: room.mode,
      status: room.status,
      playerCount: room.players.length,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        seatNumber: p.seatNumber,
        isAlive: p.isAlive,
        isPrisoner: Boolean(p.isPrisoner),
        isReady: Boolean(p.isReady),
      })),
      gameState: room.gameState
        ? {
            phase: room.gameState.phase,
            dayCount: room.gameState.dayCount,
            nightCount: room.gameState.nightCount,
            lastAnnouncement: room.gameState.lastAnnouncement,
            winner: room.gameState.winner,
          }
        : null,
    });
  });

  // Player joins room
  app.post('/api/room/:code/join', (req, res) => {
    const code = req.params.code.toUpperCase();
    const { name } = req.body;
    const room = rooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Salle introuvable ou code invalide.' });
    }

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ error: 'Veuillez saisir votre prénom ou pseudonyme.' });
    }

    if (room.status !== 'lobby') {
      // Check if player is re-joining with existing name
      const existingPlayer = room.players.find(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingPlayer) {
        return res.json({ success: true, playerId: existingPlayer.id, room });
      }
      return res.status(400).json({ error: 'La partie a déjà commencé dans cette salle.' });
    }

    // Check if name already taken
    const existingPlayer = room.players.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingPlayer) {
      return res.json({ success: true, playerId: existingPlayer.id, room });
    }

    if (room.players.length >= 20) {
      return res.status(400).json({ error: 'Le salon a atteint la capacité maximale (20 joueurs).' });
    }

    const playerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPlayer: RoomPlayer = {
      id: playerId,
      name: trimmedName,
      joinedAt: Date.now(),
      isAlive: true,
      isPrisoner: false,
    };

    room.players.push(newPlayer);
    room.lastUpdated = Date.now();

    res.json({ success: true, playerId, player: newPlayer, room });
  });

  // Storyteller updates room state / distributes roles
  app.post('/api/room/:code/sync', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'Salle introuvable.' });
    }

    const { status, players, gameState, targetPlayerCount } = req.body;

    if (status) room.status = status;
    if (Array.isArray(players)) {
      // Merge with existing players to ensure IDs and roles match seamlessly
      const mergedPlayers: RoomPlayer[] = players.map((p: any, idx: number) => {
        const existing = room.players.find(
          (ep) => ep.id === p.id || ep.name.toLowerCase() === String(p.name || '').toLowerCase()
        );
        return {
          id: p.id || (existing ? existing.id : `p-${idx + 1}-${Date.now()}`),
          name: String(p.name || (existing ? existing.name : `Joueur ${idx + 1}`)).trim(),
          joinedAt: existing ? existing.joinedAt : Date.now(),
          seatNumber: p.seatNumber || idx + 1,
          roleId: p.roleId !== undefined ? p.roleId : existing?.roleId,
          perceivedRoleId: p.perceivedRoleId !== undefined ? p.perceivedRoleId : existing?.perceivedRoleId,
          currentTeam: p.currentTeam !== undefined ? p.currentTeam : existing?.currentTeam || 'Gang',
          isInformateur: Boolean(p.isInformateur !== undefined ? p.isInformateur : existing?.isInformateur),
          isPrisoner: Boolean(p.isPrisoner !== undefined ? p.isPrisoner : existing?.isPrisoner),
          isAlive: p.isAlive !== false,
          isReady: p.isReady !== undefined ? Boolean(p.isReady) : Boolean(existing?.isReady),
          deathReason: p.deathReason,
        };
      });
      room.players = mergedPlayers;
    }
    if (gameState) room.gameState = gameState;
    if (targetPlayerCount) room.targetPlayerCount = targetPlayerCount;

    room.lastUpdated = Date.now();
    res.json({ success: true, room });
  });

  // Player sets their ready state
  app.post('/api/room/:code/player/:playerId/ready', (req, res) => {
    const code = req.params.code.toUpperCase();
    const playerId = req.params.playerId;
    const { isReady = true } = req.body;
    const room = rooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Salle introuvable.' });
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: 'Joueur introuvable dans cette salle.' });
    }

    player.isReady = Boolean(isReady);
    room.lastUpdated = Date.now();

    res.json({ success: true, isReady: player.isReady });
  });

  // Player gets their secret role and info
  app.get('/api/room/:code/player/:playerId', (req, res) => {
    const code = req.params.code.toUpperCase();
    const playerId = req.params.playerId;
    const qName = typeof req.query.name === 'string' ? req.query.name.trim().toLowerCase() : '';
    const room = rooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Salle introuvable.' });
    }

    let player = room.players.find((p) => p.id === playerId);
    if (!player && qName) {
      player = room.players.find((p) => p.name.toLowerCase() === qName);
    }

    if (!player) {
      return res.status(404).json({ error: 'Joueur introuvable dans cette salle.' });
    }

    // Find agent if player is eligible to know (Agent themselves or Informateur)
    const agentPlayer = room.players.find((p) => p.roleId === 'agent_sous_couverture');
    const revealsAgent = player.roleId === 'agent_sous_couverture' || Boolean(player.isInformateur);

    // Return player secret details and current room game phase
    res.json({
      roomCode: room.code,
      storytellerName: room.storytellerName,
      status: room.status,
      player: {
        id: player.id,
        name: player.name,
        seatNumber: player.seatNumber,
        roleId: player.roleId,
        perceivedRoleId: player.perceivedRoleId,
        currentTeam: player.currentTeam || 'Gang',
        isInformateur: Boolean(player.isInformateur),
        isPrisoner: Boolean(player.isPrisoner),
        isAlive: player.isAlive !== false,
        isReady: Boolean(player.isReady),
        agentSousCouvertureName: revealsAgent && agentPlayer ? agentPlayer.name : undefined,
      },
      allLivingPlayers: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        seatNumber: p.seatNumber,
        isAlive: p.isAlive !== false,
        isPrisoner: Boolean(p.isPrisoner),
      })),
      gameState: room.gameState || null,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
