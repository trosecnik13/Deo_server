//socket.send(msg);
//sweg2

const WebSocket = require('ws');
const Database = require("easy-json-database");
const rp = require("request-promise");
/*const removeValue = require('remove-value');
Array.prototype.remove = removeValue;*/

const db_users = new Database("/root/Demeter/db/users.json", {});
const db_varny = new Database("/root/Demeter/db/varny.json", {});
const db_config = new Database("/root/Demeter/db/config.json", {});

const port = 6988

const server = new WebSocket.Server({
  port: port
});

console.log(`\x1b[33mServer running on port ${port}\x1b[0m`)


let sockets = [];

server.on('connection', function(socket) {
  sockets.push(socket);
  console.log("client connected");

  // When you receive a message, send that message to every socket.
  socket.on('message', function(msg) {

    var msg = msg.toString();
    console.log("Received message: " + msg);

    var prefix = msg.split("$")[0]
    var username = msg.split("$")[1]
    var password = msg.split("$")[2]

    if (msg.startsWith("loadinterior") && Auth(username, password)) { 
      var idVarny = msg.split("$")[3]

      var pocet_tablu = db_config.get(`varny.varna${idVarny}`)
      console.log("pocet_tablu: " + pocet_tablu)

      var answer = "loadinterior$"

      for (var i=1; i<=pocet_tablu; i++) {
        answer = answer + db_varny.get(`${username}.varna${idVarny}.table${i}.type`) + "$" + db_varny.get(`${username}.varna${idVarny}.table${i}.stop`) + "$"
      }

      console.log(answer)
      socket.send(answer)
    }
    else if (msg.startsWith("weedstart") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) < getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "weed" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === true) {
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.start`, getTimestamp())
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, getTimestamp()+10)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.harvested`, false)

        console.log(`weedstart$${getTimestamp()+10}`)
        socket.send(`weedstart$${getTimestamp()+10}`)
      }
      else {
        console.log("error 0x02")
        socket.send("error 0x02")
      }

    }
    else if (msg.startsWith("weedharvest") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === false && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) < getTimestamp()) {
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.harvested`, true)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, 0)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.start`, 0)

        var sklizeno = between(40,50)

        db_users.set(`${username}.inventory.weed`, db_users.get(`${username}.inventory.weed`)+sklizeno)

        console.log(`weedharvest$${sklizeno}`)
        socket.send(`weedharvest$${sklizeno}`)
      }
      else {
        console.log("error 0x03")
        socket.send("error 0x03")
      }
    }
    else if (msg.startsWith("loadmap") && Auth(username, password)) {
        console.log(`loadmap$${checkUnlockedHood(db_users.get(`${username}.respect`))}$${db_users.get(`${username}.money`)}$${db_users.get(`${username}.respect`)}`)
        socket.send(`loadmap$${checkUnlockedHood(db_users.get(`${username}.respect`))}$${db_users.get(`${username}.money`)}$${db_users.get(`${username}.respect`)}`)
    }
    else if (msg.startsWith("inventory") && Auth(username, password)) {
      console.log("inventory$" + db_users.get(`${username}.inventory.weed`) + "$" + db_users.get(`${username}.inventory.meth`) + "$" + db_users.get(`${username}.inventory.heroine`))
      socket.send("inventory$" + db_users.get(`${username}.inventory.weed`) + "$" + db_users.get(`${username}.inventory.meth`) + "$" + db_users.get(`${username}.inventory.heroine`))
    }
    else {
      console.log("Current timestamp: " + getTimestamp())
      console.log("Message sended: error 0x01")
      socket.send("error 0x01");
    }


  });

  // When a socket closes, or disconnects, remove it from the array.
  socket.on('close', function() {
    sockets = sockets.filter(s => s !== socket);
    console.log("client disconnected")
  });

 /* socket.on('open', function open() {
    sockets.forEach(s => s.send(msg));
  });*/
});


function getTimestamp() {
  return Math.floor(Date.now()/1000) 
}


function Auth(username, password) {
  try {
    if (password.length === 10 && db_users.get(`${username}.password`).startsWith(password)) {
      console.log(`\x1b[32mAuth successful\x1b[0m`)
      return true;
    }
    else {
      console.log(`\x1b[31mAuth failed\x1b[0m`)
      return false;
    }
  }
  catch {
    console.log(`\x1b[31mAuth failed\x1b[0m`)
    return false;
  }
}

function between(min, max) {  
  return Math.floor(
    Math.random() * (max - min) + min
  )
}


function checkUnlockedHood(respekt) {
  if (respekt > 0 && respekt < 50) {
    return 1
  }
  else if (respekt >= 50 && respekt < 200) {
    return 2
  }
  else if (respekt >= 200 && respekt < 1000) {
    return 3
  }
  else if (respekt >= 1000 && respekt < 5000) {
    return 4
  }
  else if (respekt >= 5000 && respekt < 20000) {
    return 5
  }
  else if (respekt >= 20000 && respekt < 100000) {
    return 6
  }
  else if (respekt >= 100000 && respekt < 500000) {
    return 7
  }
  else if (respekt >= 500000 && respekt < 2000000) {
    return 8
  }
  else if (respekt >= 2000000 && respekt < 10000000) {
    return 9
  }
  else if (respekt >= 10000000 && respekt < 50000000) {
    return 10
  }
  else if (respekt >= 50000000 && respekt < 200000000) {
    return 11
  }
  else if (respekt >= 200000000 && respekt < 1000000000) {
    return 12
  }
  else if (respekt >= 1000000000) {
    return 13
  }
}