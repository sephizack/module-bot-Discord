var ChatbotAI = function () {};

var _decisionTree = [{
	triggers:[['bonjour'], ['salut']], replyData: ["bonjour ! Ceci est ma configuration par defaut."]
}]

var _thanksBranch = {
	triggers:[['merci'], ['nickel'], ['oklm'], ['ty'], ['thanks']], replyData: ['pas de problème :muscle:', 'np', 'stop me parler stp'], stopDiscussionOnMatch:true
}

ChatbotAI.prototype.setDecisionTree = function(tree) {
	_decisionTree = tree;
}
ChatbotAI.prototype.setThanksBranch = function(branch) {
	_thanksBranch = branch;
}

var _users_branch = {}
function setUserBranch(author, tree) {
	_users_branch[author] = tree;
	// Delete user node after 2 minutes without reply
	setTimeout(function() {
		delete _users_branch[author];
	}, 1000*60*2);
}

function getUserBranch(author){
	return _users_branch[author];
}

function deleteUserBranch(author){
	delete _users_branch[author];
}

function randomReply(message, replies, options) {
	message.reply(replies[Math.floor(Math.random()*replies.length)], options)
}

function getNextUserTree(branch) {
	var merci_tree = [_thanksBranch];
	if (branch.next) return merci_tree.concat(branch.next);
	else return merci_tree
}

function processMessage(message) {
	try {
		var words = message.content.toLowerCase().replace(/(,|\.|\')/g, ' ').split(' ');

		// Get last tree of the user (if any)
		var userBranch = getUserBranch(message.author);
		if (userBranch) {
			var deepestBranchFromUserBranch = processTree(getNextUserTree(userBranch), words);
			if (deepestBranchFromUserBranch == null) {
				if(userBranch.replyOnFailedNext) {
					randomReply(message, userBranch.replyOnFailedNext, userBranch.replyOptions);
					deleteUserBranch(message.author);
					return;
				}
			} else {
				endWithBranch(message, deepestBranchFromUserBranch);
				return;
			}
		}

		var deepestBranch = processTree(_decisionTree, words);
		if (deepestBranch) endWithBranch(message, deepestBranch);
	} catch(e) {
		console.error(e);
	}
}

function endWithBranch(message, branch) {
	randomReply(message, branch.replyData, branch.replyOptions);
	if (branch.stopDiscussionOnMatch) deleteUserBranch(message.author);
	else setUserBranch(message.author, branch);
}

// Returns deepest matched branch starting from baseTree
function processTree(baseTree, words) {
	if (!baseTree) return null;
	for(var i = 0; i<baseTree.length; i++) {
		if(match_triggers(baseTree[i].triggers, words)){
			var deepestBranch = processTree(baseTree[i].next, words);
			if (deepestBranch == null) return baseTree[i];
			else return deepestBranch;
		}
	}
	return null;
}

function match_triggers(triggers, words) {
	for(var i = 0; i < triggers.length; i++) {
		if(match_trigger(triggers[i],words)){
			return true;
		}
	}
	return false;
}

function match_trigger(trigger, words) {
	for(var i = 0; i < trigger.length; i++) {
		if(words.indexOf(trigger[i]) == -1) {
			return false;
		}
	}
	return true;
}


ChatbotAI.prototype.processMessage = processMessage;
module.exports = ChatbotAI;