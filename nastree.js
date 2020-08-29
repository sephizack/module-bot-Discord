const Discord = require('discord.js')
const config = require('config');
const request = require('request');
var storage = require('node-persist');
var PlexAPI = require("plex-api");

var TreeConfig = function () {};

var sessionId;
var nasConfig;
var plexConfig;
var nasBaseUrl;
var stored_downloads_done;
var downloads_done;
var plexclient;
var sephizack;

// Probably should use readline
// https://nodejs.org/api/readline.html
var BACKSPACE = String.fromCharCode(127);
function requestPasswordConsole(prompt, callback) {
    if (prompt) {
      process.stdout.write(prompt);
    }

    var stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    var password = '';
    stdin.on('data', function (ch) {
        ch = ch.toString('utf8');

        switch (ch) {
        case "\n":
        case "\r":
        case "\u0004":
            // They've finished typing their password
            process.stdout.write('\n');
            stdin.setRawMode(false);
            stdin.pause();
            callback(false, password);
            break;
        case "\u0003":
            // Ctrl-C
            callback(true);
            break;
        case BACKSPACE:
            password = password.slice(0, password.length - 1);
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(prompt);
            break;
        default:
            // More passsword characters
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(prompt);
            password += ch;
            break;
        }
    });
}

var nbRetryLogin = 0;
function nasRequest(path, params, successCallback, failString, callbackKo) {
    if (sessionId !== "") params._sid = sessionId;
    console.log("Calling "+nasBaseUrl+'/webapi/'+path, '...')
    request({url:nasBaseUrl+'/webapi/'+path, qs:params}, function (error, response, body) {
        if (error) {
            if(callbackKo) callbackKo();
            console.log('Error. '+failString, error);
            return;
        }
        if(!response || response.statusCode != 200) {
            if(callbackKo) callbackKo();
            console.log('Error. '+failString+'. response = ', response);
            if (response.statusCode == 106 || response.statusCode == 107) {
                if (nbRetryLogin < 10) {
                    nbRetryLogin++;
                    setTimeout(function() {
                        console.log('Trying to login again');
                        refreshSessionId();
                    }, 1000);
                } else {
                    console.log('Too many login retries were done, abort.')
                }
            }
            return;
        }
        var jsonResponse = JSON.parse(body);
        if (jsonResponse.success) {
            nbRetryLogin = 0;
            successCallback(jsonResponse);
        } else {
            console.log('Error. '+failString+'. Nas response = ', jsonResponse);
            if(callbackKo) callbackKo(nasBaseUrl+'/webapi/'+path, jsonResponse);
            refreshSessionId(function(){
                console.log("Connection with NAS re-established");
            })
        }
    })
}

var dowloadUrlFilterOk = ['uptobox.com'];
var plexSectionsIds = {}
var triggerPlexRefresh = ['Films', 'Films 4K'];
var destinationToSection = {
    'Main/Films': 'Films', 
    'Main/Films 4K': 'Films 4K', 
}
var notifDownloads = [
    {name:'Dragon Ball Super'},
    {name:'One Piece', match: '_One_Piece_', replace: '[Kaerizaki-Fansub]_One_Piece_', splitchar: '_', plexTitle: 'One Piece'},
    {name:'Boku No Hero'},
    {name:'Shokugeki no Soma'},
    {name:'Super Dragon Ball Heroes'},
];

var lastestTasksList = [];
var startedUrls = []
function checkDownloads(channels) {
        if (sessionId == "") {
        console.log("Missing session id, cannot check downloads");
        return;
    }
    nasRequest('DownloadStation/task.cgi', {
        api: 'SYNO.DownloadStation.Task', version: 3, method: 'list', additional: 'detail,transfer'
    }, function(response) {
        console.log('Got ' + response.data.total + ' downloads');
        lastestTasksList = response.data.tasks;
        for (var i in response.data.tasks) {
            var task = response.data.tasks[i];
            if (isStatusFinished(task.status) && !downloads_done.has(task.id)) {
                console.log('Le téléchargement de '+ task.title + ' est terminé !');
                sephizack.send('Le téléchargement de '+ task.title + ' est terminé !');
                
                // Check if actual notif is required
                var hasNotif = false;
                for (var j in notifDownloads) {
                    if (!notifDownloads[j].match) notifDownloads[j].match = notifDownloads[j].name;
                    if (!notifDownloads[j].plexTitle) notifDownloads[j].plexTitle = notifDownloads[j].name;
                    if (task.title.indexOf(notifDownloads[j].match) >= 0) {
                        var episodeNumber = 0;
                        if (notifDownloads[j].replace && notifDownloads[j].splitchar) {
                            try {
                                var title = task.title.replace(notifDownloads[j].replace, '');
                                episodeNumber = parseInt(title.split(notifDownloads[j].splitchar)[0]);
                            } catch(e) {
                                console.log('Cannot get episode name ...', e)
                            }
                        }
                        var notif = (episodeNumber > 0 ? 'L\'épisode '+episodeNumber : 'Un nouvel épisode') +' de '+notifDownloads[j].name+' est disponible !';
                        if (episodeNumber == 0) notif += '\nFichier: '+task.title
                        
                        console.log("notifDownloads[j].plexTitle = " + notifDownloads[j].plexTitle)
                        console.log("plexSectionsIds[notifDownloads[j].plexTitle] = " + plexSectionsIds[notifDownloads[j].plexTitle])
                        console.log("plexSectionsIds = " + JSON.stringify(plexSectionsIds))
                        if (notifDownloads[j].plexTitle && plexSectionsIds[notifDownloads[j].plexTitle]) {
                            plexRefresh(plexSectionsIds[notifDownloads[j].plexTitle]);
                            notif += "\nUne demande de rafraichissement a été envoyé à Plex pour la section '"+notifDownloads[j].plexTitle+"'"
                        } else {
                            notif += "\nAucune section correspondante n'a été trouvée sur Plex :(."
                        }
                        console.log(notif);
                        channels['notifs-mangas'].send(notif);
                        hasNotif = true;
                    }
                }

                if (!hasNotif && startedUrls.indexOf(task.additional.detail.uri) !== -1) {
                    // We notif for URLs resquested via discord
                    var notif = 'Le téléchargement de ' + task.title + ' ('+task.additional.detail.uri+') est terminé.';
                    var plexSection = 'Films';
                    if (task.additional.detail.destination.indexOf('Films 4K') !== -1) {
                        plexSection = 'Films 4K';
                    }
                    var plexSectionId = plexSectionsIds[plexSection];
                    if (plexSectionId) {
                        plexRefresh(plexSectionId);
                        notif += '\nLe film est disponible sur Plex dans la section \''+plexSection+'\'';
                    }
                    console.log(notif);
                    channels['general'].send(notif);
                    if(task.title.indexOf('2160p') !== -1 && plexSection == 'Films') {
                        channels['general'].send('Vous avez téléchargé un film en 4K sans me prévenir :rage: Maintenant il est mal rangé et je ne suis pas assez bien codée pour le déplacer moi-même !');
                    }
                    hasNotif = true;
                }

                var plexSectionForDest = destinationToSection[task.additional.detail.destination];
                if (!hasNotif && plexSectionForDest && triggerPlexRefresh.indexOf(plexSectionForDest) !== -1) {
                    var plexSectionId = plexSectionsIds[plexSectionForDest];
                    if (plexSectionId) {
                        plexRefresh(plexSectionId);
                        sephizack.send('J\'ai lancé un refresh de la section ' + plexSectionForDest);
                    }
                }
                
                downloads_done.add(task.id);
                storage.setItem('downloads_done', Array.from(downloads_done));
            }
        }
    }, 'Unable to retrieve list of downloads');
}

function isStatusFinished(status) {
    return status == 'finished' || status == 'seeding';
}

function refreshSessionId(callback) {
    nasRequest('auth.cgi', {
        api: 'SYNO.API.Auth', version: 2, method: 'login',
        account: nasConfig.username, passwd: nasConfig.password,
        session: 'DownloadStation', format: 'cookie'
    }, function(response) {
        sessionId = response.data.sid;
        console.log("Connected to NAS as " + nasConfig.username);
        if (callback) callback();
    }, 'Unable to open session', function(url, jsonResponse) {
        if (jsonResponse.error && jsonResponse.error.code == 400) {
            console.log('Wrong NAS credentials, abort to avoid being blocked!')
            process.exit(0)
        }
    });
}

function startDownload(url, destination, callbackOk, callbackKo) {
    nasRequest('DownloadStation/task.cgi', {
        api: 'SYNO.DownloadStation.Task', version: 3, method: 'create', 
        type: 'http', uri: url, destination: destination
    }, function(response) {
        if (response.success) callbackOk(url);
        else if (callbackKo) callbackKo(url);
    }, 'Impossible de télécharger', callbackKo);
}

function initPlex() {
    plexclient = new PlexAPI({
        hostname: plexConfig.ip,
        port: plexConfig.port,
        username: plexConfig.username,
        password: plexConfig.password,
        options: {
            identifier: "6BC476D9-AB71-48B4-B5C1-90D2458E5396",
            product: "NAS Bot",
            deviceName: "NAS Bot",
            version: '1.0'
        }
    });
    plexclient.query("/library/sections").then(function (result) {
        console.log('Connected to Plex, extracting IDs of sections ...');
        for (var k in result.MediaContainer.Directory) {
            var section = result.MediaContainer.Directory[k];
            console.log("Plex Section '" + section.title + "' found with id "+section.key)
            plexSectionsIds[section.title] = section.key;
        }
    }, function (err) {
        console.log("Failed to connect to plex server...", err);
    });
}

function plexRefresh(sectionId) {
    plexclient.perform("/library/sections/"+sectionId+"/refresh").then(function () {
        console.log("Plex successfully started refresh of section "+sectionId)
    }, function (err) {
        console.error("Could not connect to server", err);
    });
}

var TRIG_oui = [['oui'], ['ouai'], ['ouais'], ['ui'], ['yep'], ['yes'], ['ofc'], ['bien', 'sur']];
var TRIG_non = [['non'], ['no'], ['nope']];
var denis = new Discord.RichEmbed({file: './images/denisAH.jpg'});
TreeConfig.prototype.decisionTree = [{
    triggers:[['<@405307509646032907>'], ['<@!405307509646032907>']], replyData: [
                     "Hey, voici la liste de mes fonctionalités: "
                    +"\n  - 'status' : Liste les téléchargements"
                    +"\n  - 'dl film' + URL : Ajoute un téléchargement qui sera placé dans 'Films' sur Plex"
                    +"\n  - 'dl film 4K' + URL : Ajoute un téléchargement qui sera placé dans 'Films 4K' sur Plex"
                ],
    next: [{
        triggers:[['salut'],['hello'],['yo']], replyData: ["Salut ! Ca va ?", "Hey, comment va ?", "Salut ça va ?"],
        next: [{
            onlyAsReply:true, triggers:TRIG_non.concat([['bof'], ['pas', 'trop'], ['pas', 'des', 'masses']]), replyData: ["AH"], replyOptions:{embed:denis}
        }, {
            onlyAsReply:true, triggers:[['oui', 'et', 'toi'], ['ca', 'va', '?']], replyData: ["ca roule tranquille", "ouais pas trop mal", "bien bien"]
        }]
    },{
        triggers:[['telecharge', 'film'], ['dl', 'film'], ['telecharger', 'film'], ['télécharger', 'film'], ['télécharge', 'film']], 
        replyData: ["Ok je vais essayer :grinning: ", 'Laissez moi voir ce que je peux faire'], replyAction : function(message) {
            var parts = message.content.split(' ');
            var urls = [];
            var messageSent = false;
            for (var k in parts) {
                if (parts[k].indexOf('http') == 0) {
                    var isok = false;
                    for (var l in dowloadUrlFilterOk) {
                        console.log(dowloadUrlFilterOk[l]);
                        if (parts[k].indexOf(dowloadUrlFilterOk[l]) >= 0) {
                            isok = true;
                            break;
                        }
                    }
                    if (!isok) {
                        messageSent = true;
                        message.reply('Je ne suis pas autorisée à télécharger l\'url ' + parts[k]);
                    } else urls.push(parts[k]);
                }
            }

            if (urls.length == 0) {
                if (!messageSent) message.reply('Je ne trouve pas d\'URL à télécharger dans votre message');
                return;
            }

            var destination = 'Main/Films';
            if (message.content.toLowerCase().indexOf('4k') !== -1) {
                destination = 'Main/Films 4K';
            }

            for (var k in urls) {
                startDownload(urls[k], destination, function(url) {
                    console.log('Download started');
                    message.reply('Le téléchargement de ' + url + ' est démarré (destination : \''+ destination + '\')');
                    if(message.channel.type !== 'dm') startedUrls.push(url);
                }, function(url) {
                    message.reply('J\'ai demandé le téléchargement de ' + url + ' mais il y a eu un problème :frowning2: ');
                })
            }
        }
    },{
        triggers:[['list'], ['status'], ['liste'], ['telechargents', 'en cours']], 
        replyAction : function(message) {
            if (!lastestTasksList) {
                message.reply('Je n\'ai pas encore récupéré la liste des téléchargement.');
                return;
            }
            var rep = '';
            console.log('List of downloads requested.')
            for (var i in lastestTasksList) {
                if (isStatusFinished(lastestTasksList[i].status)) rep += '[Terminé] ' + lastestTasksList[i].title + '\n';
                else if (lastestTasksList[i].status == 'downloading') {
                    var progress = lastestTasksList[i].additional.transfer.size_downloaded / lastestTasksList[i].size;
                    var speed = lastestTasksList[i].additional.transfer.speed_download / 1024 / 1024;
                    progress = Math.floor(progress * 10000) / 100;
                    speed = Math.floor(speed * 100) / 100;
                    rep += '['+progress+'% | '+speed+' Mo/s] ' + lastestTasksList[i].title + '\n';
                } else rep += '['+lastestTasksList[i].status+'] ' + lastestTasksList[i].title + '\n';
            }
            if (lastestTasksList.length == 0) rep = 'Aucun téléchargement dans la liste';
            message.reply(rep);
        }
    }]
}];
TreeConfig.prototype.thanksTree = {
    triggers:[['merci'], ['nickel'], ['ty'], ['thanks'], ['aimable']], 
    replyData: [':kissing_heart:', 'Au plaisir :wink:', 'hehe :smiley:'], stopDiscussionOnMatch:true
};
TreeConfig.prototype.requestedChannels = function() {
    return ['general', 'notifs-mangas']
};

function realStart(iDiscordClient, channels, nbReqChannels) {
    console.log('Starting ...');
    if (iDiscordClient !== null) {
        iDiscordClient.fetchUser('146878424680497152').then(function(user) {
            sephizack = user
        });
    }
    if (channels.length < nbReqChannels) {
        console.log("Some discord channels are missing");
    }

    console.log("Trying to establish connection with Synology NAS ...")
    sessionId = "";
    nasBaseUrl = 'http://'+nasConfig.ip+':'+nasConfig.port;

    storage.initSync();
    stored_downloads_done = storage.getItemSync('downloads_done');
    downloads_done;
    if (!stored_downloads_done || !Array.isArray(stored_downloads_done)) downloads_done = new Set();
    else downloads_done = new Set(stored_downloads_done);
    console.log("List of download aldreay finished and notified:", downloads_done);
    refreshSessionId(function() {
        initPlex();
        checkDownloads(channels);
        setInterval(function() {
            checkDownloads(channels);
        }, 1000*60*3);
    });
};

function getPassword(configVar, passwordType, callback) {
    if (!configVar.password) {
        requestPasswordConsole('Please provide '+passwordType+' password for '+configVar.username+" : ", function(cancelled, password) {
            if (cancelled) {
                console.log("Cannot proceed without password ...")
                process.exit(0)
            } else {
                configVar.password = password;
            }
            callback();
        });
    } else {
        console.log(passwordType + ' password provided in config file');
        callback();
    }
}

TreeConfig.prototype.start = function(iDiscordClient, channels) {
    nasConfig = config.get('synology_download_station');
    plexConfig = config.get("plex-config");
    var nbChannels = this.requestedChannels.length;

    getPassword(nasConfig, 'NAS', function() {
        getPassword(plexConfig, 'Plex', function() {
            realStart(iDiscordClient, channels, nbChannels);
        });
    })
};

TreeConfig.prototype.onGuildMemberAdd = function(member) {
	
}

module.exports = TreeConfig;
