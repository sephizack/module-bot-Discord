const ChatbotAI = require('./chatbotAI.js')
const Discord = require('discord.js')
const bot = new Discord.Client()
const config = require('config')
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

if (!config.has('decision_tree_module')) {
    console.log("You must define 'decision_tree_module' in your config file");
    process.exit()
}

// Define bot Decision Tree
const BotConfig = require('./' + config.get('decision_tree_module'));
var botConfig = new BotConfig();
var chatboxAI = new ChatbotAI();
chatboxAI.setDecisionTree(botConfig.decisionTree);
chatboxAI.setThanksBranch(botConfig.thanksTree);

if (config.has('debug_console') && config.get('debug_console') == true) {
    // Talk to the BOT in the console
    console.log("Module is listening to you on the console !");
    var fakeGeneralChannel = {
        send: function(str) {
            console.log("Bot sent: " + str);
        }
    }
    var fakeMessage = {
        reply: function(message, options) {
            console.log("Bot replied: " + message + "\nWith options:", options, '\n');
        }
    }
    function talkToBot() {
        rl.question('Send message the bot: ', (answer) => {
            fakeMessage.content = answer;
            chatboxAI.processMessage(fakeMessage);
            talkToBot();
        });
    }
    rl.question('Choose a fake username: ', (answer) => {
        fakeMessage.author = answer;
        botConfig.start(null, fakeGeneralChannel);
        talkToBot();
    });
    rl.on('close', function() {process.exit();})
} else {
    function connectToDiscord(client, token, nb_retries) {
        console.log("Trying to login to Discord...")
        var loginPromise = client.login(token);
        loginPromise.catch(error => {
            if (nb_retries <= 0) {
                console.log("Login failed too many times, abort.")
                process.exit()
            } else {
                console.log('An error has occured. Retrying in 1 minute.')
                setTimeout(function () {connectToDiscord(client, token, nb_retries-1)}, 1000*60);
            }
        });
    }

    // Start the actual BOT conected to Discord
    bot.on('ready', function (){
        console.log("Je suis connecté !");
        var reqChannels = botConfig.requestedChannels();
        var retrievedChannels = {};
        for (var i in reqChannels) {
            retrievedChannels[reqChannels[i]] = bot.channels.find(c => c.name == reqChannels[i]);
        }
        botConfig.start(bot, retrievedChannels);
        //if (generalChannel) generalChannel.send('Je me suis reboot')
    })

    bot.on('guildMemberAdd', botConfig.onGuildMemberAdd)

    bot.on('message', message => {
        console.log("Received: " + message.channel.lastMessage.content)
        chatboxAI.processMessage(message);
    });

    if(config.has('token_bot') && config.get('token_bot') !== ""){
        connectToDiscord(bot, config.get('token_bot'), 20);
    } else {
        console.error('You need to create config folder with default.json file containing the login token of your bot in variable token_bot. See exemple_default.json')
    }
}