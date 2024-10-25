// const sqlite = require("sqlite3").verbose();
// let sql;
// const db = new sqlite.Database("./database.db", sqlite.OPEN_READWRITE, (err) => {
//   if (err) console.error(err);
// });

const sqlite3 = require('sqlite3').verbose();

const bodyParser = require('body-parser');

const nodemailer = require('nodemailer');

const bcrypt = require('bcryptjs');

const cookieParser = require('cookie-parser');

const formatMessage = require('./utils/messages');

const formatDM = require('./utils/dm');

const moment = require("moment");

const crypto = require('crypto');

const path = require('path');

const fs = require('fs/promises');


// Uploading images to user posts
const multer = require('multer');
const uploadedImages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
    console.log(file)
    cb(null, file.originalname)
  }
});
const upload = multer({storage: uploadedImages});

// allow users to upload profile images
const profileImages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/profileImages')
  },
  filename: (req, file, cb) => {
    console.log(file)
    cb(null, file.originalname)
  }
});

const upload2 = multer({storage: profileImages});

const { check, validationResult } = require('express-validator');

const express = require("express"),
  app = express();

app.use(express.json());
app.use(cookieParser());

//setting view engine to ejs
app.set("view engine", "ejs");

app.use(express.static('public'));

async function getUsername(cookie) {
  const query = `SELECT username as curUsername from Users WHERE (cookie = $cookie)`
  return await new Promise((resolve, reject) => {
    db.get(
      query,
      {
        $cookie: cookie
      },
      (err, record) => {
        if (err) {
          return reject(err);
        }
        console.log(record)
        return resolve(record.curUsername);
      }
    )
  })
}

async function getID(cookie) {
  // console.log(cookie)
  const query = `SELECT ID from Users WHERE (cookie = $cookie)`
  return await new Promise((resolve, reject) => {
    db.get(
      query,
      {
        $cookie: cookie
      },
      (err, record) => {
        if (err) {
          return reject(err);
        }
        console.log(record)
        return resolve(record.ID);
      }
    )
  })
}

async function getFriends(idSQL) {
  const query = `SELECT U.username as user, userId, CASE WHEN U.profileImage IS NULL THEN "/images/userIcon.png" ELSE U.profileImage END as getPic FROM Users U
  INNER JOIN (SELECT CASE
  WHEN F.Friend1 != $idSQL THEN F.Friend1
  WHEN F.friend2 != $idSQL THEN F.Friend2
  END as userId
  , F.confirmed as conf
  FROM Friends F
  WHERE F.Friend1 = $idSQL OR F.Friend2 = $idSQL
  ) as SubTable ON SubTable.userId = U.ID
  WHERE conf = 1
`
  return await new Promise((resolve, reject) => {
    db.all(
      query, 
    {
      $idSQL: idSQL
    },
    (err, rows) => {
      if (err) {
        return reject(err);
      }

      const row = rows
      return resolve(row);
    })
  })
}

async function getProfileImage(idSQL) {
  const query = `SELECT CASE WHEN profileImage IS NULL THEN "/images/userIcon.png" ELSE profileImage END as profileImage FROM Users WHERE ID = $idSQL`
  return await new Promise((resolve, reject) => {
    db.all(
      query, 
    {
      $idSQL: idSQL
    },
    (err, rows) => {
      if (err) {
        return reject(err);
      }

      const row = Object.values(rows[0]).toString()
      return resolve(row);
    })
  })
}

async function pendingFriends(idSQL) {
  const query = `SELECT CASE WHEN COUNT(U.username) = 0 THEN '0' ELSE COUNT(U.username) END as amt FROM Users U
  INNER JOIN (SELECT CASE
  WHEN F.Friend1 != $idSQL THEN F.Friend1
  WHEN F.friend2 != $idSQL THEN F.Friend2
  END as userId
  , F.confirmed as conf
  , F.Friend2 as friendId
  FROM Friends F
  WHERE F.Friend2 = $idSQL
  ) as SubTable ON SubTable.userId = U.ID
  WHERE conf = 0
  `
  return await new Promise((resolve, reject) => {
    db.all(
      query,
      {
        $idSQL: idSQL
      },
      (err, rows) => {
        if (err) {
          return reject(err);
        }
        const row = rows
      return resolve(row);
      }
    )
  })
}

async function searchedUsers(cookie, usernameSearch) {
  const query = `
  SELECT username
  , ID as uId
  , email
  , CASE WHEN profileImage IS NULL THEN "/images/userIcon.png" ELSE profileImage END as getPic 
  FROM Users 
  WHERE username like $usernameSearch 
  and username != '$cookie' 
  and email != '$cookie'
  `
  return await new Promise((resolve, reject) => {
    db.all(
      query, 
    {
      $cookie: cookie,
      $usernameSearch: ['%' + usernameSearch + '%']
    },
    (err, rows) => {
      if (err) {
        return reject(err);
      }
      return resolve(rows);
    })
  })
}

async function existingFriends(idSQL) {
  const query = `SELECT 
    Friend2 as listID 
    FROM Friends 
    WHERE Friend1 = $idSQL
    
    UNION 
    
    SELECT 
    Friend1 as listID 
    FROM Friends 
    WHERE Friend2 = $idSQL
  `
  return await new Promise((resolve, reject) => {
    db.all(
      query, 
    {
      $idSQL: idSQL,
    },
    (err, rows) => {
      if (err) {
        return reject(err);
      }
      return resolve(rows);
    })
  })
}

async function renderPosts(idSQL) {
  const query = `SELECT 
  DISTINCT P.ID as postID
  , P.comment as cmt
  , P.userId as postIdNum
  , U.username as curUsnm
  , conf
  , likes
  , dislikes
  , imageUrl as img
  , CASE WHEN U.profileImage IS NULL THEN "/images/userIcon.png" ELSE U.profileImage END as pic
  , P.displayPostDtTm as postDtTm
  , CASE WHEN commentAmt > 100 THEN "100+" ELSE commentAmt END as commentAmt
  , listLikes
  , listDislike

  FROM Post as P
  LEFT JOIN LikeDislikePost as LDP ON LDP.postId = P.ID
  LEFT JOIN (
    SELECT postId
    , GROUP_CONCAT(LDP.userId) listLikes 
      FROM LikeDislikePost LDP 
      WHERE like = 1 
      GROUP BY postId
    ) as postLikes ON postLikes.postId = P.ID

  LEFT JOIN (
    SELECT postId
    , GROUP_CONCAT(LDP.userId) listDislike 
      FROM LikeDislikePost LDP 
      WHERE dislike = 1 
      GROUP BY postId
  ) as postDislikes ON postDislikes.postId = P.ID

  LEFT JOIN (
    SELECT COUNT(*) as commentAmt
    , T.postId 
    FROM Threads T 
    GROUP BY T.postId
  ) as CMTS ON P.ID = CMTS.postId

  INNER JOIN(
    SELECT CASE
      WHEN F.Friend1 != $idSQL THEN F.Friend1
      WHEN F.friend2 != $idSQL THEN F.Friend2
      END as userId
      , F.confirmed as conf
    FROM Friends as F
    WHERE F.Friend1 = $idSQL OR F.Friend2 = $idSQL

    UNION ALL

    SELECT $idSQL, 1
  ) as SubTable ON SubTable.userId = P.userId

  INNER JOIN Users U ON U.ID = P.userId

  WHERE conf = 1
    
  ORDER BY P.creationDtTm
  DESC`
  return await new Promise((resolve, reject) => {
    db.all(
      query, 
    {
      $idSQL: idSQL,
    },
    (err, rows) => {
      if (err) {
        return reject(err);
      }
      return resolve(rows);
    })
  })
}


app.get('/messages', async (req, res) => {

  const cookie = req.cookies.userCookie;

  const idUsername = await getUsername(cookie);

  const idSQL = await getID(cookie);

  //render friends list on the messages page
  const friends = await getFriends(idSQL);

  const friendName = friends.map(item => item.user);
  const friendId = friends.map(item => item.userId);
  const friendPic = friends.map(item => item.getPic);

  const getPic = await getProfileImage(idSQL);

  const myRequestAmt = await pendingFriends(idSQL);
  const requestAmtValue = myRequestAmt.map(item => item.amt);


  res.render('messages', {
    idUsername,
    friendName,
    friendId,
    idSQL,
    friendPic,
    getPic,
    requestAmtValue
  });
 });
 
 
 app.get('/gallery', async (req, res) => {

  const cookie = req.cookies.userCookie;

  const idUsername = await getUsername(cookie);

  res.render('gallary', {
    idUsername
  });
 });


 app.get('/signup', (req, res) => {
  res.render('signup');
 });



 app.get('/market', (req, res) => {
  res.render('market');
 });


 app.get('/userSearch', async (req, res) => {
  // const cookie = Object.values(req.cookies).toString();
  const cookie = req.cookies.userCookie;
  const usernameSearch = req.query.usernameSearch;

//populates the search criteria entered by user in searchbar
  const sqlSearchName = `SELECT username, ID as uId, email, CASE WHEN profileImage IS NULL THEN "/images/userIcon.png" ELSE profileImage END as getPic FROM Users WHERE username like ? and cookie != '${cookie}'`

  const searchName = await new Promise((resolve, reject) => {
    db.all(sqlSearchName, ['%' + usernameSearch + '%'], (err, rows) => {
      if (err) {
        return reject(err);
      }

      const row = rows;
      return resolve(row);
    })
  })

  const nameList = searchName.map(item => item.username);
  const idList = searchName.map(item => item.uId);
  const userPic = searchName.map(item => item.getPic);

// identifies users that are already added or pending friend request
  const idSQL = await getID(cookie);
  const exists = await existingFriends(idSQL);

  const existsList = exists.map(item => item.listID);

  res.render('partials/userSearch', {
    nameList,
    idList,
    existsList,
    userPic
  });
 })


 app.get('/index', async (req, res) => {
  const cookie = req.cookies.userCookie;

  const idSQL = await getID(cookie);
// standard query to pull a current users profile image
const getPic = await getProfileImage(idSQL);
// main query that is pulling all user posts information, includes current signed in user posts as well as any other friends posts
  const renPosts = await renderPosts(idSQL);

  // const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idUsername = await getUsername(cookie);
  
  // gets a complete list of all friends
  const friends = await getFriends(idSQL);

  const friendName = friends.map(item => item.user);
  // console.log('This is my Friends list: ', friendName);
  const friendId = friends.map(item => item.userId);
  const likes = friends.map(item => item.likes);
  const dislikes = friends.map(item => item.dislikes);
  const friendPic = friends.map(item => item.getPic);

// amount of pending friend requests
  const myRequestAmt = await pendingFriends(idSQL);
  const requestAmtValue = myRequestAmt.map(item => item.amt);

  res.render('index', {
    renPosts,
    idUsername,
    friendName,
    friendId,
    likes,
    dislikes,
    getPic,
    friendPic,
    requestAmtValue
  });
 });

 app.get('/landing', (req, res) => {
  res.render('landing');
 });

 app.get('/premium', (req, res) => {
  res.render('premium');
 });

 app.get('/passwordReset', (req, res) => {

  // get the UUID for the password reset functionality. Which is then injected into password reset page and used for identification
  const myUUID = req.query.resetUUID;
  // time stamp used to expire reste email link
  const myUUIDtime = req.query.resetUUIDtime
  const hashedEmail = req.query.hashedEmail
  const curDtTm = moment().format('MM/DD/YYYY HH:mm:ss');
  res.render('passwordReset', {
    myUUID,
    myUUIDtime,
    curDtTm,
    hashedEmail
  });
 });

//route for index page
app.get("/", function (req, res) {
  res.render("landing");
});

//route for magic page
app.get("/magic", function (req, res) {
  res.render("magic");
});

const server = app.listen(8080, function () {
  console.log("Server is running on port 8080 ");
});

// const server = process.env.PORT || 8080;
// app.listen(server, () =>
//   console.log(`Example app is listening on port ${server}.`)
// );



const { Server } = require('socket.io');
const { isMapIterator, isDataView } = require('util/types');

const io = new Server(server);

// web sockets used for commenting on posts
io.on("connection", (socket) => {

  console.log("User Connected:" + socket.id);

  socket.on("message", (messageInput, curUsername, receiverUsername, messageThreadPostId) => {
    io.sockets.emit('message', formatMessage(messageInput, curUsername, receiverUsername, messageThreadPostId));
    console.log(messageInput, curUsername, receiverUsername, messageThreadPostId)
  })

  // web sockets used for direct message between users
  socket.on("DM", (messageInput, curUsername, otherUserId, otherUserName, senderId, senderPic) => {
    io.sockets.emit('DM', formatDM(messageInput, curUsername, otherUserId, otherUserName, senderId, senderPic));
    console.log(messageInput, curUsername, otherUserId, otherUserName, senderId, senderPic);
  })

})




// creates the DB
let db = new sqlite3.Database("./database.db" , (err) => {
  if(err) {
      console.log("Error Occurred - " + err.message);
  }
  else {
      console.log("DataBase Connected");
  }
})


app.use(bodyParser.urlencoded({extended: false}));
app.use(express.urlencoded({extended:false}));
const urlEncodedParser = bodyParser.urlencoded({ extended: false })

var createQuery = 
'CREATE TABLE Users ( ID INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT, username TEXT, email TEXT, password TEXT, birthdate, notifications, confirmed, uniqueString);';

db.run(createQuery, (err) => {
  if (err) return;
})


app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, './views/signup.ejs'));
})

app.use(bodyParser.json());


// data verification for the registration process. validates information like the email, username, password ect entered by user
app.post('/signup', urlEncodedParser,
 [
  check('email').isEmail().normalizeEmail().withMessage('Invalid Username'),
  check('email').custom(async (value, {req}) => {
    const sqlEmail = req.body.email;
    const emailSql = `SELECT COUNT(email) as existEmail FROM Users WHERE email = ?`;
    await new Promise((resolve, reject) => {
      db.all(emailSql, [sqlEmail], (err, rows) => {
        if (err) {
          return reject(err);
        }
    
        const row = rows[0]
           
        if (row.existEmail > 0) {
          return reject(new Error('Email is in use'));
        }
        return resolve();
      })
    })}),
  check('pswd').isLength( { min: 8 } ).withMessage("Password must exceed 8 characters"),
  check('usernm').isLength( { min: 3 } ).trim().withMessage("Invalid username"),
  check('usernm').custom(async (value, {req}) => {
    const sqlUsnm = req.body.usernm;
    const usnmSql = `SELECT COUNT(username) as existUsnm FROM Users WHERE username = ?`;
    await new Promise((resolve, reject) => {
      db.all(usnmSql, [sqlUsnm], (err, rows) => {
        if (err) {
          return reject(err);
        }
    
        const row = rows[0]
           
        if (row.existUsnm > 0) {
          return reject(new Error('Username is in use'));
        }
        return resolve();
      })
    })}),
  check('reemail').isEmail().normalizeEmail(),
  check('reemail').isEmail().normalizeEmail().custom(async (value, {req}) => {
    const email = req.body.email;
    if(email !== req.body.reemail) {
      throw new Error('Emails must match')
    }
  }),
  check('repswd').trim().custom(async (value, {req}) => {
    const password = req.body.pswd;
    if(password !== req.body.repswd) {
      throw new Error('Passwords must match')
    }
  })
 ],
  async(req, res) => {

    const errors = validationResult(req)
    const renFirst = req.body.fname;
    const renLast = req.body.lname;
    const renUsername = req.body.usernm
    const renEmail = req.body.email
    const renReemail = req.body.reemail
    const renPswd = req.body.pswd
    const renRepswd = req.body.repswd
    if(!errors.isEmpty()) {
      const alert = errors.array()
      res.render('signup', {
        alert,
        renFirst,
        renLast,
        renUsername,
        renEmail,
        renReemail,
        renPswd,
        renRepswd
      })

      return res.status(400);
    }

      const hashPassword = req.body.pswd;
      const hash = await bcrypt.hash(hashPassword, 10);
      console.log(hash);

      // create the user record in the db
  db.serialize(()=> {
    uniStr = crypto.randomUUID();
    db.run('INSERT INTO Users(first_name, last_name, username, email, password, birthdate, notifications, confirmed, uniqueString, cookie) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.body.fname, req.body.lname, req.body.usernm, req.body.email, hash, req.body.bdate, req.body.notis, 0, uniStr, 0], function(err) {
      if (err) {
        return console.log(err.message);
      }

      const newUser = "Please Confirm Your Email Address"
      console.log("New user has been added");
      res.render('landing', {
        newUser
      });

      var selectQuery = 'SELECT * FROM Users ;'

      db.all(selectQuery , (err , data) => {
        if(err) return;

        // Success
        console.log(data);
    });

    const email = req.body.email;
    // kicks off the email that is sent to the newly created user, requesting the the user cofirms the email that they entered
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: 'xboxonebro14@gmail.com',
        pass: 'fyjr wkbu eqgj ppxp',
      },
    });
    
    const message = {
        from: '"Buzz" <buzz@example.com>', // sender address
        to: email, // list of receivers
        subject: "Buzz Account Confirmation ✔ 🐝", // Subject line
        text: "Welcome to Buzz!", // plain text body
        html: `<div style="text-align: center;"><h2>Welcome to Buzz! &nbsp;👋<h2><h4>Find out what all the buzz is about.<h4><br><br><br><a class="but" href="http://localhost:8080/verify/${uniStr}" style="height: 35px; width: 170px; background-color: #3f90e8; color: #fff; border: 0px; text-decoration: none; padding: 10px 30px;">Confirm Email</a><br><br><br><br></p><img src="cid:myImg"/></div>`,
        attachments: [{
          filename: 'WebsiteLogoBlue.png',
          path: __dirname + '/public/images/WebsiteLogoBlue.png',
          cid: 'myImg'
        }]
    }
    // async..await is not allowed in global scope, must use a wrapper
    async function main() {
      // send mail with defined transport object
      const info = await transporter.sendMail(message);
    
      console.log("Message sent: %s", info.messageId);
      // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    
      //
      // NOTE: You can go to https://forwardemail.net/my-account/emails to see your email delivery status and preview
      //       Or you can use the "preview-email" npm package to preview emails locally in browsers and iOS Simulator
      //       <https://github.com/forwardemail/preview-email>
      //
    }
    
    main().catch(console.error);

    });
  });
});


app.post('/sendNewLink', async (req, res) => {
  const myResetEmail = req.body.resetEmail;
  const newResetPasswordUUID = crypto.randomUUID();
// updating the users table to include the uuid information for a password reset
  db.run(`UPDATE Users SET ResetPasswordUUID = '${newResetPasswordUUID}' WHERE email = '${myResetEmail}'`, function (err, row) {
    if (err) {
      throw err;
    }
   })

   const curDtTm = moment().format('MM/DD/YYYY HH:mm:ss');
// creating a timestamp for when the reset emai was sent to expire email after time
   db.run(`UPDATE Users SET resetUUIDSentDtTm = '${curDtTm}' WHERE email = '${myResetEmail}'`, function (err, row) {
    if (err) {
      throw err;
    }
   })
// flag to decide if user entered email exists within the db
  const searchResetEmail = `SELECT CASE WHEN email IS NOT NULL THEN 1 ELSE 2 END as resetFlag FROM Users WHERE email = '${myResetEmail}'`

      const validResetEmail = await new Promise((resolve, reject) => {
        db.all(searchResetEmail, (err, rows) => {
          if (err) {
            return reject(err);
          }

          return resolve(rows);
        })
      })
      // boolean identifying whether the entered by user is valid for password reset
      const flag = validResetEmail.map(item => item.resetFlag);

      if (flag == 1) {
        const resetUUID = `SELECT ResetPasswordUUID as UUID FROM Users WHERE email = '${myResetEmail}'`
        const myResetUUID = await new Promise((resolve, reject) => {
          db.all(resetUUID, (err, rows) => {
            if (err) {
              return reject(err);
            }
  
            return resolve(rows);
          })
        })

        const resetUUIDtime = `SELECT resetUUIDSentDtTm as UUIDTM FROM Users WHERE email = '${myResetEmail}'`
        const myResetUUIDtime = await new Promise((resolve, reject) => {
          db.all(resetUUIDtime, (err, rows) => {
            if (err) {
              return reject(err);
            }
  
            return resolve(rows);
          })
        })
        
        const hashedEmail = await bcrypt.hash(myResetEmail, 10);

        db.run(`UPDATE Users SET hashedEmail = '${hashedEmail}' WHERE email = '${myResetEmail}'`, function (err, row) {
          if (err) {
            throw err;
          }
         })

        const myResetUUIDValue = myResetUUID.map(item => item.UUID);
        const myResetUUIDTimeValue = myResetUUIDtime.map(item => item.UUIDTM);
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            // TODO: replace `user` and `pass` values from <https://forwardemail.net>
            user: 'xboxonebro14@gmail.com',
            pass: 'fyjr wkbu eqgj ppxp',
          },
        });
        // kicks off password reset email to user
        const message = {
            from: '"Buzz" <buzz@example.com>', // sender address
            to: myResetEmail, // list of receivers
            subject: "Buzz Account Password Reset", // Subject line
            text: "Reset Your Password!", // plain text body
            html: `<div style="text-align: center;"><h2>Uh-Oh Let's Get This Fixed &nbsp;😲<h2><h4>Click Here to Reset Your Password.<h4><br><br><br><a class="but" href="http://localhost:8080/passwordReset?resetUUID=${myResetUUIDValue}&resetUUIDtime=${myResetUUIDTimeValue}&hashedEmail=${hashedEmail}" style="height: 35px; width: 170px; background-color: #3f90e8; color: #fff; border: 0px; text-decoration: none; padding: 10px 30px;">Reset Password</a><br><br><p style="font-size: smaller;">This Email Will Expire in 30 Minutes</p><br><br><br><br></p><img src="cid:myImg"/></div>`,
            attachments: [{
              filename: 'WebsiteLogoBlue.png',
              path: __dirname + '/public/images/WebsiteLogoBlue.png',
              cid: 'myImg'
            }]
        }
        // async..await is not allowed in global scope, must use a wrapper
        async function main() {
          // send mail with defined transport object
          const info = await transporter.sendMail(message);
        
          console.log("Message sent: %s", info.messageId);
          // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
        
          //
          // NOTE: You can go to https://forwardemail.net/my-account/emails to see your email delivery status and preview
          //       Or you can use the "preview-email" npm package to preview emails locally in browsers and iOS Simulator
          //       <https://github.com/forwardemail/preview-email>
          //
        }
        // error handeling letting the user know whether the email was sent or not
        main().catch(console.error);
        const goodResendAlert = 'Password Reset Sent'
        res.render('landing', {
          goodResendAlert
        })
      } else {
        const resendAlert = 'Email Does Not Exist'
          res.render('landing', {
            resendAlert
          })
      }
})


app.post('/resendNewLink', async (req, res) => {
  const hashedEmail = req.body.hashedEmail;
  
  const getMyEmail = `SELECT CASE WHEN COUNT(email) < 1 THEN 'n/a' ELSE email END FROM Users WHERE hashedEmail = '${hashedEmail}'`

      const myEmail = await new Promise((resolve, reject) => {
        db.all(getMyEmail, (err, rows) => {
          if (err) {
            return reject(err);
          }

          return resolve(Object.values(rows[0]).toString());
        })
      })

  const newResetPasswordUUID = crypto.randomUUID();

  db.run(`UPDATE Users SET ResetPasswordUUID = '${newResetPasswordUUID}' WHERE email = '${myEmail}'`, function (err, row) {
    if (err) {
      throw err;
    }
   })

   const curDtTm = moment().format('MM/DD/YYYY HH:mm:ss');

   db.run(`UPDATE Users SET resetUUIDSentDtTm = '${curDtTm}' WHERE email = '${myEmail}'`, function (err, row) {
    if (err) {
      throw err;
    }
   })

  const searchResetEmail = `SELECT CASE WHEN email IS NOT NULL THEN 1 ELSE 2 END as resetFlag FROM Users WHERE email = '${myEmail}'`

  const validResetEmail = await new Promise((resolve, reject) => {
    db.all(searchResetEmail, (err, rows) => {
      if (err) {
        return reject(err);
      }

      return resolve(rows);
    })
  })
  // boolean identifying whether the entered by user is valid for password reset
  const flag = validResetEmail.map(item => item.resetFlag);

  if (flag == 1) {
    const resetUUID = `SELECT ResetPasswordUUID as UUID FROM Users WHERE email = '${myEmail}'`
    const myResetUUID = await new Promise((resolve, reject) => {
      db.all(resetUUID, (err, rows) => {
        if (err) {
          return reject(err);
        }

        // const rowz2 = Object.values(rows[0]).toString();
        return resolve(rows);
      })
    })

    const resetUUIDtime = `SELECT resetUUIDSentDtTm as UUIDTM FROM Users WHERE email = '${myEmail}'`
    const myResetUUIDtime = await new Promise((resolve, reject) => {
      db.all(resetUUIDtime, (err, rows) => {
        if (err) {
          return reject(err);
        }

        return resolve(rows);
      })
    })
    
    const hashedEmail = await bcrypt.hash(myEmail, 10);

    db.run(`UPDATE Users SET hashedEmail = '${hashedEmail}' WHERE email = '${myEmail}'`, function (err, row) {
      if (err) {
        throw err;
      }
      })

    const myResetUUIDValue = myResetUUID.map(item => item.UUID);
    const myResetUUIDTimeValue = myResetUUIDtime.map(item => item.UUIDTM);
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: 'xboxonebro14@gmail.com',
        pass: 'fyjr wkbu eqgj ppxp',
      },
    });
    // kicks off password reset email to user
    const message = {
        from: '"Buzz" <buzz@example.com>', // sender address
        to: myEmail, // list of receivers
        subject: "Buzz Account Password Reset", // Subject line
        text: "Reset Your Password!", // plain text body
        html: `<div style="text-align: center;"><h2>Uh-Oh Let's Get This Fixed &nbsp;😲<h2><h4>Click Here to Reset Your Password.<h4><br><br><br><a class="but" href="http://localhost:8080/passwordReset?resetUUID=${myResetUUIDValue}&resetUUIDtime=${myResetUUIDTimeValue}&hashEmail=${hashedEmail}" style="height: 35px; width: 170px; background-color: #3f90e8; color: #fff; border: 0px; text-decoration: none; padding: 10px 30px;">Reset Password</a><br><br><p style="font-size: smaller;">This Email Will Expire in 30 Minutes</p><br><br><br><br></p><img src="cid:myImg"/></div>`,
        attachments: [{
          filename: 'WebsiteLogoBlue.png',
          path: __dirname + '/public/images/WebsiteLogoBlue.png',
          cid: 'myImg'
        }]
    }
    // async..await is not allowed in global scope, must use a wrapper
    async function main() {
      // send mail with defined transport object
      const info = await transporter.sendMail(message);
    
      console.log("Message sent: %s", info.messageId);
      // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    
      //
      // NOTE: You can go to https://forwardemail.net/my-account/emails to see your email delivery status and preview
      //       Or you can use the "preview-email" npm package to preview emails locally in browsers and iOS Simulator
      //       <https://github.com/forwardemail/preview-email>
      //
    }
    // error handeling letting the user know whether the email was sent or not
    main().catch(console.error);
    const goodResendAlert = 'Password Reset Sent'
    res.render('landing', {
      goodResendAlert
    })
  } else {
    const resendAlert = 'Please use the most recent Reset Email'
    const myUUID = req.body.myUUID;
    const myUUIDtime = req.body.myUUIDtime;
    const curDtTm = req.body.curDtTm;
    const hashedEmail = req. body.hashedEmail;
      res.render('passwordReset', {
        resendAlert,
        myUUID,
        myUUIDtime,
        curDtTm,
        hashedEmail
      })
  }

      // console.log(flag)
})


// updates the Users table when a new user confirms their email and then sets the confirmed column to 1.
app.get('/verify/:uniqueString', async (req, res) => {
  const { uniStr } = req.params
  const us = uniStr
  const sqlSelectUnique = `SELECT COUNT(uniqueString) as us, confirmed as cnfm FROM Users WHERE confirmed = '${us}'`;

  db.all(sqlSelectUnique, (err, row) => {
    if (err) {
      throw err;
    }

    row.forEach(async (row) => {
      row.us += 1
      console.log(row.us);
       db.run(`UPDATE Users SET confirmed = ?`, [1], function (err, row) {
        if (err) {
          throw err;
        }
       })
       
       if (row.us > 0) {
        res.redirect('/landing')
       }
       else {
        console.log('User not found.')
       }
    })
  })
})

// includes error handleing for the users password reset
app.post('/reset', urlEncodedParser, [
  check('Resetpswd').isLength( { min: 8 } ).withMessage("Password must exceed 8 characters"),
  check('repswd').trim().custom(async (value, {req}) => {
    const password = req.body.Resetpswd;
    if(password !== req.body.Resetrepswd) {
      throw new Error('Passwords must match')
    }
  })
 ], async (req, res) => {
  const errors = validationResult(req)
    const renPswd = req.body.Resetpswd
    const renRepswd = req.body.Resetrepswd
    const myUUID = req.body.myUUID;
    const myUUIDtime = req.body.myUUIDtime;
    const curDtTm = req.body.curDtTm;
    const hashedEmail = req.body.hashedEmail;
    if(!errors.isEmpty()) {
      console.log(errors);
      const alert = errors.array()
      res.render('passwordReset', {
        alert,
        renPswd,
        renRepswd,
        myUUID,
        myUUIDtime,
        curDtTm,
        hashedEmail
      })

      return res.status(400);
    } else {
      const hashPassword = req.body.Resetpswd;
      const hash = await bcrypt.hash(hashPassword, 10);
      // sets the new password created by a user
    db.run(`UPDATE Users SET password = ? WHERE ResetPasswordUUID = '${myUUID}'`, [hash], function(err) {
      if (err) {
        return console.log(err.message);
      }
  })
  // removes the time stamp from the db for the password reset
  db.run(`UPDATE Users SET resetUUIDSentDtTm = ? WHERE ResetPasswordUUID = '${myUUID}'`, null, function(err) {
    if (err) {
      return console.log(err.message);
    }
  })
// removes the UUID from the db from password reset
  db.run(`UPDATE Users SET ResetPasswordUUID = ? WHERE ResetPasswordUUID = '${myUUID}'`, null, function(err) {
    if (err) {
      return console.log(err.message);
    }
})


    res.redirect('landing');
    }
    
    
})

// includes error handling for the login process
app.post('/login', async (req, res) => {
  const cookieUUID = crypto.randomUUID();
  db.run(`UPDATE Users SET cookie = ? WHERE username = '${req.body.logusername}'`, cookieUUID, function(err) {
    if (err) {
      return console.log(err.message);
    }
})

  res.cookie('userCookie', cookieUUID);
  const username = req.body.logusername;
  const email = req.body.logusername;
  const sqlSelect = `SELECT COUNT(username) as usnm, COUNT(email) as em, password as ps, confirmed as confirm FROM Users WHERE (username = '${username}' or email = '${email}')`;
  var alert2 = '';
  var alert3 = '';
  var alert4 = '';
  db.all(sqlSelect, (err, row) => {
    if(err) {
      throw err;
    }

    row.forEach(async (row) => {
      console.log(row.usnm);
      console.log(row.em);
      console.log(row.ps);
// error handeling letting user know whether the login attempt was successful or not
      if (row.usnm < 1 && row.em < 1) {
        alert2 = "Username or email does not exist."
        console.log(alert2);
        res.render('landing', {
          alert2
        })
      }
      else {
        if (row.confirm < 1) {
          alert4 = 'Please confirm email.'
          console.log(alert4);
          res.render('landing', {
            alert4
          })
        }  
        else {
          if (row.usnm > 0 || row.em > 0 && row.ps != null) {
            const bcryptCompare  = await bcrypt.compare(req.body.logpswd, row.ps);
            if (row.usnm > 0 && bcryptCompare == true) {
              res.redirect(301, '/index');
              console.log(bcryptCompare);
            }
            else {
              alert3 = "Incorrect Password."
              res.render('landing', {
                alert3
              })
              console.log(bcryptCompare);
              console.log(alert3);
            }
          }
          else {
            res.render('landing')
          }
        }
      }

      
    })
  })
})
// updates users current profile image with the newly selected image
app.post('/uploadPic', upload2.single('myProfImg'), urlEncodedParser, async (req, res) => {
  console.log(req.files)


  const cookie = req.cookies.userCookie;
  const idSQL = await getID(cookie);

// error handeling for whether the users actually selected new profile image, if not it return to default image
  if (req.file === undefined){
    db.run(`UPDATE Users SET profileImage = ? WHERE ID = ${idSQL}`, ['/images/userIcon.png'], function (err, row) {
      if (err) {
        throw err;
      }
     })
  } else {
    db.run(`UPDATE Users SET profileImage = ? WHERE ID = ${idSQL}`, "/profileImages/" + [req.file.originalname], function (err, row) {
      if (err) {
        throw err;
      }
     })
  }

  
  res.redirect('/index');
})

// updates the posts thread with any new posts created by user
app.post('/userPost', upload.single('myImg'), urlEncodedParser, async (req, res) => {
    console.log(req.files)

    const cookie = req.cookies.userCookie;
    const idSQL = await getID(cookie);

  // created as time stamp for the new post
  const curDtTm = moment().format('MM/DD/YYYY HH:mm:ss');
  const mytime = moment(curDtTm).format('LLL');

  
// error handeling for images attatched
  if (req.file === undefined){
    db.run('INSERT INTO Post(comment, userId, creationDtTm, displayPostDtTm) VALUES(?, ?, ?, ?)', [req.body.createNewPost, idSQL, Date.now(), mytime], function(err) {
      if (err) {
        return console.log(err.message);
      }
  })
  } else {

    const imageUUID = crypto.randomUUID();

    const folderA = imageUUID.slice(0, 2);
    const folderB = imageUUID.slice(2, 4);

    await fs.mkdir(`public/uploadImages/${folderA}/${folderB}`, { recursive: true });

    await fs.rename(`uploads/${req.file.originalname}`, `public/uploadImages/${folderA}/${folderB}/${imageUUID}`);
    
    db.run('INSERT INTO Post(comment, userId, creationDtTm, imageUrl, displayPostDtTm) VALUES(?, ?, ?, ?, ?)', [req.body.createNewPost, idSQL, Date.now(), `uploadImages/${folderA}/${folderB}/${imageUUID}`, mytime], function(err) {
      if (err) {
        return console.log(err.message);
      }
    })

  }

  console.log(req.body.createNewPost);

    res.redirect('/index');
})


app.get('/addFriend', urlEncodedParser, async (req, res)  =>  {
  const cookie = req.cookies.userCookie;
  const Id = req.query.uId;

  console.log(Id);

  const idSQL = await getID(cookie);

  console.log(idSQL);
  console.log(Id);
// checks if a user in a user search is already friended with the current user
  const friendExists = `
  SELECT SUM(F.F1) as existsNum
FROM (
	SELECT COALESCE(COUNT(*), 0) F1
	FROM Friends
	WHERE Friend1 = ${idSQL}
	AND Friend2 = ${Id}

	UNION ALL 

	SELECT COALESCE(COUNT(*), 0) F1
	FROM Friends
	WHERE Friend1 = ${Id}
	AND Friend2 = ${idSQL}
) AS "F"
  `

// Conditional to check if exists is greater than 0
  const exists = await new Promise((resolve, reject) => {
    db.get(friendExists, (err, rows) => {
      if (err) {
        return reject(err);
      }

      return resolve(rows);
    })
  })

  const existsVal = exists.existsNum

  if(existsVal > 0) {
    
    res.sendStatus(200);

  }
  else {
// updates the friend table with the current user and the user the request was sent to
    const friendUpdate = `INSERT INTO Friends(Friend1, Friend2, confirmed) VALUES(?, ?, 0)`

    db.all(friendUpdate, [idSQL, Id], (err, rows) => {
      if (err) {
        return (err);
      }
    })

    res.render('partials/addedNoti');
  }

})

app.get('/friendRequests', urlEncodedParser, async (req, res) => {
  const cookie = req.cookies.userCookie;

  const idSQL = await getID(cookie);
// pulls all pending friend requests and renders them in the notification center
  const friendsList = `SELECT U.username as user, U.ID as requester, friendId, CASE WHEN U.profileImage IS NULL THEN "/images/userIcon.png" ELSE U.profileImage END as userPic FROM Users U
    INNER JOIN (SELECT CASE
    WHEN F.Friend1 != ${idSQL} THEN F.Friend1
    WHEN F.friend2 != ${idSQL} THEN F.Friend2
    END as userId
    , F.confirmed as conf
    , F.Friend2 as friendId
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
    ) as SubTable ON SubTable.userId = U.ID
    WHERE conf = 0
  `

  const friends = await new Promise((resolve, reject) => {
    db.all(friendsList, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = rows
      return resolve(rowz2);
    })
  })

  const friendId = friends.map(item => item.friendId);
  console.log(friendId);

  const friendName = friends.map(item => item.user);
  console.log(friendName);

  const requester = friends.map(item => item.requester);

  const userPic = friends.map(item => item.userPic);

  res.render('partials/friendRequests', {
    friendId,
    idSQL,
    friendName,
    requester,
    userPic
  })
})


// updates a friends request relationship to confirmed = 1 if the reciever accepts request
app.get('/addFriendBack', urlEncodedParser, async (req, res) => {
  const friend = req.query.friend;
  const requesterId = req.query.requesterId;
  db.run(`UPDATE Friends SET confirmed = ? WHERE Friend1 = ${requesterId} AND Friend2 = ${friend}`, [1], function (err, row) {
    if (err) {
      throw err;
    }
   })
})


// removes request if the the reciever rejects
app.get('/rejectFriend', urlEncodedParser, async (req, res) => {
  const friend = req.query.friend;
  const requesterId = req.query.requesterId;
  db.run(`DELETE FROM Friends WHERE Friend1 = ${requesterId} AND Friend2 = ${friend}`, function (err, row) {
    if (err) {
      throw err;
    }
   })
})

app.get('/seeFriend', urlEncodedParser, async (req, res) => {
  const cookie = req.cookies.userCookie;

  const idSQL = await getID(cookie);
  
  const seeUserId = req.query.viewFriend;

  const postSQL = `SELECT P.ID as postID, comment as cmt, P.userId as postIdNum, U.username as curUsnm, conf, U.ID clickedId, likes as likes, dislikes as dislikes, imageUrl as img, CASE WHEN U.profileImage IS NULL THEN "/images/userIcon.png" ELSE U.profileImage END as pic, P.displayPostDtTm as postDtTm, CASE WHEN commentAmt > 100 THEN "100+" ELSE commentAmt END as commentAmt
  FROM Post P
  LEFT JOIN (SELECT COUNT(T.comment) as commentAmt, T.postId FROM Threads T GROUP BY T.postId) CMTS ON P.ID = CMTS.postId
  INNER JOIN(
    SELECT CASE
        WHEN F.Friend1 != ${idSQL} THEN F.Friend1
        WHEN F.friend2 != ${idSQL} THEN F.Friend2
        END as userId
        , F.confirmed as conf
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
    UNION ALL
    SELECT ${idSQL}, 1) SubTable ON SubTable.userId = P.userId
    INNER JOIN Users U ON U.ID = P.userId

    WHERE conf = 1
    AND clickedId = ${seeUserId}
    
  ORDER BY P.creationDtTm
  DESC`

  const renPosts = await new Promise((resolve, reject) => {
    db.all(postSQL, (err, rows) => {
      if (err) {
        return reject(err);
      }
      console.log(rows);
      resolve(rows);
    })
  })

  // const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idUsername = await getUsername(cookie);

  const friendsList = `SELECT U.username as user, userId, CASE WHEN U.profileImage IS NULL THEN "/images/userIcon.png" ELSE U.profileImage END as getPic FROM Users U
    INNER JOIN (SELECT CASE
    WHEN F.Friend1 != ${idSQL} THEN F.Friend1
    WHEN F.friend2 != ${idSQL} THEN F.Friend2
    END as userId
    , F.confirmed as conf
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
    ) as SubTable ON SubTable.userId = U.ID
    WHERE conf = 1
  `

  const friends = await new Promise((resolve, reject) => {
    db.all(friendsList, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = rows
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  const friendName = friends.map(item => item.user);
  console.log('This is my Friends list: ', friendName);
  const friendId = friends.map(item => item.userId);
  const likes = friends.map(item => item.likes);
  const dislikes = friends.map(item => item.dislikes);
  const friendPic = friends.map(item => item.getPic);

  console.log(renPosts)

  const userPostId = renPosts.map(item => item.clickedId);
  console.log("who I clicked on", userPostId);
  console.log('this is the selected user:' , seeUserId);

  const getPic = await getProfileImage(idSQL);

  const requestAmt = `SELECT CASE WHEN COUNT(U.username) = 0 THEN '0' ELSE COUNT(U.username) END as amt FROM Users U
    INNER JOIN (SELECT CASE
    WHEN F.Friend1 != ${idSQL} THEN F.Friend1
    WHEN F.friend2 != ${idSQL} THEN F.Friend2
    END as userId
    , F.confirmed as conf
    , F.Friend2 as friendId
    FROM Friends F
    WHERE F.Friend2 = ${idSQL}
    ) as SubTable ON SubTable.userId = U.ID
    WHERE conf = 0
  `

  const myRequestAmt = await new Promise((resolve, reject) => {
    db.all(requestAmt, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = rows
      return resolve(rowz2);
    })
  })
  const requestAmtValue = myRequestAmt.map(item => item.amt);

  res.render('seeFriend', {
    renPosts,
    idUsername,
    friendName,
    friendId,
    likes,
    dislikes,
    getPic,
    friendPic,
    requestAmtValue
  });
  


})

// controls the likes of a post by a user
app.get('/likePost' , urlEncodedParser, async (req, res) => {
  const like = req.query.like;
  const likedPostID = req.query.likedPostID;

  const cookie = req.cookies.userCookie;
  const idSQL = await getID(cookie);
  // checking to see if this user has already interacted with this post
  const getPostInfo = `SELECT COUNT(postId) as postInfo from LikeDislikePost WHERE postId = ${likedPostID} AND userId = ${idSQL}`

  const getPostInfoValue = await new Promise((resolve, reject) => {
    db.all(getPostInfo, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const row = Object.values(rows[0]).toString();
      return resolve(row);
    })
  })
  // checking to see if this user has already liked this post
  const alreadyLiked = `SELECT COUNT(postId) from LikeDislikePost WHERE postId = ${likedPostID} AND userId = ${idSQL} AND like = 1`

  const alreadyLikedValue = await new Promise((resolve, reject) => {
    db.all(alreadyLiked, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const row = Object.values(rows[0]).toString();
      return resolve(row);
    })
  })
  // conditional that updates the like or dislike for a user to a post
  if(alreadyLikedValue == 1) {
    if(getPostInfoValue == 1) {
      db.run(`UPDATE LikeDislikePost SET like = 0, dislike = 0 WHERE postId = ${likedPostID} AND userId = ${idSQL}`, function (err, row) {
        if (err) {
          throw err;
        }
       })
    } else {
      db.run(`INSERT INTO LikeDislikePost (postId, userId, like, dislike) VALUES (${likedPostID}, ${idSQL}, 0, 0)`, function (err, row) {
        if (err) {
          throw err;
        }
       })
    }
  } else {
    if(getPostInfoValue == 1) {
      db.run(`UPDATE LikeDislikePost SET like = 1, dislike = 0 WHERE postId = ${likedPostID} AND userId = ${idSQL}`, function (err, row) {
        if (err) {
          throw err;
        }
       })
    } else {
      db.run(`INSERT INTO LikeDislikePost (postId, userId, like, dislike) VALUES (${likedPostID}, ${idSQL}, 1, 0)`, function (err, row) {
        if (err) {
          throw err;
        }
       })
    }
  }


  const postSQL = `SELECT P.ID as postID, comment as cmt, P.userId as postIdNum, U.username as curUsnm, conf, SUM(LDP.like) as likes
  FROM Post P
  INNER JOIN(
    SELECT CASE
        WHEN F.Friend1 != ${idSQL} THEN F.Friend1
        WHEN F.friend2 != ${idSQL} THEN F.Friend2
        END as userId
        , F.confirmed as conf
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
    UNION ALL
    SELECT ${idSQL}, 1) SubTable ON SubTable.userId = P.userId
    INNER JOIN Users U ON U.ID = P.userId
    INNER JOIN LikeDislikePost as LDP ON LDP.postId = P.ID

    WHERE conf = 1
    AND postID = ${likedPostID}
    
  ORDER BY P.creationDtTm
  DESC`

  const renPosts = await new Promise((resolve, reject) => {
    db.all(postSQL, (err, rows) => {
      if (err) {
        return reject(err);
      }
      console.log(rows);
      resolve(rows);
    })
  })
  // get friends list
  const friendsList = `SELECT U.username as user, userId FROM Users U
    INNER JOIN (SELECT CASE
    WHEN F.Friend1 != ${idSQL} THEN F.Friend1
    WHEN F.friend2 != ${idSQL} THEN F.Friend2
    END as userId
    , F.confirmed as conf
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
    ) as SubTable ON SubTable.userId = U.ID
    WHERE conf = 1
  `

  const friends = await new Promise((resolve, reject) => {
    db.all(friendsList, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = rows
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  const friendName = friends.map(item => item.user);
  console.log('This is my Friends list: ', friendName);
  const friendId = friends.map(item => item.userId);
  const likes = renPosts.map(item => item.likes);
  // get the total amount of likes for a post
  const updatelikes = `SELECT COUNT(like) as like from LikeDislikePost WHERE (postId = '${likedPostID}' AND like = 1)`

  const updatelikesTotal = await new Promise((resolve, reject) => {
    db.all(updatelikes, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
    })
  })
  // sets the total amount of likes to a post
  db.run(`UPDATE Post SET likes = ? WHERE ID = '${likedPostID}'`, [updatelikesTotal], function(err) {
    if (err) {
      return console.log(err.message);
    }
})
// get the total amount of dislikes for a post
const updateDislikes = `SELECT COUNT(dislike) as dislike from LikeDislikePost WHERE (postId = '${likedPostID}' AND dislike = 1)`

  const updateDislikesTotal = await new Promise((resolve, reject) => {
    db.all(updateDislikes, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
    })
  })
  // sets the total amount of dislikes to a post
  db.run(`UPDATE Post SET dislikes = ? WHERE ID = '${likedPostID}'`, [updateDislikesTotal], function(err) {
    if (err) {
      return console.log(err.message);
    }
})

  res.render('partials/likes', {
    likes
  });

})

app.get('/checkLikePost', urlEncodedParser, async (req, res) => {
  const likedPostID = req.query.likedPostID;

  const cookie = req.cookies.userCookie;

  const idSQL = await getID(cookie);

  const updateDislikes = `SELECT COUNT(dislike) as dislike from LikeDislikePost WHERE (postId = '${likedPostID}' AND dislike = 1 AND userId = ${idSQL})`

  const updateDislikesTotal = await new Promise((resolve, reject) => {
    db.all(updateDislikes, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  console.log(updateDislikesTotal + "grhh")

  res.render('partials/checklikes', {
    updateDislikesTotal
  })

})

app.get('/checkDislikePost', urlEncodedParser, async (req, res) => {
  const likedPostID = req.query.likedPostID;

  const cookie = req.cookies.userCookie;

  const idSQL = await getID(cookie);

  const updateLikes = `SELECT COUNT(like) as like from LikeDislikePost WHERE (postId = '${likedPostID}' AND like = 1 AND userId = ${idSQL})`

  const updateLikesTotal = await new Promise((resolve, reject) => {
    db.all(updateLikes, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  console.log(updateLikesTotal)

  res.render('partials/checkDislike', {
    updateLikesTotal
  })

})


// controls the dislikes of a post by a specific user
app.get('/dislikePost' , urlEncodedParser, async (req, res) => {
  const likedPostID = req.query.likedPostID;

   const cookie = req.cookies.userCookie;

  const idSQL = await getID(cookie);


  const getPostInfo = `SELECT COUNT(postId) as postInfo from LikeDislikePost WHERE postId = ${likedPostID} AND userId = ${idSQL}`

  const getPostInfoValue = await new Promise((resolve, reject) => {
    db.all(getPostInfo, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  const alreadyDisliked = `SELECT COUNT(postId) from LikeDislikePost WHERE postId = ${likedPostID} AND userId = ${idSQL} AND dislike = 1`

  const alreadydislikedValue = await new Promise((resolve, reject) => {
    db.all(alreadyDisliked, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const row = Object.values(rows[0]).toString();
      return resolve(row);
    })
  })

  // checks to see if this user has already disliked this post. If so its set the dislike value to 0 for that user to that post
  if(alreadydislikedValue == 1) {
    if(getPostInfoValue == 1) {
      db.run(`UPDATE LikeDislikePost SET like = 0, dislike = 0 WHERE postId = ${likedPostID} AND userId = ${idSQL}`, function (err, row) {
        if (err) {
          throw err;
        }
       })
    } else {
      db.run(`INSERT INTO LikeDislikePost (postId, userId, like, dislike) VALUES (${likedPostID}, ${idSQL}, 0, 0)`, function (err, row) {
        if (err) {
          throw err;
        }
       })
    }
  } else {
    if(getPostInfoValue == 1) {
      db.run(`UPDATE LikeDislikePost SET like = 0, dislike = 1 WHERE postId = ${likedPostID} AND userId = ${idSQL}`, function (err, row) {
        if (err) {
          throw err;
        }
       })
    } else {
      db.run(`INSERT INTO LikeDislikePost (postId, userId, like, dislike) VALUES (${likedPostID}, ${idSQL}, 0, 1)`, function (err, row) {
        if (err) {
          throw err;
        }
       })
    }
  }


  const postSQL = `SELECT P.ID as postID, comment as cmt, P.userId as postIdNum, U.username as curUsnm, conf, SUM(LDP.dislike) as dislikes
  FROM Post P
  INNER JOIN(
    SELECT CASE
        WHEN F.Friend1 != ${idSQL} THEN F.Friend1
        WHEN F.friend2 != ${idSQL} THEN F.Friend2
        END as userId
        , F.confirmed as conf
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
    UNION ALL
    SELECT ${idSQL}, 1) SubTable ON SubTable.userId = P.userId
    INNER JOIN Users U ON U.ID = P.userId
    INNER JOIN LikeDislikePost as LDP ON LDP.postId = P.ID

    WHERE conf = 1
    AND postID = ${likedPostID}
    
  ORDER BY P.creationDtTm
  DESC`

  const renPosts = await new Promise((resolve, reject) => {
    db.all(postSQL, (err, rows) => {
      if (err) {
        return reject(err);
      }
      console.log(rows);
      resolve(rows);
    })
  })

  const friendsList = `SELECT U.username as user, userId FROM Users U
    INNER JOIN (SELECT CASE
    WHEN F.Friend1 != ${idSQL} THEN F.Friend1
    WHEN F.friend2 != ${idSQL} THEN F.Friend2
    END as userId
    , F.confirmed as conf
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
    ) as SubTable ON SubTable.userId = U.ID
    WHERE conf = 1
  `

  const friends = await new Promise((resolve, reject) => {
    db.all(friendsList, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = rows
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  const friendName = friends.map(item => item.user);
  console.log('This is my Friends list: ', friendName);
  const dislikes = renPosts.map(item => item.dislikes);

  const updateDislikes = `SELECT COUNT(dislike) as dislike from LikeDislikePost WHERE (postId = '${likedPostID}' AND dislike = 1)`

  const updateDislikesTotal = await new Promise((resolve, reject) => {
    db.all(updateDislikes, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  db.run(`UPDATE Post SET dislikes = ? WHERE ID = '${likedPostID}'`, [updateDislikesTotal], function(err) {
    if (err) {
      return console.log(err.message);
    }
})

const updatelikes = `SELECT COUNT(like) as like from LikeDislikePost WHERE (postId = '${likedPostID}' AND like = 1)`

  const updatelikesTotal = await new Promise((resolve, reject) => {
    db.all(updatelikes, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  db.run(`UPDATE Post SET likes = ? WHERE ID = '${likedPostID}'`, [updatelikesTotal], function(err) {
    if (err) {
      return console.log(err.message);
    }
})

  res.render('partials/dislikes', {
    dislikes
  });

})

    app.get('/populateMessages', urlEncodedParser, async (req, res) => {

      const cookie = req.cookies.userCookie;
      const postId = req.query.threadPostID;

      const myThreadMessages = `SELECT comment CMT FROM Threads WHERE postId = ${postId}`

      const threadMessages = await new Promise((resolve, reject) => {
        db.all(myThreadMessages, (err, rows) => {
          if (err) {
            return reject(err);
          }

          return resolve(rows);
        })
      })

      const myThreadSenderName = `SELECT U.username USNM FROM Users U JOIN Threads T ON U.ID = T.messagerId WHERE T.postId = ${postId}`

      const threadSenderName = await new Promise((resolve, reject) => {
        db.all(myThreadSenderName, (err, rows) => {
          if (err) {
            return reject(err);
          }

          return resolve(rows);
        })
      })

      const idUsername = await getUsername(cookie);

      const myTimeStamp = `SELECT timeStamp TMSTPM FROM Threads WHERE postId = ${postId}`

      const timeStamp = await new Promise((resolve, reject) => {
        db.all(myTimeStamp, (err, rows) => {
          if (err) {
            return reject(err);
          }

          return resolve(rows);
        })
      })

      const threadStringMessages = threadMessages.map(item => item.CMT);
      const threadStringSenderName = threadSenderName.map(item => item.USNM);
      const threadTimeStamp = timeStamp.map(item => item.TMSTPM);

      res.render('partials/threadMessages', {
        threadStringMessages,
        threadStringSenderName,
        idUsername,
        threadTimeStamp
      });
    })

    app.get('/openMessageThread', urlEncodedParser, async (req, res) => {
      const threadPostId = req.query.threadPostId;

      const cookie = req.cookies.userCookie;

      const idUsername = await getUsername(cookie);

      const getThreadUsername = `SELECT username as USNM from Users U JOIN Post P ON U.ID = P.userId WHERE P.ID = ${threadPostId}`

      const threadUsername = await new Promise((resolve, reject) => {
        db.all(getThreadUsername, (err, rows) => {
          if (err) {
            return reject(err);
          }

          const rowz2 = Object.values(rows[0]).toString();
          return resolve(rowz2);
        })
      })

      const getPostId = `SELECT P.ID as postId from Post P WHERE P.ID = ${threadPostId}`

      const PostId = await new Promise((resolve, reject) => {
        db.all(getPostId, (err, rows) => {
          if (err) {
            return reject(err);
          }

          const rowz2 = Object.values(rows[0]).toString();
          return resolve(rowz2);
        })
      })

      res.render('partials/usernames', {
        idUsername,
        threadUsername,
        PostId
      });
    })

    app.get('/messageThread', urlEncodedParser, async (req, res) => {
      const threadMessage = req.query.threadMessage;
      const threadId = req.query.threadID;
      const threadUserId = req.query.threadUserId;

      const cookie = req.cookies.userCookie;

      const idSQL = await getID(cookie);

      const timeStamp = moment().format('h:mm a')

       db.run('INSERT INTO Threads(comment, postId, messagerId, postsUserId, timeStamp) VALUES(?, ?, ?, ?, ?)', [threadMessage, threadId, idSQL, threadUserId, timeStamp], function(err) {
        if (err) {
          return console.log(err.message);
        }
    })
      res.sendStatus(200);
    })

    app.get('/dmMessage', urlEncodedParser, async (req, res) => {
      const dm = req.query.dmMessage;
      const recieverID = req.query.recieverID;
      const senderID = req.query.senderID;
      const myName = req.query.myName;
      const curDtTm = moment().format('MM/DD/YYYY HH:mm:ss');
      const timeStamp = moment(curDtTm).format('LLL');
      console.log(dm)
      console.log(recieverID)


      db.run('INSERT INTO Messages(message, sender, reciever, senderName, timeStamp) VALUES(?, ?, ?, ?, ?)', [dm, senderID, recieverID, myName, timeStamp], function(err) {
        if (err) {
          return console.log(err.message);
        }
    })
    res.sendStatus(200)
    })

    app.get('/renderDmConvo', urlEncodedParser, async (req, res) => {
      const friendID = req.query.friendID;
      const myID = req.query.myID;
      const cookie = req.cookies.userCookie;

      const idUsername = await getUsername(cookie);


      const myDmMessages = `SELECT message DM FROM Messages WHERE (sender = ${myID} AND reciever = ${friendID}) OR (sender = ${friendID} AND reciever = ${myID})`

      const DmMessages = await new Promise((resolve, reject) => {
        db.all(myDmMessages, (err, rows) => {
          if (err) {
            return reject(err);
          }

          return resolve(rows);
        })
      })

      const myDmSenderName = `SELECT senderName USNM FROM Messages WHERE (sender = ${myID} AND reciever = ${friendID}) OR (sender = ${friendID} AND reciever = ${myID})`

      const DmSenderName = await new Promise((resolve, reject) => {
        db.all(myDmSenderName, (err, rows) => {
          if (err) {
            return reject(err);
          }
          return resolve(rows);
        })
      })

      const myDmPic = `SELECT CASE WHEN profileImage IS NULL THEN "/images/userIcon.png" ELSE profileImage END as PROFPIC FROM Users U INNER JOIN (SELECT sender USNM FROM Messages WHERE (sender = ${myID} AND reciever = ${friendID}) OR (sender = ${friendID} AND reciever = ${myID})) as SUBTAB ON SUBTAB.USNM = U.ID`

      const DmPic = await new Promise((resolve, reject) => {
        db.all(myDmPic, (err, rows) => {
          if (err) {
            return reject(err);
          }

          return resolve(rows);
        })
      })

      const myDmTime = `SELECT timeStamp TMSTP FROM Messages WHERE (sender = ${myID} AND reciever = ${friendID}) OR (sender = ${friendID} AND reciever = ${myID})`

      const DmTime = await new Promise((resolve, reject) => {
        db.all(myDmTime, (err, rows) => {
          if (err) {
            return reject(err);
          }

          return resolve(rows);
        })
      })

      const DmStringMessages = DmMessages.map(item => item.DM);
      const DmStringName = DmSenderName.map(item => item.USNM);
      const DmTimeStamp = DmTime.map(item => item.TMSTP);
      const DmProfPic = DmPic.map(item => item.PROFPIC);
      console.log(DmStringMessages)

      res.render('partials/DmMessages', {
        DmStringMessages,
        idUsername,
        DmStringName,
        DmTimeStamp,
        DmProfPic
      });
    });

app.get('/changeUsername', urlEncodedParser, async(req, res) => {
  const myNewUsername = req.query.newUsername
  console.log(myNewUsername)

  const listUsername = `SELECT username USNM FROM Users`

      const allUsernames = await new Promise((resolve, reject) => {
        db.all(listUsername, (err, rows) => {
          if (err) {
            return reject(err);
          }


          return resolve(rows);
        })
      })

      const usernameList = allUsernames.map(({ USNM }) => USNM);

      if(usernameList.includes(myNewUsername)) {
        const usernameAlert = 'Username Is In Use'
          res.render('partials/badUsername', {
            usernameAlert
          })
      } else {


        const cookie = req.cookies.userCookie;

        const idSQL = await getID(cookie);


        db.run(`UPDATE Users SET username = ? WHERE ID = '${idSQL}'`, [myNewUsername], function(err) {
            if (err) {
              return console.log(err.message);
            }
        })
        db.run(`UPDATE Messages SET senderName = ? WHERE sender = '${idSQL}'`, [myNewUsername], function(err) {
          if (err) {
            return console.log(err.message);
          }
      })
        const usernameAlert = 'Username Updated'
        res.render('partials/goodUsername', {
          usernameAlert
        })
      }

})

app.post('/deleteFriend', urlEncodedParser, async (req, res) => {
  const deleteThisUser = req.body.deleteMe;

  const cookie = req.cookies.userCookie;

  const idSQL = await getID(cookie);

  const getOtherId = `SELECT ID as id from Users WHERE (username = '${deleteThisUser}' OR email = '${deleteThisUser}')`

  const otherIdSQL = await new Promise((resolve, reject) => {
    db.all(getOtherId, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  db.run(`DELETE FROM Friends
  WHERE (Friend1 = ${idSQL} OR friend2 = ${idSQL})
  AND (Friend1 = ${otherIdSQL} OR friend2 = ${otherIdSQL})
  AND confirmed = 1`, function(err) {
    if (err) {
      return console.log(err.message);
    }



  res.redirect('/index')
})

})