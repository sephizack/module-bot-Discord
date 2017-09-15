const ChatbotAI = require('./chatbotAI.js')
const Discord = require('discord.js') // https://discord.js.org/#/docs/main/stable/class/Client
const bot = new Discord.Client()
var config = require('config')

var chatboxAI = new ChatbotAI();

var generalChannel = null;
bot.on('ready', function (){
	console.log("Je suis connecté !");

	generalChannel = bot.channels.find(c => c.name == 'general');
	if (generalChannel) generalChannel.send('Je me suis reboot')
})

bot.on('guildMemberAdd', member => {
	if(generalChannel){
		generalChannel.send('Bienvenue sur le discord des "The Allagans", ' + member.displayName)
	}
})

bot.on('message', message => {
	console.log("Recieved: " + message.channel.lastMessage.content)
	chatboxAI.processMessage(message);
})


// Define bot Decision Tree
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
		triggers:[['comment', 'clear'], ['guide']], replyData: ['de quel turn veux-tu voir le guide ?'], replyOnFailedNext:["je ne connais pas ce turn :(", "wtf ça existe même pas"],
		next: TURNS_GUIDES_TREE
	},{
		triggers:TRIG_ennui, replyData : ["t'as clear tout les raids?"], replyOnFailedNext:[""],
		next: [{
			triggers:TRIG_oui, replyData : ["plus qu'a aider les membres de la guilde qui n'ont pas terminé!"], replyOptions:{embed:denis}
		}, {
			triggers:TRIG_non, replyData : ["bah voila!"]
		}, {
			triggers:[['presque'], ['quasiment'], ['bientot']], replyData:["allez courage! je prie pour toi :pray: "]
		}]
	},{
		triggers:[['dadou'],['dadoulink'],['dado']], replyData : ["DADO C TRO UN PGM"], stopDiscussionOnMatch:true
	},{
		triggers:[['slap']], replyData : ["Non moi je slap rien du tout !"], stopDiscussionOnMatch:true
	},{
		triggers:[['tu', 'sers', 'rien'],['tu', 'nul'], ['t', 'nul'], ['tu', 'pue'], ['tu', 'useless'], ['t', 'useless']], 
		replyData : ["mon code est open source, hésites pas a m'améliorer"], replyOptions:{embed:denis}, stopDiscussionOnMatch:true
	},{
		triggers:[['rien'], ['que', 'dalle'], ['est', 'bon', 'en', 'fait'], ['laisse', 'tomber']], replyData : ["ok ++"]
	},{
		triggers:[['shut', 'up'], ['ta', 'gueule']], replyData : [":cry: "]
	}]
},{
	triggers:[['cool', 'bot'], ['cool', 'module'], ['enorme', 'module'], ['excellent', 'module'], ['excellent', 'bot']], 
	replyData: ['merci :blush: ', 'hehe :muscle: ', 'beh ouais', ':innocent:'], stopDiscussionOnMatch:true
},{
	triggers:[['on', 'a', 'clear'], ['voila', 'down'],['gg','down']], replyData: ['félicitations!'],replyOptions:{embed:sanbitter}
},{
	triggers:[['ok', 'google']], replyData: ['mon nom est module!']
},{
	triggers:[['comment','on','fait','pour']], replyData: ["Cadeau : http://www.google.fr"]
},{
	triggers:[['salut', 'module'],['salut','bot']], replyData: ["Salut !", "Yo !", "Salut ça va ?"],
	next: [{
		triggers:TRIG_non.concat([['bof'], ['pas', 'trop']]), replyData: ["hmmm je ne suis pas sur de pouvoir être très utile :slight_frown: @everyone", ""]
	}, {
		triggers:[['et', 'toi'], ['ca', 'va', '?']], replyData: ["ca roule tranquille", "ouais pas trop mal", "bien bien"]
	}]
}];

chatboxAI.setDecisionTree(okModuleTree);
chatboxAI.setThanksBranch(MERCI_DE_RIEN_BRANCH);

if(config.has('token_bot') && config.get('token_bot') !== ""){
	bot.login(config.get('token_bot'));
} else {
	console.error('You need to create config folder with default.json file containing the login token of your bot in variable token_bot. See exemple_default.json')
}