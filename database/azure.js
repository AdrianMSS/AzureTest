var azure = require('azure-storage'),
  name = 'imaginexyzstorage',
  chatId = 1,
  firstDate = new Date(),
  key = '9L7x4RKyjNuxDWbrMFyWy9HxqiuIhSuvfQZcBZ9Wu/29HbHOey60CtYCPb+g6aIMjALN8Bd5AzJIfgDxKA4Huw==';

var todayChats = [];
var tableSvc = azure.createTableService(name,key);

Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}

/*
tableSvc.createTableIfNotExists('chatsTable', function(error, result, response){
  if(!error){
    console.log(response);
    console.log(result);
    // Table exists or created
  }
  else{console.log(error);}
});
*/


var queryId = new azure.TableQuery()
  .select('RowKey');

tableSvc.queryEntities('chatsTable',queryId, null, function(error, result, response) {
  if(!error) {
    result.entries.forEach(function(element, index){
      console.log(element);
      var newId = (parseInt(element.RowKey._)+1 || 0);
      chatId = Math.max(chatId, newId);    
    });
    console.log(chatId);
  }
  else{
    console.log(error)
  }
});

exports.getChats = function(req, res) {
  var query = new azure.TableQuery();

  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
    if(!error) {
      res.send(200, result.entries);
    }
    else{
      res.send(400, error);
    }
  });

};

exports.getBarrios = function(req, res) {
  var query = new azure.TableQuery();

  tableSvc.queryEntities('barriosTable',query, null, function(error, result, response){
    if(!error) {
      console.log(result.entries[0].Barrio);
      res.send(200, {"result":result.entries});
    }
    else{
      res.send(400, error);
    }
  });

};

exports.getToday = function(req, res) {
  var today = new Date().addHours(-6),
   chatDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

  var query = new azure.TableQuery()
    .where('PartitionKey eq ?', chatDate);


  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
    if(!error) {
      res.send(200, result.entries);
    }
    else{
      res.send(400, error);
    }
  });
  
};


exports.signUser = function(req, res) {
  var query = new azure.TableQuery()
    .where('identificator eq ?', [req.body.identificator] );

  tableSvc.queryEntities('usersTable',query, null, function(error, result, response){
    if(!error) {
      if(result.entries.length != 0){
      	if(result.entries[0].code._ == req.body.code){
      	  var today = new Date().addHours(-6),
      	     updatedTask = {
      	    PartitionKey: {'_':'1'},
          	    RowKey: {'_': result.entries[0].RowKey._},
          	    name: {'_':req.body.name},
          	    identificator: {'_':req.body.identificator},
      	    phone: {'_':req.body.phone},
      	    email: {'_':req.body.email},
      	    code: {'_':req.body.code},
      	    barrio: {'_':req.body.barrio},
      	    signed: {'_':true},
      	    dueDate: {'_':today, '$':'Edm.DateTime'}
        	  };
      	  tableSvc.replaceEntity('usersTable',updatedTask, function(error2, result2, response2){
      	    if(!error2) {
                    res.send(200, result.entries[0].RowKey._);
      	    }
      	  });
      	}
      	else{
      	  console.log("Código Erroneo");
      	  res.send(400,"Código Erroneo");
      	}
      }
      else{
        console.log("Ninguno");
        console.log(result.entries);
        res.send(400,"Usuario no encontrado");
      }
    }
    else{
      res.send(400, error);
    }
  });

};

exports.getNow = function(req, res) {
  var now = new Date() - firstDate;
  console.log(now);
  res.send(200, {now:now});
};

exports.insertChat = function(req, res) {
  var today = new Date().addHours(-6),
   chatDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate(),
   newId = ''+chatId;
  var chat = {
    PartitionKey: {'_':chatDate},
    RowKey: {'_': newId},
    user: {'_':req.body.user},
    msg: {'_':req.body.msg},
    type:{'_':req.body.type},
    lat:{'_':req.body.lat},
    long:{'_':req.body.long},
    position:{'_':req.body.position},
    today: {'_':today},
    dueDate: {'_':today, '$':'Edm.DateTime'}
  };
  chatId++;
  tableSvc.insertEntity('chatsTable',chat, function (error, result, response) {
    if(!error){
      console.log(result);
      // Entity inserted
      res.send(200, response);
    }
    else{
      res.send(400,error);
    }
  });
};

exports.insertImg = function(msg){
  var today = new Date().addHours(-6),
   chatDate = msg.parent || (today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()),
   newId = msg.id || chatId,
   newChat = ''+chatId;
  newId = ''+newId;

  var chat = {
    PartitionKey: {'_':chatDate},
    RowKey: {'_': newChat},
    user: {'_':msg.user},
    msg: {'_':msg.path},
    id: {'_':newId},
    type:{'_':'img'},
    lat:{'_':msg.lat},
    long:{'_':msg.long},
    position:{'_':msg.position},
    status:{'_':1},
    city:{'_':msg.city},
    first:{'_':false},
    img:{'_':true},
    path:{'_':msg.path},
    today: {'_':today},
    dueDate: {'_':today, '$':'Edm.DateTime'}
  };
  

  chatId++;
  tableSvc.insertEntity('chatsTable',chat, function (error3, result3, response3) {
    if(!error3){
      var chat2 = {
        PartitionKey: {'_':chatDate},
        RowKey: {'_': newId},
        img:{'_':true},
        path:{'_':msg.path},
      };

      var query = new azure.TableQuery()
        .where('PartitionKey eq ?', [chatDate] ).and('RowKey eq ?', newId);

      tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
        if(!error) {
          if(result.entries.length != 0){
            var nowCount = 1;
            if(result.entries[0].count) nowCount = result.entries[0].count._;
            nowCount++;
            chat2['count'] = {'_':nowCount};
            tableSvc.mergeEntity('chatsTable',chat2, function(error2, result2, response2){
              if(!error2) {
              }
              else{
                console.log(error2);
              }
            });
          }
        }
      });
    }
    else{
      console.log(error3);
    }
  });
}

exports.insertRec = function(msg){
  var today = new Date().addHours(-6),
   chatDate = msg.parent || (today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()),
   newId = msg.id || chatId,
   newChat = ''+chatId;
  newId = ''+newId;
  
  var chat = {
    PartitionKey: {'_':chatDate},
    RowKey: {'_': newChat},
    user: {'_':msg.user},
    msg: {'_':msg.path},
    id: {'_':newId},
    type:{'_':'rec'},
    lat:{'_':msg.lat},
    long:{'_':msg.long},
    position:{'_':msg.position},
    status:{'_':1},
    city:{'_':msg.city},
    first:{'_':false},
    today: {'_':today},
    dueDate: {'_':today, '$':'Edm.DateTime'}
  };

   chatId++;
  tableSvc.insertEntity('chatsTable',chat, function (error3, result3, response3) {
    if(!error3){
      var chat2 = {
        PartitionKey: {'_':chatDate},
        RowKey: {'_': newId}
      };

      var query = new azure.TableQuery()
        .where('PartitionKey eq ?', [chatDate] ).and('RowKey eq ?', newId);

      tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
        if(!error) {
          if(result.entries.length != 0){
            var nowCount = 1;
            if(result.entries[0].count) nowCount = result.entries[0].count._;
            nowCount++;
            chat2['count'] = {'_':nowCount};
            tableSvc.mergeEntity('chatsTable',chat2, function(error2, result2, response2){
              if(!error2) {
              }
              else{
                console.log(error2);
              }
            });
          }
        }
      });
    }
    else{
      console.log(error3);
    }
  });
}

exports.insertLocation = function(msg, io){
  var today = new Date().addHours(-6),
   chatDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate(),
   newId = msg.id || chatId;
  msg.id = parseInt(newId);
  msg['parent'] = chatDate;
  newId = ''+newId;
  io.emit('alert', msg);
  
  var chat = {
    PartitionKey: {'_':chatDate},
    RowKey: {'_': newId},
    id: {'_':newId},
    user: {'_':msg.user},
    msg: {'_':"Alerta Inicial"},
    type:{'_':msg.type},
    lat:{'_':msg.lat},
    long:{'_':msg.long},
    position:{'_':msg.position},
    city:{'_':msg.city},
    status:{'_':1},
    first:{'_':true},
    count:{'_':1},
    img:{'_':false},
    today: {'_':today},
    dueDate: {'_':today, '$':'Edm.DateTime'}
  };

  chatId++;
  tableSvc.insertEntity('chatsTable',chat, function (error, result, response) {
    if(!error){
      console.log(result);
    }
    else{
      console.log(error);
    }
  });
}

exports.newEmergency = function(req, res){
  var msg = req.body;
  var today = new Date().addHours(-6),
   chatDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate(),
   newId = msg.id || chatId;
  msg.id = parseInt(newId);
  msg['parent'] = chatDate;
  newId = ''+newId;
  res.send(200, msg);
  
  var chat = {
    PartitionKey: {'_':chatDate},
    RowKey: {'_': newId},
    id: {'_':newId},
    user: {'_':msg.user},
    msg: {'_':"Alerta Inicial"},
    type:{'_':msg.type},
    lat:{'_':msg.lat},
    long:{'_':msg.long},
    position:{'_':msg.position},
    city:{'_':msg.city},
    status:{'_':1},
    first:{'_':true},
    count:{'_':1},
    img:{'_':false},
    today: {'_':today},
    dueDate: {'_':today, '$':'Edm.DateTime'}
  };

  chatId++;
  tableSvc.insertEntity('chatsTable',chat, function (error, result, response) {
    if(!error){
      console.log(result);
    }
    else{
      console.log(error);
    }
  });
}

exports.insertMsg = function(msg){
  console.log(msg.parent);
  var today = new Date().addHours(-6),
   chatDate = msg.parent || (today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()),
   newId = msg.id || chatId,
   newChat = ''+chatId;
  newId = ''+newId;

  var chat = {
    PartitionKey: {'_':chatDate},
    RowKey: {'_': newChat},
    user: {'_':msg.user},
    msg: {'_':msg.msg},
    id: {'_':newId},
    type:{'_':msg.type},
    lat:{'_':msg.lat},
    long:{'_':msg.long},
    position:{'_':msg.position},
    status:{'_':1},
    first:{'_':false},
    city:{'_':msg.city},
    today: {'_':today},
    dueDate: {'_':today, '$':'Edm.DateTime'}
  };

  chatId++;
  tableSvc.insertEntity('chatsTable',chat, function (error3, result3, response3) {
    if(!error3){
      var chat2 = {
        PartitionKey: {'_':chatDate},
        RowKey: {'_': newId},
        msg: {'_':msg.msg}
      };

      var query = new azure.TableQuery()
        .where('PartitionKey eq ?', [chatDate] ).and('RowKey eq ?', newId);

      tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
        if(!error) {
          if(result.entries.length != 0){
            var nowCount = 1;
            if(result.entries[0].count) nowCount = result.entries[0].count._;
            nowCount++;
            chat2['count'] = {'_':nowCount};
            tableSvc.mergeEntity('chatsTable',chat2, function(error2, result2, response2){
              if(!error2) {
              }
              else{
                console.log(error2);
              }
            });
          }
        }
      });
    }
    else{
      console.log(error3);
    }
  });
}

exports.userChats = function(req,res){
  var query = new azure.TableQuery()
    .where('user eq ?', parseInt(req.body.user)).and('first eq ?', true);

  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){

    if(!error) {
      var amount = response.body.value.length;
        var msg = {};
        var reverseChats = response.body.value.reverse();
        reverseChats.forEach(function(element, index){
          var newChat = "Alerta";
          var hasImg = false;
          if(!element.first)newChat=element.msg.substr(0,15);
          if(element.img) hasImg=true;
          if(element.today){}
          else{
            element.today = element.Timestamp;
          }
          var newDate = element.today.split('T')[0].split('-');
          var filterDate = newDate[2]+'-'+newDate[1]+'-'+newDate[0];
          msg[index] = {PartitionKey:element.PartitionKey, RowKey:element.RowKey, type:element.type, msg:newChat, status:element.status, city:element.city, lat:element.lat,long:element.long,path:element.path, img:hasImg, msg:element.msg, count:element.count, date:filterDate};
        });
        res.send(200,{"chats":msg});
    }
        else{
      res.send(400, error);
    }
  });
};

exports.cityChats = function(req,res){
  var query = new azure.TableQuery()
    .where('city eq ?', req.body.city).and('first eq ?', true);

  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){

    if(!error) {
      var amount = response.body.value.length;
        var msg = {};
        var reverseChats = response.body.value.reverse();
        reverseChats.forEach(function(element, index){
          var newChat = "Alerta";
          var hasImg = false;
          if(!element.first)newChat=element.msg.substr(0,15);
          if(element.img) hasImg=true;
          if(element.today){}
          else{
            element.today = element.Timestamp;
          }
          var newDate = element.today.split('T')[0].split('-');
          var filterDate = newDate[2]+'-'+newDate[1]+'-'+newDate[0];
          msg[index] = {PartitionKey:element.PartitionKey, RowKey:element.RowKey, type:element.type, msg:newChat, status:element.status, city:element.city, lat:element.lat,long:element.long,path:element.path, img:hasImg, msg:element.msg, count:element.count, date:filterDate};
        });
        res.send(200,{"chats":msg});
    }
        else{
      res.send(400, error);
    }
  });
};

exports.parentChats = function(req,res){
  console.log(parseInt(req.body.id));
  var query = new azure.TableQuery()
    .where('id eq ?', req.body.id);

  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
    console.log(response.body);
    if(!error) {
      var amount = response.body.value.length;
        var msg = {},
        long = -84.179653,
        lat = 9.927748;
        //var reverseChats = response.body.value.reverse();
        response.body.value.forEach(function(element, index){
          var newChat = "Alerta";
          var hasImg = false;
          if(element.today){}
          else{
            element.today = element.Timestamp;
          }
          var newDate = element.today.split('T')[0].split('-');
          var filterDate = newDate[2]+'-'+newDate[1]+'-'+newDate[0];
          //if(!element.first)newChat=element.msg.substr(0,15);
          if(element.img) hasImg=true;
          if(element.type == "rec"){
            element.msg = element.msg.split('/uploads/')[1];
          }
          msg[index] = {PartitionKey:element.PartitionKey, RowKey:element.RowKey, type:element.type, msg:newChat, status:element.status, city:element.city, lat:element.lat,long:element.long,path:element.path, img:hasImg, msg:element.msg, count:element.count, date:filterDate};
          if(! isNaN(element.long)) long = element.long;
          if(! isNaN(element.lat)) lat = element.lat;
        });
        //console.log(long);
        res.send(200,{"chats":msg, "long":long, "lat":lat});
    }
        else{
      res.send(400, error);
    }
  });
};

exports.getMsg = function(req,res){
  console.log(req.body);
  var query = new azure.TableQuery()
    .where('id eq ?', req.body.id);

  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){

    if(!error) {
      var amount = response.body.value.length;
        var msg = {};
        var reverseChats = response.body.value.reverse();
        reverseChats.forEach(function(element, index){
          var newChat = "Alerta";
          var hasImg = false;
          if(!element.first)newChat=element.msg.substr(0,15);
          if(element.img) hasImg=true;
          msg[index] = {PartitionKey:element.PartitionKey, RowKey:element.RowKey, type:element.type, msg:newChat, status:element.status, city:element.city, lat:element.lat,long:element.long,path:element.path, img:hasImg, msg:element.msg, count:element.count}
        });
        console.log(msg);
        res.send(200,{"chats":msg});
    }
        else{
      res.send(400, error);
    }
  });
};


exports.getUser = function(id,io) {

  var query = new azure.TableQuery()
    .where('user eq ?', parseInt(id));

  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
    if(!error) {
    	
    	var amount = response.body.value.length;
    	var msg = {user:id,amount:amount};
      response.body.value.forEach(function(element, index){
  		  var newChat = "Alerta";
  		  if(element.msg != undefined)newChat=element.msg.substr(0,15);
        msg[index] = {PartitionKey:element.PartitionKey, type:element.type, msg:newChat, status:element.status, city:element.city}
      });
      console.log(msg);
      io.emit("chats",msg);
    }
  	else{
      res.send(400, error);
    }
  });
};

exports.getAll2 = function(io) {
	var amount = todayChats.length;
        var msg = {amount:amount};
        todayChats.forEach(function(element, index){
                var newChat = "Alerta";
                if(element.msg != undefined)newChat=element.msg.substr(0,15);
                else{element.msg = "Alerta"}
                if(element.type=="rec")element.msg = element.msg.split('uploads/')[1];
                msg[index] = {PartitionKey:element.PartitionKey, type:element.type, msg:newChat, all:element.msg, status:element.status, city:element.city, lat:element.lat, long:element.long}
        });
        console.log(msg);
}

exports.getAll = function(io) {
 var today = new Date().addHours(-6),
   chatDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

  var query = new azure.TableQuery()
    .where('PartitionKey eq ?', chatDate);
  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
    if(!error) {

        var amount = response.body.value.length;
        var msg = {amount:amount};
        response.body.value.forEach(function(element, index){
                var newChat = "Alerta";
                if(element.msg != undefined)newChat=element.msg.substr(0,15);
		else{element.msg = "Alerta"}
		if(element.type=="rec")element.msg = element.msg.split('uploads/')[1];
                msg[index] = {PartitionKey:element.PartitionKey, type:element.type, msg:newChat, all:element.msg, status:element.status, city:element.city, lat:element.lat, long:element.long}


        });
        console.log(msg);
        io.emit("get",msg);
    }
        else{
      res.send(400, error);
    }
  });
};

exports.mergeEntity = function(req,res) {
  var today = new Date().addHours(-6);
  var chat = {
    PartitionKey: {'_':req.body.PartitionKey},
    RowKey: {'_': req.body.RowKey},
    msg: {'_':req.body.msg},
    dueDate: {'_':today, '$':'Edm.DateTime'}
  };

  var query = new azure.TableQuery()
    .where('PartitionKey eq ?', [req.body.PartitionKey] ).and('RowKey eq ?', req.body.RowKey);

  tableSvc.queryEntities('chatsTable',query, null, function(error, result, response){
    if(!error) {
      if(result.entries.length != 0){
        var nowCount = 1;
        if(result.entries[0].count) nowCount = result.entries[0].count._;
        nowCount++;
        chat['count'] = {'_':nowCount};
        tableSvc.mergeEntity('chatsTable',chat, function(error2, result2, response2){
          if(!error2) {
            //console.log(result2);
            res.send(200, result2);
          }
          else{
            console.log(error2);
            res.send(400,error2);
          }
        });
      }
    }
  });
}