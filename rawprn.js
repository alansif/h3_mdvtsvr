const fs = require('fs');
const path = require('path');
const filepath = 'C:/Users/Administrator/Desktop/huasan';

const net = require('net');
const port = 9100;
const host = '0.0.0.0';

const server = net.createServer();
server.listen(port, host, () => {
    console.log('TCP Server is running on port ' + port + '.');
});

let sockets = [];
let handler = null;

server.on('connection', function(sock) {
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
    sock.setEncoding('latin1');
    sockets.push({sock:sock,data:''});

    sock.on('data', function(data) {
        let sd = sockets.find(function(o) {
            return o.sock.remoteAddress === sock.remoteAddress && o.sock.remotePort === sock.remotePort;
        })
        if (sd !== undefined) {
            sd.data += data;
        }
    });

    sock.on('close', function(data) {
        let index = sockets.findIndex(function(o) {
            return o.sock.remoteAddress === sock.remoteAddress && o.sock.remotePort === sock.remotePort;
        })
        if (index !== -1) {
            const fid = "" + Date.now();
            const fn = path.join(filepath, 'SerialPlugin.dat' + fid);
            fs.writeFileSync(fn, sockets[index].data, 'latin1');
            sockets.splice(index, 1);
            if (handler) handler(fid, fn);
        }
        console.log(fid + ' CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
    });
});

exports.setHandler = (h) => { handler = h; }