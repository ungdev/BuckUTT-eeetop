const pcsclite = require('pcsclite');
const fs = require('fs');
const config = require('./config.json');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const pcsc = pcsclite();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, DELETE");
    next();
});

app.get('/device.html', function(req, res) {
    res.type('json');
    fs.readFile('/etc/hostname', 'utf8', function(err, contents) {
        contents = contents.replace("\n", "");
        res.end('{"device": "'+contents+'"}');
    });
});

http.listen(8006, function(){
    console.log('listening on *:8006');
});


io.on('connection', function(socket){
    console.log('Client connected');
});

pcsc.on('reader', function(reader) {
    console.log('New reader detected', reader.name);

    reader.on('error', function(err) {
        console.log('Error(', this.name, '):', err.message);
    });

    reader.on('status', function(status) {
        console.log('Status(', this.name, '):', status);

        var changes = this.state ^ status.state;
        if (changes) {
            if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
                reader.disconnect(reader.SCARD_LEAVE_CARD, function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Disconnected');
                    }
                });
            } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {
                reader.connect({ share_mode : this.SCARD_SHARE_SHARED }, function(err, protocol) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Protocol(', reader.name, '):', protocol);
                        reader.transmit(new Buffer(config.key), 40, protocol, function(err, data) {
                            if (err) {
                                console.log(err);
                            } else {
                                reader.transmit(new Buffer(config.etuId), 40, protocol, function(err, data) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        console.log('Data received', data.toString().replace(/\D+/g,''));
                                        io.emit('card', data.toString().replace(/\D+/g,''));
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    });

    reader.on('end', function() {
        console.log('Reader',  this.name, 'removed');
    });
});

pcsc.on('error', function(err) {
    console.log('PCSC error', err.message);
});
