const moment = require("moment");

function formatDM(text, curUsername, otherUserId, otherUserName, senderId, senderPic) {
    return {
        text,
        curUsername,
        otherUserId,
        otherUserName,
        senderId,
        senderPic,
        time: moment(moment().format('MM/DD/YYYY HH:mm:ss')).format('LLL')
    }
}

module.exports = formatDM