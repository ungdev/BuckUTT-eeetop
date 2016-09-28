const pcsclite = require('pcsclite');
const fs = require('fs');
const config = require('./config.json');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const pcsc = pcsclite();
const async = require('async');
const crypto = require('crypto');

// 3DES vars for desfire
var RndA;
var RndB;

function decrypt(key, data, iv) {
    if(iv === undefined) {
        iv = new Buffer(8).fill(0);
    }
    var decipher = crypto.createDecipheriv('DES-EDE-CBC', key, iv);
    decipher.setAutoPadding(false);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

function encrypt(key, data, iv) {
    if(iv === undefined) {
        iv = new Buffer(8).fill(0);
    }
    var decipher = crypto.createCipheriv('DES-EDE-CBC', key, iv);
    decipher.setAutoPadding(false);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

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

                        // async.waterfall([
                            // Old mifare classic 1K
                            reader.transmit(new Buffer(config.etuId), 40, protocol, function(err, data) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    var code = data.toString().replace(/\D+/g,'');
                                    console.log('Data received', data);

                                    if(code.substr(0,8) == '22000000') {
                                        console.log('\n======== Code barre mifare classic trouvé : ' + code + ' ========\n');
                                        io.emit('card', data.toString().replace(/\D+/g,''));
                                    }
                                    else {
                                        console.log('\n======== Code barre mifare classic non trouvé : let\'s try desfire ! ========\n');

                                        async.waterfall([
                                            function(callback) {
                                                console.log('Select App ID');
                                                reader.transmit(Buffer.concat([new Buffer([0x5a]),new Buffer(config.desfire.appID)]), 40, protocol, function(err, data) {
                                                    if (err) {
                                                        return callback(err);
                                                    }
                                                    if(data[0] != 0x00) {
                                                        return callback('Code 0x'+ data[0].toString(16));
                                                    }
                                                    console.log('\tOK !')
                                                    callback();
                                                });
                                            },
                                            function(callback) {
                                                console.log('Authentication : Step 1/2');
                                                // Ask for authentication in DES with keyID =  config.desfire.keyId
                                                reader.transmit(new Buffer([0x1a, config.desfire.keyId]), 40, protocol, function(err, data) {
                                                    if (err) {
                                                        return callback(err);
                                                    }
                                                    if(data[0] != 0xaf) {
                                                        return callback('Code 0x'+ data[0].toString(16));
                                                    }
                                                    var ekRndB = data.slice(1);
                                                    var key = new Buffer(config.desfire.key, 'hex');
                                                    RndB = decrypt(key, ekRndB);
                                                    var RndBp = Buffer.concat([RndB.slice(1,8), RndB.slice(0,1)]);
                                                    RndA = crypto.randomBytes(8);
                                                    var msg = encrypt(key, Buffer.concat([RndA,RndBp]), ekRndB);
                                                    // --- DEBUG : Do not print that in production ---
                                                    // console.log('\tcrypt(RndB) =',ekRndB)
                                                    // console.log('\tkey =',key)
                                                    // console.log('\tRndB =',RndB)
                                                    // console.log('\tRndB\' =',RndBp)
                                                    // console.log('\tRndA =',RndA)
                                                    // console.log('\tRndA+RndB\' =',Buffer.concat([RndA,RndBp]))
                                                    // console.log('\tcrypt(RndA+RndB\') =',msg)

                                                    console.log('\tOK !')
                                                    callback(null, msg);
                                                });
                                            },
                                            function(msg, callback) {
                                                console.log('Authentication : Step 2/3');
                                                // Send crypt(RndA+RndB')
                                                var buf = Buffer.concat([new Buffer([0xAf]),msg]);
                                                reader.transmit(buf, 40, protocol, function(err, data) {
                                                    if (err) {
                                                        return callback(err);
                                                    }
                                                    if(data[0] != 0x00) {
                                                        return callback('Code 0x'+ data[0].toString(16));
                                                    }
                                                    console.log('\tOK !')

                                                    // Check if RndA=RndA2
                                                    console.log('Authentication : Step 3/3');
                                                    var ekRndAp = data.slice(1);
                                                    var key = new Buffer(config.desfire.key, 'hex');
                                                    var RndAp = decrypt(key, ekRndAp, msg.slice(8,16))
                                                    var RndA2 = Buffer.concat([RndAp.slice(7,8), RndAp.slice(0,7)]);
                                                    // SessionKey = Buffer.concat([RndA.slice(0,4), RndB.slice(0,4), RndA.slice(12,16), RndB.slice(12,16)]); // Useless for us currently

                                                    // --- DEBUG : Do not print that in production ---
                                                    // console.log('\tCrypt(RndA\') =',ekRndAp)
                                                    // console.log('\tRndA\' =',RndAp)
                                                    // console.log('\tRndA  =',RndA)
                                                    // console.log('\tRndA2 =',RndA2)
                                                    // console.log('\tSessionKey  =', SessionKey)
                                                    // console.log('Authentication done !')

                                                    // Check if RndA=RndA2
                                                    if(!RndA.equals(RndA2)) {
                                                        return callback('RndA != RndA2');
                                                    }
                                                    console.log('\tOK !')
                                                    callback();
                                                });
                                            },
                                            function(callback) {
                                                console.log('Read BuckUTT file');
                                                reader.transmit(new Buffer([0xbd, config.desfire.fileID, 0x00, 0x00, 0x00, 14, 0x00, 0x00]), 255, protocol, function(err, data) {
                                                    if (err) {
                                                        return callback(err);
                                                    }
                                                    if(data[0] != 0x00) {
                                                        return callback('Code 0x'+ data[0].toString(16));
                                                    }
                                                    console.log('\tOK !')
                                                    callback(null, data.slice(1,15).toString().replace(/\D+/g,''));
                                                });
                                            }
                                        ], function (err, code) {
                                            if(err) {
                                                console.log('Error:', err);
                                            }
                                            if(code && code.substr(0,8) == '22000000') {
                                                console.log('\n======== Code barre desfire trouvé : ' + code + ' ========\n');
                                                io.emit('card', code);
                                            }
                                            else {
                                                console.log('\n======== Code barre desfire non trouvé : ', code,' ========\n');
                                            }
                                        });
                                    }
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
