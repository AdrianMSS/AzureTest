//Test Server

//Dependencies
const express = require('express'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    dbServices = require('./database/basic'),
    azureServices = require('./database/azure'), 
    configParams = require('./config.json'),
    accountSid = configParams.twilioAccount,
    authToken = configParams.twilioToken,
    fs = require("fs"),
    multer = require('multer');

let firstDate = new Date(),
    buttonMsg = 0,
    lastAlert = 'delito',
    alarms = {1:0,2:0,3:0};
 
//require the Twilio module and create a REST client 
let client = require('twilio')(accountSid, authToken); 
let io = require('socket.io');


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
	basicCall(req.body.type);

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
	let mensaje='',
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
        let message = {full:mensaje,path:'', msg:mensaje, user:'Boton', chat:true,type:'delito', lat:lat, long:long};
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
});*/


var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './admin/uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});
var upload = multer({ storage : storage}).single('userPhoto');

app.post('/image', function(req, res){
    console.log(req.body);
    upload(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        var filePath = 'img/uploads/'+req.file.originalname;
        console.log(filePath);
        //dbPersonal.newImg(filePath);
        res.send(200,{file:filePath});
    });
});



app.get('/music', function(req,res){	
	const path = req.query.id;
	const file = configParams.appPath+path;
	console.log(file);
	fs.exists(file,function(exists){
		if(exists)
		{
			let rstream = fs.createReadStream(file);
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
    let msg = "Alerta recibida de tipo " + type;
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
    let toNumber = "+50688381241";
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
		let topic = msg.city;
		let body = "Alerta de tipo "+msg.type;

		// See the "Defining the message payload" section below for details
		// on how to define a message payload.
		let payload = {
		  notification: {
		    title: "SOS App",
		    body: body
		  }
		};

		let message = {msg:msg, lat:msg.lat, long:msg.long, type:msg.type, position:msg.position, user:msg.user, city:msg.city};
		azureServices.insertLocation(message, io);
	})
	
    socket.on('msg', function(msg){
    	try{
    		console.log(msg);
            msg = JSON.parse(msg);
            lastAlert=msg.type;
            
            io.emit('message', msg);
            io.emit('full', msg);
            azureServices.insertMsg(msg);
        }
        catch(e){
        	console.log(e);
        }
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
		console.log(msg);
		let base64Data = msg.img.replace(/^data:image\/jpg;base64,/, ""),
			now = new Date() - firstDate,
			pathSave = configParams.appPath+now+'.jpg';
		console.log(pathSave);

		require("fs").writeFile(pathSave, base64Data, 'base64', function(err) {
		  console.log(err);
		});
		let pathImg = configParams.savingPath+now+'.jpg';
		let message = {msg:pathImg, path:pathSave, img:true,type:lastAlert, type:'img'};
		
		msg['path'] = pathImg;

		azureServices.insertImg(msg);
		//dbServices.insertMsg(message);
		io.emit('message', message);
		io.emit('full', message);
	});

	socket.on('rec', function(msg){
		console.log("new rec");
    	try{
    		console.log(msg);
		  msg = JSON.parse(msg);
	      let base64Data = msg.rec.replace(/^data:audio\/mp3;base64,/, ""),
	              now = new Date() - firstDate,
	              pathSave = configParams.appPath+now+'.mp3';

	      require("fs").writeFile(pathSave, base64Data, 'base64', function(error){
	        console.log(error);
	      });

	      let pathImg = configParams.savingPath+now+'.mp3';
		  let message = {msg:pathImg, path:pathSave, img:true, type:'rec'};	
		  
		  msg['path'] = pathImg;
	      azureServices.insertRec(msg);
	      io.emit('message', message);
	      io.emit('full', message); 
	    }
	    catch(e){
	    	console.log(e);
	    }
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

