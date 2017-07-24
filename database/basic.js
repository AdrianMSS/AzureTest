/**
* @description REST Api for the A team
* @author Adrián Sánchez <contact@imaginexyz.com>
*/

var mongo = require('mongodb');


// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.  
var uristring = 
  process.env.MONGODB_URI || 
  process.env.MONGOHQ_URL || 
  process.env.MONGOLAB_URI||
  'mongodb://localhost/SOS';

var db;

mongo.MongoClient.connect(uristring, function(err, database) {
    if(!err) {
        db = database;
        console.log('Connected to the "SOS" database');
    }
    else{
        console.log(404, 'Error Connecting to the "SOS" database');
    }
});

Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}

exports.insertUser = function(req, res) {
  var resource = req.body;
  db.collection('Ids').findAndModify({_id:1},{},{$inc:{users:1}},function(err, doc_ids) {
    if(err) {throw err;res.send(400, err);}
    else{
      resource["_id"] = doc_ids.value.users;
      db.collection('Users').insert(resource, function(error, doc_project){
          if(error) {throw error;res.send(400, error);};
          res.send(200, resource);
      })
    }
  });
};



exports.loginUser = function(req, res) {
  console.log(req.body);
  var resource = req.body;
  if(resource.email === undefined || resource.pass === undefined){
    res.send(400, false);
  }
  else{
    res.send(200, resource);
  }
};

exports.insertGrades = function(req, res) {
  console.log(req.body);
  var userId = req.body.user._id;
  var grades = req.body.grades;
  db.collection('Users').findAndModify({_id:userId},{},{$inc:{sent:1}, $set:{grades:grades}},function(err, doc) {
      if(err) {throw err;res.send(400, err);}
      else if(doc.value.sent>0){res.send(403, {'error':'Multiple Calificación'});}
      else{
        db.collection('Ids').findAndModify({_id:1},{},{$inc:{grades:1}},function(err_ids, doc_ids) {
            console.log(doc.value);
            if(err_ids) {throw err_ids;res.send(400, err_ids);}
            else{
              grades['_id'] = doc_ids.value.grades;
              db.collection('Grades').insert(grades, function(error, doc_grades){
                  if(error) {throw error;res.send(400, error);};
                  res.send(200, grades);
              })
            }
        });
      }
  });
}

exports.getChats = function(req, res) {
  var now = new Date().addHours(-6),
    nowString = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getUTCFullYear();
  db.collection('Chats').findOne({day:nowString}, function(err, doc) {
      if(err) {throw err;res.send(400, err);}
      else{
        res.send(200, doc);
      }
  });
}

exports.insertChat = function(req, res) {
  console.log(req.body);
  var chat = req.body,
    now = new Date().addHours(-6),
    nowString = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getUTCFullYear();
  chat['date'] = now;
  db.collection('Chats').findAndModify({day:nowString},{},{$push:{messages:chat}},{upsert: true},function(err, doc) {
      if(err) {throw err;res.send(400, err);}
      else{
        res.send(200, chat);
      }
  });
}

exports.insertMsg = function(chat) {
  console.log(chat);
  var now = new Date().addHours(-6),
    nowString = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getUTCFullYear();
  chat['date'] = now;
  db.collection('Chats').findAndModify({day:nowString},{},{$push:{messages:chat}},{upsert: true},function(err, doc) {
      if(err) {throw err;}
      else{
        console.log('Added');
      }
  });
}
