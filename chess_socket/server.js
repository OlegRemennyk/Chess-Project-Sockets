const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let clients = [];
let team = 0;

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('Client connected');
    console.log('Total clients connected:', clients.length);

    ws.send(JSON.stringify({type: 'teamType', message: 'You are connected',currentTeam: team})   );
    team = (team+1)%2;

    ws.on('message', (message) => {
        // dont send the message back to the sender
        console.log(`Received: ${message}`);
        message_parsed = JSON.parse(message);
        clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN){
                console.log(`sending message ${message}`)
                client.send(JSON.stringify(message_parsed));
            }
        });
    });

    ws.on('close', () => {
        clients = clients.filter((client) => client !== ws);
        console.log('Client disconnected');
    });
});

console.log('WebSocket server started on port 8080');
