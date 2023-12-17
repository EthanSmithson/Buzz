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

//const validate = require('validate.js');
const { check, validationResult } = require('express-validator');
const { async } = require('validate.js');
const { hash } = require('bcrypt');

const express = require("express"),
  app = express();

app.use(express.json());
app.use(cookieParser());

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
  res.render('messages', {
    idUsername
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


  const friendExists = 'SELECT Friend2 as listID FROM Friends WHERE Friend1 = ?'
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
    db.all(friendExists, [idSQL2], (err, rows) => {
      if (err) {
        return reject(err);
      }

      const row6 = rows;
      return resolve(row6);
    })
  })

  console.log(idSQL2);
  console.log(idList);
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

  const postSQL2 = `SELECT P.ID, comment as cmt, P.userId as postIdNum, U.username as curUsnm
  FROM Post P
  INNER JOIN(
    SELECT CASE
        WHEN F.Friend1 != ${idSQL} THEN F.Friend1
        WHEN F.friend2 != ${idSQL} THEN F.Friend2
        END as userId
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}
    UNION ALL
    SELECT ${idSQL}) SubTable ON SubTable.userId = P.userId
    INNER JOIN Users U ON U.ID = P.userId
    
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

  const friendsList = `SELECT U.username as user FROM Users U
    INNER JOIN (SELECT CASE
    WHEN F.Friend1 != ${idSQL} THEN F.Friend1
    WHEN F.friend2 != ${idSQL} THEN F.Friend2
    END as userId
    FROM Friends F
    WHERE F.Friend1 = ${idSQL} OR F.Friend2 = ${idSQL}) as SubTable ON SubTable.userId = U.ID
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


  res.render('index', {
    renPosts,
    idUsername,
    friendName
  });
 });

 app.get('/landing', (req, res) => {
  res.render('landing');
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

app.listen(8080, function () {
  console.log("Server is running on port 8080 ");
});

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
      res.redirect(301, '/signup');

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

app.post('/userPost', urlEncodedParser, async (req, res) => {
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

    db.run('INSERT INTO Post(comment, userId, creationDtTm) VALUES(?, ?, ?)', [req.body.createNewPost, idSQL, Date.now()], function(err) {
      if (err) {
        return console.log(err.message);
      }
  })

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

    const friendUpdate = 'INSERT INTO Friends(Friend1, Friend2) VALUES(?, ?)'

    db.all(friendUpdate, [idSQL2, Id], (err, rows) => {
      if (err) {
        return (err);
      }
    })

    res.sendStatus(200);
  }

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