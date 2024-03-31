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

const path = require('path');

// const fileUpload = require('express-fileupload');

const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploadImages')
  },
  filename: (req, file, cb) => {
    console.log(file)
    cb(null, file.originalname)
  }
});
const upload = multer({storage: storage});

const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/profileImages')
  },
  filename: (req, file, cb) => {
    console.log(file)
    cb(null, file.originalname)
  }
});

const upload2 = multer({storage: storage2});

//const validate = require('validate.js');
const { check, validationResult } = require('express-validator');
const { async } = require('validate.js');
const { hash } = require('bcrypt');

const express = require("express"),
  app = express();

app.use(express.json());
app.use(cookieParser());

// const server = require('http').createServer(app);
// const io = require('socket.io')(server, { cors: { origin: "*" }});

//setting view engine to ejs
app.set("view engine", "ejs");

app.use(express.static('public'));


app.get('/messages', async (req, res) => {

  const cookie = Object.values(req.cookies).toString();

  const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idUsername = await new Promise((resolve, reject) => {
    db.all(getUsername, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      return resolve(rowz2);
    })
  })

  const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idSQL = await new Promise((resolve, reject) => {
    db.all(getId, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

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
      // console.log(rowz2);
      return resolve(rowz2);
    })
  })

  const friendName = friends.map(item => item.user);
  // console.log('This is my Friends list: ', friendName);
  const friendId = friends.map(item => item.userId);
  const friendPic = friends.map(item => item.getPic);

  const pic = `SELECT CASE WHEN profileImage IS NULL THEN "/images/userIcon.png" ELSE profileImage END as profileImage FROM Users WHERE ID = ${idSQL}`
  const getPic = await new Promise((resolve, reject) => {
    db.all(pic, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })


  res.render('messages', {
    idUsername,
    friendName,
    friendId,
    idSQL,
    friendPic,
    getPic
  });
 });
 
 app.get('/gallary', async (req, res) => {

  const cookie = Object.values(req.cookies).toString();

  const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idUsername = await new Promise((resolve, reject) => {
    db.all(getUsername, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      return resolve(rowz2);
    })
  })
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
  const cookie = Object.values(req.cookies).toString();
  let usernameSearch = req.query.usernameSearch;
  console.log('This is my query string ' + usernameSearch);

  const sqlSearchName = `SELECT username, ID as uId, email FROM Users WHERE username like ? and username != '${cookie}' and email != '${cookie}'`

  const searchName = await new Promise((resolve, reject) => {
    db.all(sqlSearchName, ['%' + usernameSearch + '%'], (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = rows;
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  const nameList = searchName.map(item => item.username);
  const idList = searchName.map(item => item.uId);

  // for(var i = 0; i<searchName.length; i++) {
  //   nameList = searchName[i].first_name
  //   console.log(nameList);
  // }
  console.log(nameList);
  console.log(idList);


  const friendExists = 'SELECT Friend2 as listID FROM Friends WHERE Friend1 = ? UNION SELECT Friend1 as listID FROM Friends WHERE Friend2 = ?'
  const getId2 = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`;


  const idSQL2 = await new Promise((resolve, reject) => {
    db.all(getId2, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  const exists = await new Promise((resolve, reject) => {
    db.all(friendExists, [idSQL2, idSQL2], (err, rows) => {
      if (err) {
        return reject(err);
      }

      const row6 = rows;
      return resolve(row6);
    })
  })

  // console.log(idSQL2);
  // console.log(idList);
  const existsList = exists.map(item => item.listID);
  console.log('These are my current friends:' + existsList);

  res.render('partials/userSearch', {
    nameList,
    idList,
    existsList
  });
 })

 app.get('/index', async (req, res) => {
  const cookie = Object.values(req.cookies).toString();
  const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idSQL = await new Promise((resolve, reject) => {
    db.all(getId, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  const pic = `SELECT CASE WHEN profileImage IS NULL THEN "/images/userIcon.png" ELSE profileImage END as profileImage FROM Users WHERE ID = ${idSQL}`
  const getPic = await new Promise((resolve, reject) => {
    db.all(pic, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  const postSQL2 = `SELECT P.ID as postID, comment as cmt, P.userId as postIdNum, U.username as curUsnm, conf, likes as likes, dislikes as dislikes, imageUrl as img, CASE WHEN U.profileImage IS NULL THEN "/images/userIcon.png" ELSE U.profileImage END as pic
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

    WHERE conf = 1
    
  ORDER BY P.creationDtTm
  DESC`

  const renPosts = await new Promise((resolve, reject) => {
    db.all(postSQL2, (err, rows) => {
      if (err) {
        return reject(err);
      }
      // console.log(rows);
      resolve(rows);
      // const rowz2 = rows.cmt;
      // console.log(rowz2);
      // return resolve(rowz2);
    })
  })

  const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idUsername = await new Promise((resolve, reject) => {
    db.all(getUsername, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      // console.log(rowz2);
      return resolve(rowz2);
    })
  })

  // console.log(idUsername);

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
      // console.log(rowz2);
      return resolve(rowz2);
    })
  })

  const friendName = friends.map(item => item.user);
  // console.log('This is my Friends list: ', friendName);
  const friendId = friends.map(item => item.userId);
  const likes = friends.map(item => item.likes);
  const dislikes = friends.map(item => item.dislikes);
  const friendPic = friends.map(item => item.getPic);

  // const friendCheck = `SELECT confirmed FROM Friends WHERE (F.Friend1 = ${idSQL} and F.Friend2  ${}`

  // const friendExists = 'SELECT Friend2 as listId, confirmed as conf FROM Friends WHERE Friend1 = ? UNION SELECT Friend1 as listID, confirmed conf FROM Friends WHERE Friend2 = ?'
  // const exists = await new Promise((resolve, reject) => {
  //   db.all(friendExists, [idSQL, idSQL], (err, rows) => {
  //     if (err) {
  //       return reject(err);
  //     }

  //     const row6 = rows;
  //     return resolve(row6);
  //   })
  // })

  // const confirmList = exists.map(item => item.conf);
  // console.log('Friends: ', confirmList);
  // console.log(renPosts)


  res.render('index', {
    renPosts,
    idUsername,
    friendName,
    friendId,
    likes,
    dislikes,
    getPic,
    friendPic
  });
 });

 app.get('/landing', (req, res) => {
  res.render('landing');
 });

 app.get('/passwordReset', (req, res) => {
  // console.log(req.query)
  const myEmail = req.query.email;
  res.render('passwordReset', {
    myEmail
  });
 });

//  app.get('/liveFeed', (req, res) => {
//   // const {renPosts} = app.findById(req.params.renPosts)
//   res.render('liveFeed', { renPosts: renPosts });
//  });

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

const { Server } = require('socket.io');

const io = new Server(server);

io.on("connection", (socket) => {

  console.log("User Connected:" + socket.id);

  socket.on("message", (data, data2, data3, data4) => {
    io.sockets.emit('message', formatMessage(data2, data, data3, data4));
    console.log(data)
  })

  socket.on("DM", (data1, data2, data3, data4, data5, data6) => {
    io.sockets.emit('DM', formatDM(data1, data2, data3, data4, data5, data6));
    console.log(data1, data2, data3, data4, data5, data6);
  })

})

// sql = `CREATE TABLE Register(ID INTEGER PRIMARY KEY, first_name, last_name, username, email, password, birthday, notifications)`
// db.run(sql)

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
//     var insertQuery = 
// 'INSERT INTO Users (first_name, last_name, username, email, password, birthdate, notifications) VALUES ("Ethan", "Smithson", "esmithson123", "ethansmithson413@gmail.com", "ess123", "5-1-2023", "yes");'

app.use(bodyParser.json());
// app.use(fileUpload());

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
      console.log(errors);
      // return res.status(422).jsonp(errors.array());
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

    //   res.render('signup', {
    //     title: 'Registration Error',
    //     errors: errors
    // });

      return res.status(400);
    }

    const randString = () => {
      const len = 8
      let randStr = ''
      for(let i=0; i<len; i++) {
        const ch = Math.floor((Math.random() * 10) + 1)
        randStr += ch
      }

      return randStr
    }

      const hashPassword = req.body.pswd;
      const hash = await bcrypt.hash(hashPassword, 10);
      console.log(hash);

  db.serialize(()=> {
    uniStr = randString()
    db.run('INSERT INTO Users(first_name, last_name, username, email, password, birthdate, notifications, confirmed, uniqueString) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.body.fname, req.body.lname, req.body.usernm, req.body.email, hash, req.body.bdate, req.body.notis, 0, uniStr], function(err) {
      if (err) {
        return console.log(err.message);
      }

      console.log("New user has been added");
      res.redirect(301, '/landing');

      var selectQuery = 'SELECT * FROM Users ;'

      db.all(selectQuery , (err , data) => {
        if(err) return;

        // Success
        console.log(data);
    });

    const email = req.body.email;

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

//   app.get('/', function(req, res) {
//     var mascots = [
//       { name: 'Sammy', organization: "DigitalOcean", birth_year: 2012},
//       { name: 'Tux', organization: "Linux", birth_year: 1996},
//       { name: 'Moby Dock', organization: "Docker", birth_year: 2013}
//     ];
//     var tagline = "No programming concept is complete without a cute animal mascot.";
  
//     res.render('pages/index', {
//       mascots: mascots,
//       tagline: tagline
//     });
//   });

  
});

app.post('/sendNewLink', async (req, res) => {
  const myResetEmail = req.body.resetEmail;
  // console.log(myResetEmail)

  const searchResetEmail = `SELECT CASE WHEN email IS NOT NULL THEN 1 ELSE 2 END as resetFlag FROM Users WHERE email = '${myResetEmail}'`

      const validResetEmail = await new Promise((resolve, reject) => {
        db.all(searchResetEmail, (err, rows) => {
          if (err) {
            return reject(err);
          }

          // const rowz2 = Object.values(rows[0]).toString();
          return resolve(rows);
        })
      })

      const flag = validResetEmail.map(item => item.resetFlag);

      if (flag == 1) {
        // console.log('1')
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
            to: myResetEmail, // list of receivers
            subject: "Buzz Account Password Reset", // Subject line
            text: "Reset Your Password!", // plain text body
            html: `<div style="text-align: center;"><h2>Uh-Oh Let's Get This Fixed &nbsp;😲<h2><h4>Click Here to Reset Your Password.<h4><br><br><br><a class="but" href="http://localhost:8080/passwordReset?email=${myResetEmail}" style="height: 35px; width: 170px; background-color: #3f90e8; color: #fff; border: 0px; text-decoration: none; padding: 10px 30px;">Reset Password</a><br><br><br><br></p><img src="cid:myImg"/></div>`,
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
        const goodResendAlert = 'Password Reset Sent'
        res.render('landing', {
          goodResendAlert
        })
      } else {
        // console.log('2')
        const resendAlert = 'Email Does Not Exist'
          // console.log(resendAlert);
          res.render('landing', {
            resendAlert
          })
      }

      // console.log(flag)
})

app.get('/verify/:uniqueString', async (req, res) => {
  const { uniStr } = req.params
  const us = uniStr
  const sqlSelectUnique = `SELECT COUNT(uniqueString) as us, confirmed as cnfm FROM Users WHERE confirmed = '${us}'`;
  // const sqlUpdate =  `UPDATE Users SET confirmed = ? WHERE uniqueString = ?`;

  db.all(sqlSelectUnique, (err, row) => {
    if (err) {
      throw err;
    }

    row.forEach(async (row) => {
      row.us += 1
      console.log(row.us);
       // const user = await db.findOne({ uniqueString: uniStr })
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
    const myEmail = req.body.myEmail;
    if(!errors.isEmpty()) {
      console.log(errors);
      // return res.status(422).jsonp(errors.array());
      const alert = errors.array()
      res.render('passwordReset', {
        alert,
        renPswd,
        renRepswd,
        myEmail
      })

    //   res.render('signup', {
    //     title: 'Registration Error',
    //     errors: errors
    // });

      return res.status(400);
    } else {
      const hashPassword = req.body.Resetpswd;
      const hash = await bcrypt.hash(hashPassword, 10);
      console.log(hash);

      

      console.log(req.body.Resetpswd)
      console.log(hash)
      console.log(req.body)
      // `UPDATE Friends SET confirmed = ? WHERE Friend1 = ${requesterId} AND Friend2 = ${friend}`, [1], function (err, row)
    db.run(`UPDATE Users SET password = ? WHERE email = '${myEmail}'`, [hash], function(err) {
      if (err) {
        return console.log(err.message);
      }
  })

    res.redirect('landing');
    }
    
    
})


app.post('/login', async (req, res) => {
  res.cookie('userCookie', req.body.logusername);
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
  // db.each('SELECT password FROM Users', (err, row) => {
  //   console.log(row.password);
  // })
  // if (user !== row.email) {
  //   return res.status(400).send('No User')
  // }
  // try {
  //   if (bcrypt.compare(req.body.logpswd, db.password)) {
  //     res.send("Success")
  //   }
  //   else {
  //     res.send("Failed Login")
  //   }
  // }
  // catch {
  //   res.status(500).send()
  // }
}
)

app.post('/uploadPic', upload2.single('myProfImg'), urlEncodedParser, async (req, res) => {
  console.log(req.files)


  const cookie = Object.values(req.cookies).toString();
    const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`
    console.log(Object.values(req.cookies).toString());
    const idSQL = await new Promise((resolve, reject) => {
      db.all(getId, (err, rows) => {
        if (err) {
          return reject(err);
        }

        const rowz = Object.values(rows[0]).toString();
        console.log(rowz);
        return resolve(rowz);
      })
    })

  //   db.run('INSERT INTO Images(fieldName, originalName, mimeType) VALUES(?, ?, ?)', [req.file.fieldname, req.file.originalname, req.file.mimetype], function(err) {
  //     if (err) {
  //       return console.log(err.message);
  //     }
  // })

  if (req.file === undefined){
    db.run(`UPDATE Users SET profileImage = ? WHERE ID = ${idSQL}`, [''], function (err, row) {
      if (err) {
        throw err;
      }
     })
  //   db.run('INSERT INTO Post(comment, userId, creationDtTm) VALUES(?, ?, ?)', [req.body.createNewPost, idSQL, Date.now()], function(err) {
  //     if (err) {
  //       return console.log(err.message);
  //     }
  // })
  } else {
    db.run(`UPDATE Users SET profileImage = ? WHERE ID = ${idSQL}`, "/profileImages/" + [req.file.originalname], function (err, row) {
      if (err) {
        throw err;
      }
     })
  //   db.run('INSERT INTO Post(comment, userId, creationDtTm, imageUrl) VALUES(?, ?, ?, ?)', [req.body.createNewPost, idSQL, Date.now(), "/uploadImages/" + req.file.originalname], function(err) {
  //     if (err) {
  //       return console.log(err.message);
  //     }
  // })
  }

  
  res.redirect('/index');
})

app.post('/userPost', upload.single('myImg'), urlEncodedParser, async (req, res) => {
    // const {name, data} = req.files;
    console.log(req.files)

    const cookie = Object.values(req.cookies).toString();
    const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`
    console.log(Object.values(req.cookies).toString());
    const idSQL = await new Promise((resolve, reject) => {
      db.all(getId, (err, rows) => {
        if (err) {
          return reject(err);
        }

        const rowz = Object.values(rows[0]).toString();
        console.log(rowz);
        return resolve(rowz);
      })
    })

  //   db.run('INSERT INTO Images(fieldName, originalName, mimeType) VALUES(?, ?, ?)', [req.file.fieldname, req.file.originalname, req.file.mimetype], function(err) {
  //     if (err) {
  //       return console.log(err.message);
  //     }
  // })

  if (req.file === undefined){
    db.run('INSERT INTO Post(comment, userId, creationDtTm) VALUES(?, ?, ?)', [req.body.createNewPost, idSQL, Date.now()], function(err) {
      if (err) {
        return console.log(err.message);
      }
  })
  } else {
    db.run('INSERT INTO Post(comment, userId, creationDtTm, imageUrl) VALUES(?, ?, ?, ?)', [req.body.createNewPost, idSQL, Date.now(), "/uploadImages/" + req.file.originalname], function(err) {
      if (err) {
        return console.log(err.message);
      }
  })
  }

  //   db.run('INSERT INTO Post(comment, userId, creationDtTm, imageUrl) VALUES(?, ?, ?, ?)', [req.body.createNewPost, idSQL, Date.now(), "/uploadImages/" + req.file.originalname], function(err) {
  //     if (err) {
  //       return console.log(err.message);
  //     }
  // })

  console.log(req.body.createNewPost);

  // const postSQL = `SELECT ID, comment as cmt FROM Post WHERE userId = ? ORDER BY creationDtTm DESC`


  // console.log(Object.values(renPosts));

  // app.set("renPosts", renPosts)
  // res.send(renPosts)
  // res.redirect('/liveFeed')
    res.redirect('/index');
    // res.render('liveFeed', {
    //   renPosts
    // })
    

})


app.get('/addFriend', urlEncodedParser, async (req, res)  =>  {
  const cookie = Object.values(req.cookies).toString();
  const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`;
  const Id = req.query.uId;

  console.log(Id);

  const idSQL2 = await new Promise((resolve, reject) => {
    db.all(getId, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  console.log(idSQL2);
  console.log(Id);

  const friendExists = `
  SELECT SUM(F.F1) as existsNum
FROM (
	SELECT COALESCE(COUNT(*), 0) F1
	FROM Friends
	WHERE Friend1 = ${idSQL2}
	AND Friend2 = ${Id}

	UNION ALL 

	SELECT COALESCE(COUNT(*), 0) F1
	FROM Friends
	WHERE Friend1 = ${Id}
	AND Friend2 = ${idSQL2}
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

  console.log(idSQL2);
  console.log('Does this friend exist:', existsVal);


  if(existsVal > 0) {
    
    res.sendStatus(200);

  }
  else {

    const friendUpdate = `INSERT INTO Friends(Friend1, Friend2, confirmed) VALUES(?, ?, 0)`

    db.all(friendUpdate, [idSQL2, Id], (err, rows) => {
      if (err) {
        return (err);
      }
    })

    res.render('partials/addedNoti');
  }

})

app.get('/friendRequests', urlEncodedParser, async (req, res) => {
  const cookie = Object.values(req.cookies).toString();

  const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idSQL = await new Promise((resolve, reject) => {
    db.all(getId, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  const friendsList = `SELECT U.username as user, U.ID as requester, friendId FROM Users U
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

  // const curName = `SELECT username FROM Users WHERE ID = ${idSQL}`

  // const name = await new Promise((resolve, reject) => {
  //   db.all(curName, (err, rows) => {
  //     if (err) {
  //       return reject(err);
  //     }

  //     const rowz2 = rows
  //     return resolve(rowz2);
  //   })
  // })
  // const myName = name.map(item => item.username);
  // console.log(myName)

  const friendId = friends.map(item => item.friendId);
  console.log(friendId);

  const friendName = friends.map(item => item.user);
  console.log(friendName);

  const requester = friends.map(item => item.requester);

  res.render('partials/friendRequests', {
    friendId,
    idSQL,
    friendName,
    requester
  })
})


app.get('/addFriendBack', urlEncodedParser, async (req, res) => {
  const friend = req.query.friend;
  const requesterId = req.query.requesterId;
  db.run(`UPDATE Friends SET confirmed = ? WHERE Friend1 = ${requesterId} AND Friend2 = ${friend}`, [1], function (err, row) {
    if (err) {
      throw err;
    }
   })
  // console.log(friend);
  // console.log(requesterId);
})

app.get('/seeFriend', urlEncodedParser, async (req, res) => {
  const cookie = Object.values(req.cookies).toString();
  const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`;

  const idSQL = await new Promise((resolve, reject) => {
    db.all(getId, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })
  
  const seeUserId = req.query.viewFriend;

  const postSQL2 = `SELECT P.ID as postID, comment as cmt, P.userId as postIdNum, U.username as curUsnm, conf, U.ID clickedId, likes as likes, dislikes as dislikes, imageUrl as img, CASE WHEN U.profileImage IS NULL THEN "/Images/userIcon.png" ELSE U.profileImage END as pic
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

    WHERE conf = 1
    AND clickedId = ${seeUserId}
    
  ORDER BY P.creationDtTm
  DESC`

  const renPosts = await new Promise((resolve, reject) => {
    db.all(postSQL2, (err, rows) => {
      if (err) {
        return reject(err);
      }
      console.log(rows);
      resolve(rows);
      // const rowz2 = rows.cmt;
      // console.log(rowz2);
      // return resolve(rowz2);
    })
  })

  const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idUsername = await new Promise((resolve, reject) => {
    db.all(getUsername, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
    })
  })

  console.log(idUsername);

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

  const pic = `SELECT CASE WHEN profileImage IS NULL THEN "/images/userIcon.png" ELSE profileImage END as profileImage FROM Users WHERE ID = ${idSQL}`
  const getPic = await new Promise((resolve, reject) => {
    db.all(pic, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  res.render('seeFriend', {
    renPosts,
    idUsername,
    friendName,
    friendId,
    likes,
    dislikes,
    getPic,
    friendPic
  });
  


})

app.get('/likePost' , urlEncodedParser, async (req, res) => {
  const like = req.query.like;
  const likedPostID = req.query.likedPostID;
  console.log(like)
  console.log('What I liked', likedPostID);

  // const likePost = `UPDATE Post SET likes = likes + ${like} WHERE ID = ${likedPostID}`;

  db.run(`UPDATE Post SET likes = likes + ${like} WHERE ID = ${likedPostID}`, function (err, row) {
    if (err) {
      throw err;
    }
   })

   const cookie = Object.values(req.cookies).toString();
  const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idSQL = await new Promise((resolve, reject) => {
    db.all(getId, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  const postSQL2 = `SELECT P.ID as postID, comment as cmt, P.userId as postIdNum, U.username as curUsnm, conf, likes as likes
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

    WHERE conf = 1
    AND postID = ${likedPostID}
    
  ORDER BY P.creationDtTm
  DESC`

  const renPosts = await new Promise((resolve, reject) => {
    db.all(postSQL2, (err, rows) => {
      if (err) {
        return reject(err);
      }
      console.log(rows);
      resolve(rows);
      // const rowz2 = rows.cmt;
      // console.log(rowz2);
      // return resolve(rowz2);
    })
  })

  const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idUsername = await new Promise((resolve, reject) => {
    db.all(getUsername, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
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
  const friendId = friends.map(item => item.userId);
  const likes = renPosts.map(item => item.likes);

  //  const numOfLikes = `SELECT Likes as likes FROM Post where ID = ${likedPostID}`;

  // const postLikes = await new Promise((resolve, reject) => {
  //   db.all(numOfLikes, (err, row) => {
  //     if (err) {
  //       return reject(err);
  //     }

  //     const rowLikes = row;
  //     console.log(rowLikes);
  //     return resolve(rowLikes);
  //   })
  // })

  // const likes = postLikes.map(item => item.likes);
  // console.log(likes);

  res.render('partials/likes', {
    likes
  });

})



app.get('/dislikePost' , urlEncodedParser, async (req, res) => {
  const dislike = req.query.like;
  const likedPostID = req.query.likedPostID;
  // console.log(like)
  console.log('What I liked', likedPostID);

  // const likePost = `UPDATE Post SET likes = likes + ${like} WHERE ID = ${likedPostID}`;

  db.run(`UPDATE Post SET dislikes = dislikes + ${dislike} WHERE ID = ${likedPostID}`, function (err, row) {
    if (err) {
      throw err;
    }
   })

   const cookie = Object.values(req.cookies).toString();
  const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idSQL = await new Promise((resolve, reject) => {
    db.all(getId, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz = Object.values(rows[0]).toString();
      return resolve(rowz);
    })
  })

  const postSQL2 = `SELECT P.ID as postID, comment as cmt, P.userId as postIdNum, U.username as curUsnm, conf, dislikes as dislikes
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

    WHERE conf = 1
    AND postID = ${likedPostID}
    
  ORDER BY P.creationDtTm
  DESC`

  const renPosts = await new Promise((resolve, reject) => {
    db.all(postSQL2, (err, rows) => {
      if (err) {
        return reject(err);
      }
      console.log(rows);
      resolve(rows);
      // const rowz2 = rows.cmt;
      // console.log(rowz2);
      // return resolve(rowz2);
    })
  })

  const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

  const idUsername = await new Promise((resolve, reject) => {
    db.all(getUsername, (err, rows) => {
      if (err) {
        return reject(err);
      }

      const rowz2 = Object.values(rows[0]).toString();
      console.log(rowz2);
      return resolve(rowz2);
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
  const friendId = friends.map(item => item.userId);
  const dislikes = renPosts.map(item => item.dislikes);

  //  const numOfLikes = `SELECT Likes as likes FROM Post where ID = ${likedPostID}`;

  // const postLikes = await new Promise((resolve, reject) => {
  //   db.all(numOfLikes, (err, row) => {
  //     if (err) {
  //       return reject(err);
  //     }

  //     const rowLikes = row;
  //     console.log(rowLikes);
  //     return resolve(rowLikes);
  //   })
  // })

  // const likes = postLikes.map(item => item.likes);
  // console.log(likes);

  res.render('partials/dislikes', {
    dislikes
  });

})

/*function isUserNameInUse(userName){
  var conn = require("./database.db");
  return new Promise((resolve, reject) => {
      conn.query('SELECT COUNT(*) AS total FROM Users WHERE username = ?', [userName], function (error, results, fields) {
          if(!error){
              console.log("MENTION COUNT : "+results[0].total);
              return resolve(results[0].total > 0);
          } else {
              return reject(new Error('Database error!!'));
          }
        }
      );
  });
}*/

    // var selectQuery = 'SELECT * FROM Users ;'
  
    // // Running Query
    // db.run(createQuery , (err) => {
    //     if(err) return;
  
    //     // Success
    //     console.log("Table Created");
    //     db.run(insertQuery , (err) => {
    //         if(err) return;
  
    //         // Success
    //         console.log("Insertion Done");
    //         db.all(selectQuery , (err , data) => {
    //             if(err) return;
  
    //             // Success
    //             console.log(data);
    //         });
    //     });
    // });

    app.get('/populateMessages', urlEncodedParser, async (req, res) => {

      const cookie = Object.values(req.cookies).toString();
      const postId = req.query.threadPostID;

      // console.log("this is my post:", postId)
      const myThreadMessages = `SELECT comment CMT FROM Threads WHERE postId = ${postId}`

      const threadMessages = await new Promise((resolve, reject) => {
        db.all(myThreadMessages, (err, rows) => {
          if (err) {
            return reject(err);
          }

          // const rowz2 = Object.values(rows[0]).toString();
          return resolve(rows);
        })
      })

      const myThreadSenderName = `SELECT U.username USNM FROM Users U JOIN Threads T ON U.ID = T.messagerId WHERE T.postId = ${postId}`

      const threadSenderName = await new Promise((resolve, reject) => {
        db.all(myThreadSenderName, (err, rows) => {
          if (err) {
            return reject(err);
          }

          // const rowz2 = Object.values(rows[0]).toString();
          return resolve(rows);
        })
      })

      const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

      const idUsername = await new Promise((resolve, reject) => {
        db.all(getUsername, (err, rows) => {
          if (err) {
            return reject(err);
          }

          const rowz2 = Object.values(rows[0]).toString();
          return resolve(rowz2);
        })
      })

      const myTimeStamp = `SELECT timeStamp TMSTPM FROM Threads WHERE postId = ${postId}`

      const timeStamp = await new Promise((resolve, reject) => {
        db.all(myTimeStamp, (err, rows) => {
          if (err) {
            return reject(err);
          }

          // const rowz2 = Object.values(rows[0]).toString();
          return resolve(rows);
        })
      })

      const threadStringMessages = threadMessages.map(item => item.CMT);
      // console.log(threadStringMessages)
      const threadStringSenderName = threadSenderName.map(item => item.USNM);
      const threadTimeStamp = timeStamp.map(item => item.TMSTPM);
      // console.log(threadStringSenderName)
      // console.log(idUsername)
      // console.log(moment().format('h:mm a'))
      // const timeStamp = moment().format('h:mm a')

      res.render('partials/threadMessages', {
        threadStringMessages,
        threadStringSenderName,
        idUsername,
        threadTimeStamp
      });
    })

    app.get('/openMessageThread', urlEncodedParser, async (req, res) => {
      const threadPostId = req.query.threadPostId;
      const threadCmt = req.query.threadCmt;

      const cookie = Object.values(req.cookies).toString();

      const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

      const idUsername = await new Promise((resolve, reject) => {
        db.all(getUsername, (err, rows) => {
          if (err) {
            return reject(err);
          }

          const rowz2 = Object.values(rows[0]).toString();
          return resolve(rowz2);
        })
      })

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

      // const getThreadCmt = `SELECT comment FROM Threads WHERE postId = ${threadPostId}`;

      // console.log(threadPostId);
      // console.log(threadCmt);

      // res.sendStatus(200);
    })

    app.get('/messageThread', urlEncodedParser, async (req, res) => {
      const threadMessage = req.query.threadMessage;
      const threadId = req.query.threadID;
      const threadUserId = req.query.threadUserId;

      const cookie = Object.values(req.cookies).toString();
      const getId = `SELECT ID as id from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

      const idSQL = await new Promise((resolve, reject) => {
        db.all(getId, (err, rows) => {
          if (err) {
            return reject(err);
          }

          const rowz = Object.values(rows[0]).toString();
          return resolve(rowz);
        })
      })

      // db.run(`UPDATE Threads SET comment = ${threadMessage} WHERE postId = ${threadId}`, function (err, row) {
      //   if (err) {
      //     throw err;
      //   }
      //  })

      const timeStamp = moment().format('h:mm a')

       db.run('INSERT INTO Threads(comment, postId, messagerId, postsUserId, timeStamp) VALUES(?, ?, ?, ?, ?)', [threadMessage, threadId, idSQL, threadUserId, timeStamp], function(err) {
        if (err) {
          return console.log(err.message);
        }
    })

      // console.log(threadMessage);
      // console.log(threadId);

      res.sendStatus(200);
    })

    app.get('/dmMessage', urlEncodedParser, async (req, res) => {
      const dm = req.query.dmMessage;
      const recieverID = req.query.recieverID;
      const senderID = req.query.senderID;
      const myName = req.query.myName;
      const timeStamp = moment().format('h:mm a')
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
      const cookie = Object.values(req.cookies).toString();


      const getUsername = `SELECT username as curUsername from Users WHERE (username = '${cookie}' OR email = '${cookie}')`

      const idUsername = await new Promise((resolve, reject) => {
        db.all(getUsername, (err, rows) => {
          if (err) {
            return reject(err);
          }

          const rowz2 = Object.values(rows[0]).toString();
          return resolve(rowz2);
        })
      })


      const myDmMessages = `SELECT message DM FROM Messages WHERE (sender = ${myID} AND reciever = ${friendID}) OR (sender = ${friendID} AND reciever = ${myID})`

      const DmMessages = await new Promise((resolve, reject) => {
        db.all(myDmMessages, (err, rows) => {
          if (err) {
            return reject(err);
          }

          // const rowz2 = Object.values(rows[0]).toString();
          return resolve(rows);
        })
      })

      const myDmSenderName = `SELECT senderName USNM FROM Messages WHERE (sender = ${myID} AND reciever = ${friendID}) OR (sender = ${friendID} AND reciever = ${myID})`

      const DmSenderName = await new Promise((resolve, reject) => {
        db.all(myDmSenderName, (err, rows) => {
          if (err) {
            return reject(err);
          }

          // const rowz2 = Object.values(rows[0]).toString();
          return resolve(rows);
        })
      })

  //     `SELECT U.username as user, userId, CASE WHEN U.profileImage IS NULL THEN "/images/userIcon.png" ELSE U.profileImage END as getPic FROM Users U
  //   INNER JOIN (SELECT CASE
  //   WHEN F.Friend1 != ${idSQL} THEN F.Friend1
  //   WHEN F.friend2 != ${idSQL} THEN F.Friend2
  //   END as userId
  //   , F.confirmed as conf
  //   FROM Friends F
  //   WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
  //   ) as SubTable ON SubTable.userId = U.ID
  //   WHERE conf = 1
  // `

      const myDmPic = `SELECT CASE WHEN profileImage IS NULL THEN "/images/userIcon.png" ELSE profileImage END as PROFPIC FROM Users U INNER JOIN (SELECT sender USNM FROM Messages WHERE (sender = ${myID} AND reciever = ${friendID}) OR (sender = ${friendID} AND reciever = ${myID})) as SUBTAB ON SUBTAB.USNM = U.ID`

      const DmPic = await new Promise((resolve, reject) => {
        db.all(myDmPic, (err, rows) => {
          if (err) {
            return reject(err);
          }

          // const rowz2 = Object.values(rows[0]).toString();
          return resolve(rows);
        })
      })

      const myDmTime = `SELECT timeStamp TMSTP FROM Messages WHERE (sender = ${myID} AND reciever = ${friendID}) OR (sender = ${friendID} AND reciever = ${myID})`

      const DmTime = await new Promise((resolve, reject) => {
        db.all(myDmTime, (err, rows) => {
          if (err) {
            return reject(err);
          }

          // const rowz2 = Object.values(rows[0]).toString();
          return resolve(rows);
        })
      })

      const DmStringMessages = DmMessages.map(item => item.DM);
      const DmStringName = DmSenderName.map(item => item.USNM);
      const DmTimeStamp = DmTime.map(item => item.TMSTP);
      const DmProfPic = DmPic.map(item => item.PROFPIC);
      console.log(DmStringMessages)

      // res.sendStatus(200)

      res.render('partials/DmMessages', {
        // threadStringMessages,
        // threadStringSenderName,
        // idUsername,
        // threadTimeStamp
        DmStringMessages,
        idUsername,
        DmStringName,
        DmTimeStamp,
        DmProfPic
      });
    })