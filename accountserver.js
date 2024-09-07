const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

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

wss.on('connection', (ws, request) => {
    const id = url.parse(request.url, true).query.id;
    clients.set(ws, id);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.action === 'requestInitialData') {
            ws.send(JSON.stringify({ action: 'initialData', payload: gameState }));
        } else if (data.action === 'update') {
            const { team, type, amount } = data.payload;
            const teamIndex = gameState.teams.findIndex(t => t.team === team);
            if (teamIndex !== -1) {
                gameState.teams[teamIndex][type === '現金' ? 'cash' : 'virtualCurrency'] = parseFloat(amount);
            }
            broadcastUpdate(data);
        } else if (data.action === 'updateVirtualCurrencyValue') {
            gameState.virtualCurrencyValue = parseFloat(data.payload);
            broadcastUpdate({ action: 'updateVirtualCurrencyValue', payload: data.payload });
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