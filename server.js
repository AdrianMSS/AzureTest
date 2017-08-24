//Test Server

const express = require('express'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    dbServices = require('./database/basic'),
    azureServices = require('./database/azure');


const configParams = require('./config.json');
const accountSid = configParams.twilioAccount; 
const authToken = configParams.twilioToken; 


let firstDate = new Date(),
    buttonMsg = 0,
    lastAlert = 'delito',
    alarms = {1:0,2:0,3:0};
 
//require the Twilio module and create a REST client 
let client = require('twilio')(accountSid, authToken); 
let io = require('socket.io');

const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: configParams.firebaseUrl
});



let app = express();
app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(express.static(__dirname + '/webapp/webapp'));


app.get('/chat', dbServices.getChats);
app.post('/chat', dbServices.insertChat);

app.post('/new', azureServices.insertChat);
app.get('/chats', azureServices.getChats);
app.get('/today', azureServices.getToday);
app.post('/userchats', azureServices.userChats);
app.post('/citychats', azureServices.cityChats);
app.post('/parentchats', azureServices.parentChats);


app.put('/entity', azureServices.mergeEntity);

app.get('/now', azureServices.getNow);

app.get('/barrios', azureServices.getBarrios);
app.post('/signing',azureServices.signUser);

app.post('/emergency',function (req,res) {
	var topic = req.body.city;
	var body = "Alerta de tipo "+req.body.type;
	basicCall(req.body.type);

	// See the "Defining the message payload" section below for details
	// on how to define a message payload.
	var payload = {
	  notification: {
	    title: "SOS App",
	    body: body
	  }
	};

	// Send a message to devices subscribed to the provided topic.
	admin.messaging().sendToTopic(topic, payload)
	  .then(function(response) {
	    // See the MessagingTopicResponse reference documentation for the
	    // contents of response.
	    console.log("Successfully sent message:", response);
	})
	.catch(function(error) {
	    console.log("Error sending message:", error);
	});

	azureServices.newEmergency(req,res);
});

app.post('/alarm', function(req, res){
  console.log(req.body);
  if(req.body.Boton == 1){
    alarms[req.body.Id] = parseInt(req.body.Sirena);
  }
  if(alarms[req.body.Id] != undefined){
    res.send(200, {status:alarms[req.body.Id]});
  }
  else{
    res.send(400, {error:"Alarm not available"});
  }
});


app.post('/button', function(req, res){
	console.log(req.body);
	var mensaje='',
	  lat = 0,
	  long = 0;
	buttonMsg++;
	lastAlert='delito';
	if(req.body.button == 1){
	    mensaje='Alerta en la Municipalidad';
	    lat = 9.933178; 
	    long = -84.181139;
	}
	if(req.body.button == 2){
	     mensaje='Alerta en el Patacon';
	     lat=9.927796;
	     long= -84.179488
	}
        var message = {full:mensaje,path:'', msg:mensaje, user:'Boton', chat:true,type:'delito', lat:lat, long:long};
	dbServices.insertMsg(message);
	io.emit('alert', message);
	res.send(200,message);
});

app.get('/button', function(req,res){
	console.log(req.query);
	res.send(200,buttonMsg);
});

app.post('/login', dbServices.loginUser);


/*app.get('/audio', function(req, res){
	console.log(req.body);
});

app.post('/audio', function(req, res){
	console.log(req.body);
});

app.post('/location', function(req, res){
        console.log(req.body);
	res.send(200, {"usr":14});
});*/



app.get('/music', function(req,res){	
	var path = req.query.id;
	var file = 'webapp/webapp/img/uploads/'+path;
	var fs = require("fs");
	console.log(file);
	fs.exists(file,function(exists){
		if(exists)
		{
			var rstream = fs.createReadStream(file);
			rstream.pipe(res);
		}
		else
		{
			res.send("Its a 404");
			res.end();
		}
	
	});
});

app.post('/idchats', azureServices.getMsg);

app.get('*', function (req, res) {
    res.redirect(404, '../#home');
});

let server = app.listen(3000, function(){
	console.log('Server Started');
})

io = io.listen(server);

let basicCall = function(type){
    var msg = "Alerta recibida de tipo " + type;
    client.messages.create({
      to: configParams.twilioReciever,
      from:configParams.twilioSender,
      body: msg,
    }, function(err, message) {
      if (err) {
        console.log(err)
      } else {
        console.log(message.sid);
      }
    });
}

let cneCall = function(id,msg){
    var toNumber = "+50688381241";
    if(id==1)toNumber = "+50688381241";
    else if(id==2)toNumber = "+50683465862";
    else if(id==3)toNumber = "+50683206919";

    client.messages.create({
      to: toNumber,
      from:configParams.twilioSender,
      body: msg,
    }, function(err, message) {
      if (err) {
        console.log(err)
      } else {
        console.log(message.sid);
      }
    });
}



io.on('connection', function (socket) {


	socket.on('alarm', function(msg){
		msg = JSON.parse(msg);
		Object.keys(msg).forEach(function(key) {
		  alarms[key] = msg[key];
		})
		console.log(alarms);
	})

	
        socket.on('all', function(msg){
                azureServices.getAll(io);
        })


	socket.on('location', function(msg){
		msg = JSON.parse(msg);
		lastAlert=msg.type;
		basicCall(lastAlert);
		var topic = msg.city;
		var body = "Alerta de tipo "+msg.type;

		// See the "Defining the message payload" section below for details
		// on how to define a message payload.
		var payload = {
		  notification: {
		    title: "SOS App",
		    body: body
		  }
		};

		// Send a message to devices subscribed to the provided topic.
		admin.messaging().sendToTopic(topic, payload)
		  .then(function(response) {
		    // See the MessagingTopicResponse reference documentation for the
		    // contents of response.
		    console.log("Successfully sent message:", response);
		  })
		  .catch(function(error) {
		    console.log("Error sending message:", error);
		  });
		var message = {msg:msg, lat:msg.lat, long:msg.long, type:msg.type, position:msg.position, user:msg.user, city:msg.city};
		azureServices.insertLocation(message, io);
	})
	
    socket.on('msg', function(msg){
            msg = JSON.parse(msg);
            lastAlert=msg.type;
            
            io.emit('message', msg);
            io.emit('full', msg);
            azureServices.insertMsg(msg);
    })

	socket.on('cne', function(msg){
		console.log(msg);
		msg = JSON.parse(msg);
                Object.keys(msg).forEach(function(key) {
		  cneCall(key, msg[key]); 
                })

                client.messages.create({ 
    		  to: "+50683459091",  
		  from:"+13218042313",
    		  body: msg, 
		}, function(err, message) { 
		  if (err) {
        	    console.log(err)
    		  } else {
    		    console.log(message.sid);
		  }
		});
        })


	socket.on('img', function(msg){
		msg = JSON.parse(msg);
		var base64Data = msg.img.replace(/^data:image\/jpg;base64,/, ""),
			now = new Date() - firstDate,
			pathSave = 'webapp/webapp/img/uploads/'+now+'.jpg';
		console.log(pathSave);

		require("fs").writeFile(pathSave, base64Data, 'base64', function(err) {
		  console.log(err);
		});
		var pathImg = configParams.savingPath+now+'.jpg';
		var message = {msg:pathImg, path:pathSave, img:true,type:lastAlert};
		
		msg['path'] = pathImg;

		azureServices.insertImg(msg);
		//dbServices.insertMsg(message);
		io.emit('message', message);
		io.emit('full', message);
	});

	socket.on('rec', function(msg){
	  msg = JSON.parse(msg);
      let base64Data = msg.rec.replace(/^data:audio\/3gpp;base64,/, ""),
              now = new Date() - firstDate,
              pathSave = 'webapp/webapp/img/uploads/'+now+'.3gpp';

      require("fs").writeFile(pathSave, base64Data, 'base64', function(error){
        console.log(error);
      });

      let pathImg = configParams.savingPath+now+'.3gpp';
	  let message = {msg:pathImg, path:pathSave, img:true};	
	  
	  msg['path'] = pathImg;
      azureServices.insertRec(msg);
      io.emit('message', message);
      io.emit('full', message); 
    });

	socket.on('users', function(msg){
            azureServices.getUser(msg,io);
    })

	/*socket.on('user', function(msg){
		let mensaje = msg.msg,
			user = msg.user,
			type = msg.type;
		lastAlert=type;
		var message = {full:msg,path:'', msg:mensaje, user:user, chat:true, type:type};
		dbServices.insertMsg(message);
		io.emit('message', message);
		io.emit('full', message);
	})

	socket.on('officer', function(msg){
		var message = {full:msg,path:'', msg:msg, user:'Officer', chat:true};
		dbServices.insertMsg(message);
		io.emit('message', message);
		io.emit('full', message);
	})*/

})

