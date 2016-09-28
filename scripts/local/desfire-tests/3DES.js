const pcsclite = require('pcsclite');
const async = require('async');
const pcsc = pcsclite();
const crypto = require('crypto');

var RndA;
var RndB;
var SessionKey;
var authKey = '';
var fileID = 0x02;
var appID = new Buffer([0x40, 0x84, 0xf5])



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

                        async.waterfall([
                            function(callback) {
                                console.log('\n List App');
                                reader.transmit(new Buffer([0x6a]), 40, protocol, function(err, data) {
                                    if (err) {
                                        console.log('\tError:', err);
                                    } else {
                                        console.log('\tData received', data);
                                    }
                                    callback();
                                });
                            },
                            function(callback) {
                                console.log('\nSelect App');
                                reader.transmit(Buffer.concat([new Buffer([0x5a]),appID]), 40, protocol, function(err, data) {
                                    if (err) {
                                        console.log('\tError:', err);
                                    } else {
                                        console.log('\tData received', data);
                                    }
                                    callback();
                                });
                            },
                            function(callback) {
                                console.log('\nList files');
                                reader.transmit(new Buffer([0x6F]), 40, protocol, function(err, data) {                                    if (err) {
                                        console.log('\tError:', err);
                                    } else {
                                        console.log('\tData received', data);
                                    }
                                    callback();
                                });
                            },
                            function(callback) {
                                console.log('\nGet Key settings');
                                reader.transmit(new Buffer([0x45]), 40, protocol, function(err, data) {
                                    if (err) {
                                        console.log('\tError:', err);
                                    } else {
                                        console.log('\tData received', data);
                                    }
                                    callback();
                                });
                            },
                            function(callback) {
                                console.log('\nStart auth');
                                reader.transmit(new Buffer([0x1a, 0x04]), 40, protocol, function(err, data) {
                                    if (err) {
                                        console.log('\tError:', err);
                                    } else {
                                        console.log('\tData received', data);
                                    }
                                    var ekRndB = data.slice(1);
                                    var key = new Buffer(authKey, 'hex');
                                    RndB = decrypt(key, ekRndB);
                                    var RndBp = Buffer.concat([RndB.slice(1,8), RndB.slice(0,1)]);
                                    RndA = crypto.randomBytes(8);
                                    var msg = encrypt(key, Buffer.concat([RndA,RndBp]), ekRndB);
                                    console.log('\tcrypt(RndB) =',ekRndB)
                                    console.log('\tkey =',key)
                                    console.log('\tRndB =',RndB)
                                    console.log('\tRndB\' =',RndBp)
                                    console.log('\tRndA =',RndA)
                                    console.log('\tRndA+RndB\' =',Buffer.concat([RndA,RndBp]))
                                    console.log('\tcrypt(RndA+RndB\') =',msg)

                                    callback(null, msg);
                                });
                            },
                            function(msg, callback) {
                                console.log('\nSend crypt(RndA+RndB\')');
                                var buf = Buffer.concat([new Buffer([0xAf]),msg]);
                                reader.transmit(buf, 40, protocol, function(err, data) {
                                    if (err) {
                                        console.log('\tError:', err);
                                    } else {
                                        console.log('\tData received', data);
                                    }
                                    var ekRndAp = data.slice(1);
                                    var key = new Buffer(authKey, 'hex');
                                    var RndAp = decrypt(key, ekRndAp, msg.slice(8,16))
                                    var RndA2 = Buffer.concat([RndAp.slice(7,8), RndAp.slice(0,7)]);
                                    SessionKey = Buffer.concat([RndA.slice(0,4), RndB.slice(0,4), RndA.slice(12,16), RndB.slice(12,16)]);
                                    console.log('\tCrypt(RndA\') =',ekRndAp)
                                    console.log('\tRndA\' =',RndAp)
                                    console.log('\tRndA  =',RndA)
                                    console.log('\tRndA2 =',RndA2)
                                    console.log('\tSessionKey  =', SessionKey)
                                    console.log('Authentication done !')

                                    callback();
                                });
                            },
                            function(callback) {
                                console.log('\nRead file');
                                reader.transmit(new Buffer([0xbd, fileID, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), 255, protocol, function(err, data) {
                                    if (err) {
                                        console.log('\tError:', err);
                                    } else {
                                        console.log('\tData received', data);
                                    }


                                    callback();
                                });
                            },
                            // function(callback) {
                            //     console.log('\nWrite file');
                            //     reader.transmit(new Buffer([0x3d, fileID, 0x20, 0x00, 0x00, 0x01, 0x00, 0x00, 0x01]), 255, protocol, function(err, data) {
                            //         if (err) {
                            //             console.log('\tError:', err);
                            //         } else {
                            //             console.log('\tData received', data);
                            //         }
                            //
                            //         callback();
                            //     });
                            // }

                        ], function (err, result) {
                            if(err) return console.log(err);
                            console.log('Done !');
                        });
/*
                                if (err) {
                                    console.log('-------Error:', err);
                                } else {
                                    console.log('Data received', data);
                                }

                                    if (err) {
                                        console.log('-------Error:', err);
                                    } else {
                                        console.log('Data received', data);
                                    }

                                        if (err) {
                                            console.log('-------Error:', err);
                                        } else {
                                            console.log('Data received', data);
                                        }


                                            if (err) {
                                                console.log('-------Error:', err);
                                            } else {
                                                console.log('Data received', data);
                                            }
                                        });
                                    });

                                    // Select file 02
                                    // reader.transmit(new Buffer([0xBd, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), 40, protocol, function(err, data) {
                                    //     if (err) {
                                    //         console.log('-------Error:', err);
                                    //     } else {
                                    //         console.log('Data received', data);
                                    //     }
                                    // });
                                });
                            });
                        });*/
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
