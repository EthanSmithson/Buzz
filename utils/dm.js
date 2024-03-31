const moment = require("moment");

function formatDM(text, curUsername, otherUserId, otherUserName, senderId, senderPic) {
    return {
        text,
        curUsername,
        otherUserId,
        otherUserName,
        senderId,
        senderPic,
        time: moment().format('h:mm a')
    }
}

module.exports = formatDM