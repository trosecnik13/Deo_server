//socket.send(msg);
//sweg2

const WebSocket = require('ws');
const Database = require("easy-json-database");
const rp = require("request-promise");
/*const removeValue = require('remove-value');
Array.prototype.remove = removeValue;*/

const db_users = new Database("/Demeter/db/users.json", {});
const db_varny = new Database("/Demeter/db/varny.json", {});
const db_config = new Database("/Demeter/db/config.json", {});
const db_hoods = new Database("/Demeter/db/hoods.json", {});

const port = 6988

const server = new WebSocket.Server({
  port: port
});

console.log(`\x1b[33mServer running on port ${port}\x1b[0m`)

setInterval(checkMidnight, 1000);

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

      if (db_varny.get(`${username}.varna${idVarny}`) === undefined) {
        console.log("swag")
      }
      else {
        for (var i=1; i<=pocet_tablu; i++) {
          answer = answer + db_varny.get(`${username}.varna${idVarny}.table${i}.type`) + "$" + db_varny.get(`${username}.varna${idVarny}.table${i}.stop`) + "$"
        }
      }

      console.log(answer)
      socket.send(answer)
    }
    else if (msg.startsWith("weedstart") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) < getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "weed" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === true && db_users.get(`${username}.inventory.seminka`) > 0) {
        db_users.set(`${username}.inventory.seminka`, db_users.get(`${username}.inventory.seminka`)-1)

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

        if (db_users.get(`${username}.inventory.hnuj`) === 1) {
          sklizeno = parseInt((sklizeno * 1.25).toFixed(0))
        }
        else if (db_users.get(`${username}.inventory.hnuj`) === 2) {
          sklizeno = parseInt((sklizeno * 1.5).toFixed(0))
        }
        else if (db_users.get(`${username}.inventory.hnuj`) === 3) {
          sklizeno = parseInt((sklizeno * 1.75).toFixed(0))
        }
        
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
      console.log("inventory$" + db_users.get(`${username}.inventory.weed`) + "$" + db_users.get(`${username}.inventory.meth`) + "$" + db_users.get(`${username}.inventory.heroin`) + "$" + db_users.get(`${username}.inventory.seminka`) + "$" + db_users.get(`${username}.inventory.hnuj`) + "$" + db_users.get(`${username}.inventory.varna`) + "$" + db_users.get(`${username}.inventory.aceton`) + "$" + db_users.get(`${username}.inventory.hydroxid`) + "$" + db_users.get(`${username}.inventory.chlorovodikova`) + "$" + db_users.get(`${username}.inventory.ether`) + "$" + db_users.get(`${username}.inventory.efedrin`) + "$" + db_users.get(`${username}.inventory.varic`) + "$" + db_users.get(`${username}.inventory.chloroform`) + "$" + db_users.get(`${username}.inventory.uhlicitan`) + "$" + db_users.get(`${username}.inventory.aktivniuhli`) + "$" + db_users.get(`${username}.inventory.alkohol`))
      socket.send("inventory$" + db_users.get(`${username}.inventory.weed`) + "$" + db_users.get(`${username}.inventory.meth`) + "$" + db_users.get(`${username}.inventory.heroin`) + "$" + db_users.get(`${username}.inventory.seminka`) + "$" + db_users.get(`${username}.inventory.hnuj`) + "$" + db_users.get(`${username}.inventory.varna`) + "$" + db_users.get(`${username}.inventory.aceton`) + "$" + db_users.get(`${username}.inventory.hydroxid`) + "$" + db_users.get(`${username}.inventory.chlorovodikova`) + "$" + db_users.get(`${username}.inventory.ether`) + "$" + db_users.get(`${username}.inventory.efedrin`) + "$" + db_users.get(`${username}.inventory.varic`) + "$" + db_users.get(`${username}.inventory.chloroform`) + "$" + db_users.get(`${username}.inventory.uhlicitan`) + "$" + db_users.get(`${username}.inventory.aktivniuhli`) + "$" + db_users.get(`${username}.inventory.alkohol`))
    }
    else if (msg.startsWith("buy") && Auth(username, password)) {
      var zbozi_id = msg.split("$")[3]
      if (Buy(zbozi_id, username) === true) {
        console.log("successful")
        socket.send("successful")
      }
      else {
        console.log("error 0x03")
        socket.send("error 0x03")
      }
    }
    else if (msg.startsWith("changetable") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]
      var drug = msg.split("$")[5]

      if (db_varny.get(`${username}.varna${idVarny}`) !== undefined && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === true) {
        if (drug === "weed") {
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.type`, "weed")
          
          console.log("successful")
          socket.send("successful")
        }
        else if (drug === "meth" && db_users.get(`${username}.inventory.varna`) > 0) {
          db_users.set(`${username}.inventory.varna`, db_users.get(`${username}.inventory.varna`)-1)

          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.type`, "meth")

          console.log("successful")
          socket.send("successful")
        }
        else if (drug === "heroin" && db_users.get(`${username}.inventory.varic`) > 0) {
          db_users.set(`${username}.inventory.varic`, db_users.get(`${username}.inventory.varic`)-1)

          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.type`, "heroin")

          console.log("successful")
          socket.send("successful")
        }
        else {
          console.log("error 0x05")
          socket.send("error 0x05")
        }
      }
      else {
        console.log("error 0x05")
        socket.send("error 0x05")
      }
    }
    else if (msg.startsWith("registration")) {
      if (db_users.get(`${username}`) === undefined && password.length === 64) {


		db_hoods.set(`${username}`, db_config.get("default_objects.hoods"));
		db_varny.set(`${username}`, db_config.get("default_objects.varny"));
		db_users.set(`${username}`, db_config.get("default_objects.user"));
		
		db_users.set(`${username}.password`, `${password}`)
		
        db_config.push("listOfUsers", `${username}`)

        console.log("successful")
        socket.send("successful")
      }
      else {
        console.log("error 0x06")
        socket.send("error 0x06")
      }
    }
    else if (msg.startsWith("login") && Auth(username, password)) {
      console.log("successful")
      socket.send("successful")
    }
    else if (msg.startsWith("getservertimestamp") && Auth(username, password)) {
      console.log(getTimestamp())
      socket.send(getTimestamp())
    }
    else if (msg.startsWith("hood") && Auth(username, password)) {
      idHoodu = msg.split("$")[3]

      if (checkUnlockedHood(db_users.get(`${username}.respect`)) >= parseInt(idHoodu)) {
        var answer = "hood$" + db_hoods.get(`${username}.${idHoodu}.weed_poptavka`) + "$" + db_hoods.get(`${username}.${idHoodu}.weed_cena`) + "$" + db_hoods.get(`${username}.${idHoodu}.meth_poptavka`) + "$" + db_hoods.get(`${username}.${idHoodu}.meth_cena`) + "$" + db_hoods.get(`${username}.${idHoodu}.heroin_poptavka`) + "$" + db_hoods.get(`${username}.${idHoodu}.heroin_cena`) + "$" + db_hoods.get(`${username}.${idHoodu}.dealer1`) + "$" + db_hoods.get(`${username}.${idHoodu}.dealer2`) + "$" + idHoodu;
      
        console.log(answer)
        socket.send(answer)
      }
      else {
        console.log("error 0x07")
        socket.send("error 0x07")
      }
    }
    else if (msg.startsWith("showdealers") && Auth(username, password)) {
      idHoodu = msg.split("$")[3]

      if (checkUnlockedHood(db_users.get(`${username}.respect`)) >= parseInt(idHoodu)) {
        
        var dealer1 = between(1, 5)
        var dealer2 = between(1, 5)
        var dealer3 = between(1, 5)

        while (dealer2 === dealer1) {
          dealer2 = between(1,5)
        }

        while (dealer3 === dealer2 || dealer3 === dealer1) {
          dealer3 = between(1,5)
        }

        socket.send(`showdealers$${dealer1}$${dealer2}$${dealer3}`)
        console.log(`showdealers$${dealer1}$${dealer2}$${dealer3}`)
      }
      else {
        console.log("error 0x08")
        socket.send("error 0x08")
      }
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

async function checkMidnight() {
  if(getTimestamp() === db_config.get("nextMidnight")) {
	console.log("je pulnoc xd")
	db_config.set("nextMidnight", db_config.get("nextMidnight")+86400) //zmeni pulnoc na dalsi pulnoc
  }
}

function ChangePoptavka(username) {
	for (var hood=0;hood<=13;hood++) {
		db_hoods.set(`${username}.${hood}.weed`, 10*between(0.5,3))
		db_hoods.set(`${username}.${hood}.meth`, 5*between(0.5,3))
		db_hoods.set(`${username}.${hood}.heroin`, 7.5*between(0.5,3))
	}
}

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

function Buy(IDzbozi, username) {
  if (IDzbozi === "1") {
    if (db_users.get(`${username}.money`) >= 100) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-100)

      db_users.set(`${username}.inventory.seminka`, db_users.get(`${username}.inventory.seminka`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "2") {
    if (db_users.get(`${username}.inventory.hnuj`) === 0) {
      if (db_users.get(`${username}.money`) >= 50) {
        db_users.set(`${username}.money`, db_users.get(`${username}.money`)-50)
  
        db_users.set(`${username}.inventory.hnuj`, db_users.get(`${username}.inventory.hnuj`)+1)
  
        return true
      }   
    }
    else if (db_users.get(`${username}.inventory.hnuj`) === 1) {
      if (db_users.get(`${username}.money`) >= 5000) {
        db_users.set(`${username}.money`, db_users.get(`${username}.money`)-5000)
  
        db_users.set(`${username}.inventory.hnuj`, db_users.get(`${username}.inventory.hnuj`)+1)
  
        return true
      }   
    }
    else if (db_users.get(`${username}.inventory.hnuj`) === 2) {
      if (db_users.get(`${username}.money`) >= 50000) {
        db_users.set(`${username}.money`, db_users.get(`${username}.money`)-50000)
  
        db_users.set(`${username}.inventory.hnuj`, db_users.get(`${username}.inventory.hnuj`)+1)
  
        return true
      }   
    }
    else {
      console.log("error 0x04")
      return false;
    }
  }
  else if (IDzbozi === "3") {
    if (db_users.get(`${username}.money`) >= 4000) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-4000)

      db_users.set(`${username}.inventory.varna`, db_users.get(`${username}.inventory.varna`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "4") {
    if (db_users.get(`${username}.money`) >= 100) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-100)

      db_users.set(`${username}.inventory.aceton`, db_users.get(`${username}.inventory.aceton`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "5") {
    if (db_users.get(`${username}.money`) >= 80) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-80)

      db_users.set(`${username}.inventory.hydroxid`, db_users.get(`${username}.inventory.hydroxid`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "6") {
    if (db_users.get(`${username}.money`) >= 95) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-95)

      db_users.set(`${username}.inventory.chlorovodikova`, db_users.get(`${username}.inventory.chlorovodikova`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "7") {
    if (db_users.get(`${username}.money`) >= 370) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-370)

      db_users.set(`${username}.inventory.ether`, db_users.get(`${username}.inventory.ether`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "8") {
    if (db_users.get(`${username}.money`) >= 2000) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-2000)

      db_users.set(`${username}.inventory.efedrin`, db_users.get(`${username}.inventory.efedrin`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "9") {
    if (db_users.get(`${username}.money`) >= 1000) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-1000)

      db_users.set(`${username}.inventory.varic`, db_users.get(`${username}.inventory.varic`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "10") {
    if (db_users.get(`${username}.money`) >= 120) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-120)

      db_users.set(`${username}.inventory.chloroform`, db_users.get(`${username}.inventory.chloroform`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "11") {
    if (db_users.get(`${username}.money`) >= 50) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-50)

      db_users.set(`${username}.inventory.uhlicitan`, db_users.get(`${username}.inventory.uhlicitan`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "12") {
    if (db_users.get(`${username}.money`) >= 150) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-150)

      db_users.set(`${username}.inventory.aktivniuhli`, db_users.get(`${username}.inventory.aktivniuhli`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "13") {
    if (db_users.get(`${username}.money`) >= 100) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-100)

      db_users.set(`${username}.inventory.alkohol`, db_users.get(`${username}.inventory.alkohol`)+1)

      return true
    }    
    else {
      return false
    }
  }
  else {
    return false
  }
}

function checkUnlockedHood(respekt) {
  if (respekt >= 0 && respekt < 50) {
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
