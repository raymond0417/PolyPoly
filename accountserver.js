const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

const SAVE_INTERVAL = 60000; // 每分鐘保存一次
const SAVE_FILE = path.join(__dirname, 'gameState.json');

const clients = new Map();
let gameState = {
    teams: [
        { team: '第一小隊', cash: 0, virtualCurrency: 0 },
        { team: '第二小隊', cash: 0, virtualCurrency: 0 },
        { team: '第三小隊', cash: 0, virtualCurrency: 0 },
        { team: '第四小隊', cash: 0, virtualCurrency: 0 },
        { team: '第五小隊', cash: 0, virtualCurrency: 0 },
        { team: '第六小隊', cash: 0, virtualCurrency: 0 }
    ],
    virtualCurrencyValue: 0
};

// 加載保存的游戲狀態
function loadGameState() {
    try {
        if (fs.existsSync(SAVE_FILE)) {
            const data = fs.readFileSync(SAVE_FILE, 'utf8');
            gameState = JSON.parse(data);
            console.log('Game state loaded from file');
        }
    } catch (error) {
        console.error('Error loading game state:', error);
    }
}

// 保存游戲狀態
function saveGameState() {
    try {
        fs.writeFileSync(SAVE_FILE, JSON.stringify(gameState), 'utf8');
        console.log('Game state saved to file');
    } catch (error) {
        console.error('Error saving game state:', error);
    }
}

// 定期保存游戲狀態
setInterval(saveGameState, SAVE_INTERVAL);

// 在服務器啟動時加載游戲狀態
loadGameState();

wss.on('connection', (ws, request) => {
    const id = url.parse(request.url, true).query.id;
    clients.set(ws, id);

    ws.send(JSON.stringify({ action: 'initialData', payload: gameState }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.action === 'requestInitialData') {
                ws.send(JSON.stringify({ action: 'initialData', payload: gameState }));
            } else if (data.action === 'update') {
                const { team, type, amount } = data.payload;
                if (!team || !type || isNaN(amount)) {
                    throw new Error('Invalid update data');
                }
                const teamIndex = gameState.teams.findIndex(t => t.team === team);
                if (teamIndex !== -1) {
                    gameState.teams[teamIndex][type === '現金' ? 'cash' : 'virtualCurrency'] = parseFloat(amount);
                }
                broadcastUpdate(data);
                saveGameState(); // 在更新後保存游戲狀態
            } else if (data.action === 'updateVirtualCurrencyValue') {
                if (isNaN(data.payload)) {
                    throw new Error('Invalid virtual currency value');
                }
                gameState.virtualCurrencyValue = parseFloat(data.payload);
                broadcastUpdate({ action: 'updateVirtualCurrencyValue', payload: data.payload });
                saveGameState(); // 在更新後保存游戲狀態
            } else {
                throw new Error('Unknown action');
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({ action: 'error', message: error.message }));
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
    });
});

function broadcastUpdate(data) {
    for (let client of clients.keys()) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }
}

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// 在服務器關閉時保存游戲狀態
process.on('SIGINT', () => {
    saveGameState();
    process.exit();
});
