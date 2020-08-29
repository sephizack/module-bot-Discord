const Discord = require('discord.js')

var TreeConfig = function () {};

var denis = new Discord.RichEmbed({file: './images/denisAH.jpg'});
var sanbitter = new Discord.RichEmbed({file: './images/sanbitter.jpg', title:"San bitter de clear"});
var TRIG_oui = [['oui'], ['ouai'], ['ouais'], ['ui'], ['yep'], ['yes'], ['ofc'], ['bien', 'sur']]
var TRIG_non = [['non'], ['no'], ['nope']]
var TRIG_ennui = [['je', 'm','ennui'],['je', 'me', 'fais', 'chier'], ['je', 'me', 'fait', 'chier'], ['je', 'm', 'emmerdes'], ['je', 'sais', 'pas', 'quoi', 'faire']]
var MERCI_DE_RIEN_BRANCH = {
    triggers:[['merci'], ['nickel'], ['oklm'], ['ty'], ['thanks']], replyData: ['pas de problème :muscle:', 'np', 'stop me parler stp'], stopDiscussionOnMatch:true
}
var TRIG_request_english = [['english'], ['anglais'], ['us']];
var TURNS_GUIDES_TREE = [
    {triggers:[['coil','turn','1'], ['t1']], replyData: ['https://www.youtube.com/watch?v=z8reDOvk66w'], 
        next:[{triggers:TRIG_request_english, replyData: ['https://www.youtube.com/watch?v=0AahAJGPri4']}]},
    {triggers:[['omega','turn','4'], ['o4s'], ['o4'], ['v4'], ['v4s']], replyData: ['https://www.youtube.com/watch?v=3gwn6RpLi-E https://www.youtube.com/watch?v=szBWZqLnbio'], 
        next:[{triggers:TRIG_request_english, replyData:['https://www.youtube.com/watch?v=H0vQM2htINk https://www.youtube.com/watch?v=hbd6uaNXp88']}]},
]
var okModuleTree = [{
    triggers:[['ok', 'module'], ['<@!355001896005664768>']], replyData: ["que veut-tu savoir ?"], replyOnFailedNext:["je ne te comprends pas :expressionless: "],
    next: [{
        triggers:[['comment', 'clear'], ['guide']], replyData: ['de quel turn veux-tu voir le guide ?'], replyOnFailedNext:["je ne connais pas ce turn :("], /*keepOnReplyFail:true,*/
        next: TURNS_GUIDES_TREE
    },{
        triggers:TRIG_ennui, replyData : ["t'as clear tout les raids?"], replyOnFailedNext:[""],
        next: [{
            onlyAsReply:true, triggers:TRIG_oui, replyData : ["plus qu'a aider les membres de la guilde qui n'ont pas terminé!"], replyOptions:{embed:denis}
        }, {
            onlyAsReply:true, triggers:TRIG_non, replyData : ["bah voila!"]
        }, {
            onlyAsReply:true, triggers:[['presque'], ['quasiment'], ['bientot']], replyData:["allez courage! je prie pour toi :pray: "]
        }]
    },/*{
        triggers:[['dadou'],['dadoulink'],['dado']], replyData : ["DADO C TRO UN PGM"], stopDiscussionOnMatch:true
    },*/{
        triggers:[['slap']], replyData : ["Non moi je slap rien du tout !"], stopDiscussionOnMatch:true
    },{
        triggers:[['tu', 'sers', 'rien'],['tu', 'nul'], ['t', 'nul'], ['tu', 'pue'], ['tu', 'useless'], ['t', 'useless'], ['va', 'mourir']], 
        replyData : ["mon code est open source, hésites pas à m'améliorer. https://github.com/davidbisegna/module-bot-Discord"], stopDiscussionOnMatch:true
    },{
        onlyAsReply:true, triggers:[['rien'], ['que', 'dalle'], ['est', 'bon', 'en', 'fait'], ['laisse', 'tomber']], replyData : ["AH"], replyOptions:{embed:denis}
    },{
        triggers:[['shut', 'up'], ['ta', 'gueule']], replyData : [":cry: "]
    }]
},{
    triggers:[['cool', 'bot'], ['cool', 'module'], ['enorme', 'module'], ['excellent', 'module'], ['excellent', 'bot']], 
    replyData: ['merci :blush: ', 'hehe :muscle: ', 'beh ouais', ':innocent:'], stopDiscussionOnMatch:true
},{
    triggers:[['on', 'a', 'clear'], ['voila', 'down'],['gg','down']], replyData: ['félicitations!'],replyOptions:{embed:sanbitter}
},{
    triggers:[['ok', 'google']], replyData: ['non moi c\'est module :)']
},/*{
    triggers:[['comment','on','fait','pour']], replyData: ["Cadeau : http://www.google.fr"]
},*/{
    triggers:[['salut', 'module'],['salut','bot']], replyData: ["Salut ! Ca va ?", "Yo, ca roule ?", "Salut ça va ?"],
    next: [{
        onlyAsReply:true, triggers:TRIG_non.concat([['bof'], ['pas', 'trop'], ['pas', 'des', 'masses']]), replyData: ["hmmmm je ne pense pas pouvoir être très utile :slight_frown:"]
    }, {
        onlyAsReply:true, triggers:[['oui', 'et', 'toi'], ['ca', 'va', '?']], replyData: ["ca roule tranquille", "ouais pas trop mal", "bien bien"]
    }]
}];

TreeConfig.prototype.decisionTree = okModuleTree;
TreeConfig.prototype.thanksTree = MERCI_DE_RIEN_BRANCH;
var generalChannel = null;
TreeConfig.prototype.requestedChannels = function() {
    return ['general']
};

TreeConfig.prototype.start = function(iDiscordClient, channels) {
    generalChannel = channels['general'];
}
TreeConfig.prototype.onGuildMemberAdd = function(member) {
	if(generalChannel){
        generalChannel.send('Bienvenue sur le discord des The Allagans, ' + member.displayName)
    }
}

module.exports = TreeConfig;
