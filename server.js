//socket.send(msg);
//sweg2

const WebSocket = require('ws');
const Database = require("easy-json-database");
const rp = require("request-promise");
const random = require('random');
const { parse } = require('path/posix');
/*const removeValue = require('remove-value');
Array.prototype.remove = removeValue;*/

const db_users = new Database("/root/Demeter/db/users.json", {});
const db_varny = new Database("/root/Demeter/db/varny.json", {});
const db_config = new Database("/root/Demeter/db/config.json", {});
const db_hoods = new Database("/root/Demeter/db/hoods.json", {});
const db_dealeri = new Database("/root/Demeter/db/dealeri.json", {});
const db_leaderboard = new Database("/root/Demeter/db/leaderboard.json", {});
const db_pole = new Database("/root/Demeter/db/pole.json", {});
const db_login = new Database("/root/Demeter/db/login.json", {});

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
          answer = answer + db_varny.get(`${username}.varna${idVarny}.table${i}.type`) + "$" + db_varny.get(`${username}.varna${idVarny}.table${i}.stop`) + "$" + db_varny.get(`${username}.varna${idVarny}.table${i}.stage`) + "$"
        }
      }

      console.log(answer)
      socket.send(answer)
    }
    else if (msg.startsWith("weedstart") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]
      var minigameResult = msg.split("$")[5]

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) < getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "weed" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === true && db_users.get(`${username}.inventory.seminka`) > 0) {
        db_users.set(`${username}.inventory.seminka`, db_users.get(`${username}.inventory.seminka`)-1)

        var sklizeno = between(45,55)

        if (db_users.get(`${username}.inventory.hnuj`) === 1) {
          sklizeno = parseInt((sklizeno * 1.25).toFixed(0))
        }
        else if (db_users.get(`${username}.inventory.hnuj`) === 2) {
          sklizeno = parseInt((sklizeno * 1.5).toFixed(0))
        }
        else if (db_users.get(`${username}.inventory.hnuj`) === 3) {
          sklizeno = parseInt((sklizeno * 1.75).toFixed(0))
        }

        sklizeno = parseInt(sklizeno - (-5*parseInt(minigameResult)))

        console.log("amount: " + sklizeno)

        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.start`, getTimestamp())
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, getTimestamp()+1200)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.harvested`, false)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.amount`, sklizeno)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stage`, 1)

        console.log(`weedstart$${getTimestamp()+1200}`)
        socket.send(`weedstart$${getTimestamp()+1200}`)
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
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stage`, 0)
        
        db_users.set(`${username}.inventory.weed`, db_users.get(`${username}.inventory.weed`)+db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`))

        console.log(`weedharvest$${db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`)}`)
        socket.send(`weedharvest$${db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`)}`)

        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.amount`, 0)
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
      console.log("inventory$" + db_users.get(`${username}.inventory.weed`) + "$" + db_users.get(`${username}.inventory.meth`) + "$" + db_users.get(`${username}.inventory.heroin`) + "$" + db_users.get(`${username}.inventory.seminka`) + "$" + db_users.get(`${username}.inventory.hnuj`) + "$" + db_users.get(`${username}.inventory.varna`) + "$" + db_users.get(`${username}.inventory.aceton`) + "$" + db_users.get(`${username}.inventory.hydroxid`) + "$" + db_users.get(`${username}.inventory.chlorovodikova`) + "$" + db_users.get(`${username}.inventory.ether`) + "$" + db_users.get(`${username}.inventory.efedrin`) + "$" + db_users.get(`${username}.inventory.varic`) + "$" + db_users.get(`${username}.inventory.chloroform`) + "$" + db_users.get(`${username}.inventory.uhlicitan`) + "$" + db_users.get(`${username}.inventory.aktivniuhli`) + "$" + db_users.get(`${username}.inventory.alkohol`) + "$" + db_users.get(`${username}.inventory.ocet`) + "$" + db_users.get(`${username}.inventory.cpavek`) + "$" + db_users.get(`${username}.inventory.vapno`) + "$" + db_users.get(`${username}.inventory.makovice`))
      socket.send("inventory$" + db_users.get(`${username}.inventory.weed`) + "$" + db_users.get(`${username}.inventory.meth`) + "$" + db_users.get(`${username}.inventory.heroin`) + "$" + db_users.get(`${username}.inventory.seminka`) + "$" + db_users.get(`${username}.inventory.hnuj`) + "$" + db_users.get(`${username}.inventory.varna`) + "$" + db_users.get(`${username}.inventory.aceton`) + "$" + db_users.get(`${username}.inventory.hydroxid`) + "$" + db_users.get(`${username}.inventory.chlorovodikova`) + "$" + db_users.get(`${username}.inventory.ether`) + "$" + db_users.get(`${username}.inventory.efedrin`) + "$" + db_users.get(`${username}.inventory.varic`) + "$" + db_users.get(`${username}.inventory.chloroform`) + "$" + db_users.get(`${username}.inventory.uhlicitan`) + "$" + db_users.get(`${username}.inventory.aktivniuhli`) + "$" + db_users.get(`${username}.inventory.alkohol`) + "$" + db_users.get(`${username}.inventory.ocet`) + "$" + db_users.get(`${username}.inventory.cpavek`) + "$" + db_users.get(`${username}.inventory.vapno`) + "$" + db_users.get(`${username}.inventory.makovice`))
    }
    else if (msg.startsWith("buy") && Auth(username, password)) {
      var zbozi_id = msg.split("$")[3]
      var pocetZbozi = msg.split("$")[4]
      if (Buy(zbozi_id, username, pocetZbozi) === true) {
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

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === true) {
        if (drug === "weed") {
          if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === drug) {
            console.log("changetable$error")
            socket.send("changetable$error")
          }
          else {
            db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.type`, "weed")
          
            console.log(`changetable$successful$${idTabelu}$weed`)
            socket.send(`changetable$successful$${idTabelu}$weed`)
          }
        }
        else if (drug === "meth" && db_users.get(`${username}.inventory.varna`) > 0) {
          if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === drug) {
            console.log("changetable$error")
            socket.send("changetable$error")
          }
          else {
            db_users.set(`${username}.inventory.varna`, db_users.get(`${username}.inventory.varna`)-1)

            db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.type`, "meth")
  
            console.log(`changetable$successful$${idTabelu}$meth`)
            socket.send(`changetable$successful$${idTabelu}$meth`)
          }
        }
        else if (drug === "heroin" && db_users.get(`${username}.inventory.varic`) > 0) {
          if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === drug) {
            console.log("changetable$error")
            socket.send("changetable$error")
          }
          else {
            db_users.set(`${username}.inventory.varic`, db_users.get(`${username}.inventory.varic`)-1)

            db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.type`, "heroin")
  
            console.log(`changetable$successful$${idTabelu}$heroin`)
            socket.send(`changetable$successful$${idTabelu}$heroin`)
          }
        }
        else {
          console.log("changetable$error")
          socket.send("changetable$error")
        }
      }
      else {
        console.log("changetable$error")
        socket.send("changetable$error")
      }
    }
    else if (msg.startsWith("registration")) {
      if (db_users.get(`${username}`) === undefined && password.length >= 61) {

        var username = msg.split('$')[1]
        var password = msg.split('$')[2]
        var email = msg.split('$')[3]

        CreateUserDB(username)
        CreateVarnyDB(username)
        CreateHoodDB(username)
        CreatePoleDB(username)

        db_config.push("listOfUsers", `${username}`)

        db_login.set(`${username}`, {})
        db_login.set(`${username}.password`, password)
        db_login.set(`${username}.email`, email)

        console.log("successful")
        socket.send("successful")
      }
      else {
        console.log("error 0x06")
        socket.send("error 0x06")
      }
    }
    else if (msg.startsWith("login") && Auth(username, password)) {

      db_users.set(`${username}.logged`, db_users.get(`${username}.logged`)+1)
      if (db_users.get(`${username}.logged`) === 1) {
        console.log("login$successful$true")
        socket.send("login$successful$true")
      }
      else {
        console.log("login$successful$false")
        socket.send("login$successful$false")
      }
    }
    else if (msg.startsWith("getservertimestamp") && Auth(username, password)) {
      console.log(`getservertimestamp$${getTimestamp()}`)
      socket.send(`getservertimestamp$${getTimestamp()}`)
    }
    else if (msg.startsWith("hood") && Auth(username, password)) {
      idHoodu = msg.split("$")[3]

      if (checkUnlockedHood(db_users.get(`${username}.respect`)) >= parseInt(idHoodu)) {
        var answer = "hood$" + db_users.get(`${username}.inventory.weed`) + "$" + db_hoods.get(`${username}.${idHoodu}.weed_cena`) + "$" + db_users.get(`${username}.inventory.meth`) + "$" + db_hoods.get(`${username}.${idHoodu}.meth_cena`) + "$" + db_users.get(`${username}.inventory.heroin`) + "$" + db_hoods.get(`${username}.${idHoodu}.heroin_cena`) + "$" + db_hoods.get(`${username}.${idHoodu}.dealer1`) + "$" + db_hoods.get(`${username}.${idHoodu}.dealer2`) + "$" + idHoodu;
      
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

        while (dealer1.toString() === db_hoods.get(`${username}.${idHoodu}.dealer1`) || dealer1.toString() === db_hoods.get(`${username}.${idHoodu}.dealer2`)) {
          dealer1 = between(1,5)
        }

        while (dealer2 === dealer1 || dealer2.toString() === db_hoods.get(`${username}.${idHoodu}.dealer1`) || dealer2.toString() === db_hoods.get(`${username}.${idHoodu}.dealer2`)) {
          dealer2 = between(1,5)
        }

        while (dealer3 === dealer2 || dealer3 === dealer1  || dealer3.toString() === db_hoods.get(`${username}.${idHoodu}.dealer1`) || dealer3.toString() === db_hoods.get(`${username}.${idHoodu}.dealer2`)) {
          dealer3 = between(1,5)
        }

        socket.send(`showdealers$${dealer1}$${dealer2}$${dealer3}$${idHoodu}`)
        console.log(`showdealers$${dealer1}$${dealer2}$${dealer3}$${idHoodu}`)
      }
      else {
        console.log("error 0x08")
        socket.send("error 0x08")
      }
    }
    else if (msg.startsWith("assigndealer") && Auth(username, password)) {
      idHoodu = msg.split("$")[3]
      idDealera = parseInt(msg.split("$")[4])

      if (idDealera <= 5 && idDealera >= 1) {
        if (db_hoods.get(`${username}.${idHoodu}.dealer1`) === "0" || db_hoods.get(`${username}.${idHoodu}.dealer2`) === "0") {
          if (db_hoods.get(`${username}.${idHoodu}.dealer1`) === "0") {
            db_hoods.set(`${username}.${idHoodu}.dealer1`, `${idDealera}`)
          }
          else if (db_hoods.get(`${username}.${idHoodu}.dealer2`) === "0") {
            db_hoods.set(`${username}.${idHoodu}.dealer2`, `${idDealera}`)
          }
        }
        else {
          console.log("error 0x0A")
          socket.send("error 0x0A")
        }
      }
      else {
        console.log("error 0x09")
        socket.send("error 0x09")
      }
    }
    else if (msg.startsWith("money") && Auth(username, password)) {
      console.log(`money$${db_users.get(`${username}.money`)}`)
      socket.send(`money$${db_users.get(`${username}.money`)}`)
    }
    else if (msg.startsWith("sendtodealer") && Auth(username, password)) {
      idHoodu = msg.split("$")[3]
      dealerCislo = msg.split("$")[4]
      zboziType = msg.split("$")[5]
      zboziAmount = msg.split("$")[6]

      var dealer_pole = db_dealeri.get(`${idHoodu}.${db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}`)}.drugs`)

      if (db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}`) !== "0" && db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}_info.amount`) === 0 && dealer_pole.includes(`${zboziType}`)) {
        if (db_users.get(`${username}.inventory.${zboziType}`) >= parseInt(zboziAmount)) {
          if (db_dealeri.get(`${idHoodu}.${db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}`)}.selling_amount`) >= parseInt(zboziAmount)) {
            db_users.set(`${username}.inventory.${zboziType}`, db_users.get(`${username}.inventory.${zboziType}`)-parseInt(zboziAmount))
            db_hoods.set(`${username}.${idHoodu}.dealer${dealerCislo}_info.amount`, parseInt(zboziAmount))
            db_hoods.set(`${username}.${idHoodu}.dealer${dealerCislo}_info.startTimestamp`, getTimestamp())
            var endTimestamp = getTimestamp()+parseInt((parseInt(zboziAmount) / db_dealeri.get(`${idHoodu}.${db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}`)}.selling_amount`))*900)
            db_hoods.set(`${username}.${idHoodu}.dealer${dealerCislo}_info.endTimestamp`, endTimestamp)
            var profit = parseInt((db_hoods.get(`${username}.${idHoodu}.${zboziType}_cena`)*parseInt(zboziAmount))-parseInt(((db_hoods.get(`${username}.${idHoodu}.${zboziType}_cena`)*parseInt(zboziAmount))*db_dealeri.get(`${idHoodu}.${db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}`)}.profit_cut`))/100))
            db_hoods.set(`${username}.${idHoodu}.dealer${dealerCislo}_info.profit`, profit)

            console.log(`sendtodealer$${endTimestamp}`)
            socket.send(`sendtodealer$${endTimestamp}`)

            UpdateLeaderboard(username, `most_${zboziType}_sold`, zboziAmount);
          } 
          else {
            console.log("error 0x0D")
            socket.send("error 0x0D")
          }
        }
        else {
          console.log("error 0x0C")
          socket.send("error 0x0C")
        }
      }
      else {
        console.log("error 0x0B")
        socket.send("error 0x0B")
      }
    }
    else if (msg.startsWith("takeprofit") && Auth(username, password)) {
      idHoodu = msg.split("$")[3]
      dealerCislo = msg.split("$")[4]

      if (db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}`) !== "0") {
          if (db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}_info.amount`) !== 0) {
            if (db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}_info.endTimestamp`) < getTimestamp()) {

              var respect = parseInt(db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}_info.amount`))

              db_hoods.set(`${username}.${idHoodu}.dealer${dealerCislo}_info.amount`, 0)
              db_hoods.set(`${username}.${idHoodu}.dealer${dealerCislo}_info.startTimestamp`, 0)
              db_hoods.set(`${username}.${idHoodu}.dealer${dealerCislo}_info.endTimestamp`, 0)

              var profit = db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}_info.profit`)
              db_hoods.set(`${username}.${idHoodu}.dealer${dealerCislo}_info.profit`, 0)

              if (between(1,100) <= db_dealeri.get(`${idHoodu}.${db_hoods.get(`${username}.${idHoodu}.dealer${dealerCislo}`)}.police_chance`)) {
                console.log("police")
                socket.send("police")
              }
              else {
                db_users.set(`${username}.money`, db_users.get(`${username}.money`)+profit)

                db_users.set(`${username}.respect`, db_users.get(`${username}.respect`)+respect)

                console.log(`takeprofit$${profit}`)
                socket.send(`takeprofit$${profit}`)
              }
            }
            else {
              console.log("error 0x10")
              socket.send("error 0x10")
            }
          }
          else {
            console.log("error 0x0F")
            socket.send("error 0x0F")
          }
      }
      else {
        console.log("error 0x0E")
        socket.send("error 0x0E")
      }
    }
    else if (msg.startsWith("loaddealers") && Auth(username, password)) {
      idHoodu = msg.split("$")[3]

      var dealer1prodaneMnozstvi = 0
      var dealer2prodaneMnozstvi = 0

      if (db_hoods.get(`${username}.${idHoodu}.dealer1_info.amount`) !== 0) {
        dealer1prodaneMnozstvi = parseInt(((db_hoods.get(`${username}.${idHoodu}.dealer1_info.amount`)*(db_hoods.get(`${username}.${idHoodu}.dealer1_info.endTimestamp`)-getTimestamp()))/(db_hoods.get(`${username}.${idHoodu}.dealer1_info.endTimestamp`)-db_hoods.get(`${username}.${idHoodu}.dealer1_info.startTimestamp`))))
      }
      if (db_hoods.get(`${username}.${idHoodu}.dealer2_info.amount`) !== 0) {
        dealer2prodaneMnozstvi = parseInt(((db_hoods.get(`${username}.${idHoodu}.dealer2_info.amount`)*(db_hoods.get(`${username}.${idHoodu}.dealer2_info.endTimestamp`)-getTimestamp()))/(db_hoods.get(`${username}.${idHoodu}.dealer2_info.endTimestamp`)-db_hoods.get(`${username}.${idHoodu}.dealer2_info.startTimestamp`))))
      }

      var answer = "loaddealers$" + db_hoods.get(`${username}.${idHoodu}.dealer1_info.amount`) + "$" + (db_hoods.get(`${username}.${idHoodu}.dealer1_info.endTimestamp`)-getTimestamp()) + "$" + dealer1prodaneMnozstvi + "$" + db_hoods.get(`${username}.${idHoodu}.dealer2_info.amount`) + "$" + (db_hoods.get(`${username}.${idHoodu}.dealer2_info.endTimestamp`)-getTimestamp())  + "$" + dealer2prodaneMnozstvi
    
      console.log(answer)
      socket.send(answer)
    }
    else if (msg.startsWith("methstart") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]
      var minigameResult = msg.split("$")[5]

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) < getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "meth" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === true) {
        if (db_users.get(`${username}.inventory.efedrin`) >= 1 && db_users.get(`${username}.inventory.aceton`) >= 1 && db_users.get(`${username}.inventory.ether`) >= 1 && db_users.get(`${username}.inventory.chlorovodikova`) >= 1 && db_users.get(`${username}.inventory.hydroxid`) >= 1) {
          
          var sklizeno = between(15,25)

          sklizeno = parseInt(sklizeno - (-2*parseInt(minigameResult)))

          if (parseInt(minigameResult) === 5) {
            sklizeno = 0;
          }
  
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.start`, getTimestamp())
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, getTimestamp()+900)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.harvested`, false)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.amount`, sklizeno)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stage`, 1)
          
          db_users.set(`${username}.inventory.efedrin`, db_users.get(`${username}.inventory.efedrin`)-1)
          db_users.set(`${username}.inventory.aceton`, db_users.get(`${username}.inventory.aceton`)-1)
          db_users.set(`${username}.inventory.ether`, db_users.get(`${username}.inventory.ether`)-1)
          db_users.set(`${username}.inventory.hydroxid`, db_users.get(`${username}.inventory.hydroxid`)-1)
          db_users.set(`${username}.inventory.chlorovodikova`, db_users.get(`${username}.inventory.chlorovodikova`)-1)
  
          console.log(`methstart$${getTimestamp()+900}`)
          socket.send(`methstart$${getTimestamp()+900}`)
        }
        else {
          console.log("error 0x12")
          socket.send("error 0x12")
        }
      }
      else {
        console.log("error 0x11")
        socket.send("error 0x11")
      }
    }
    else if (msg.startsWith("methcontinue") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]
      var minigameResult = msg.split("$")[5]

      if (minigameResult === "0") {minigameResult="4"}
      else if (minigameResult === "1") {minigameResult="3"}
      else if (minigameResult === "3") {minigameResult="1"}
      else if (minigameResult === "4") {minigameResult="0"}

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "meth" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) <= getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stage`) === 1) {

        if (db_users.get(`${username}.inventory.alkohol`) >= 1) {
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, getTimestamp()+900)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stage`, 2)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.amount`, db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`)*parseInt(minigameResult))
          
          db_users.set(`${username}.inventory.alkohol`, db_users.get(`${username}.inventory.alkohol`)-1)
        
          console.log(`methcontinue$${getTimestamp()+900}`)
          socket.send(`methcontinue$${getTimestamp()+900}`)
        }
        else {
          console.log("error 0x15")
          socket.send("error 0x15")
        }
      }
      else {
        console.log("error 0x13")
        socket.send("error 0x13")
      }
    }
    else if (msg.startsWith("methharvest") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === false && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) < getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "meth" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stage`) === 2) {
       
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.harvested`, true)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, 0)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.start`, 0)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stage`, 0)
        
        db_users.set(`${username}.inventory.meth`, db_users.get(`${username}.inventory.meth`)+db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`))

        console.log(`methharvest$${db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`)}`)
        socket.send(`methharvest$${db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`)}`)

        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.amount`, 0)
      }
      else {
        console.log("error 0x14")
        socket.send("error 0x14")
      }
    }
    else if (msg.startsWith("makoviceharvest") && Auth(username, password)) {
      try {
        var cislomakovice = parseInt(msg.split("$")[3])
      }
      catch {
        console.log("swag")
      }

      if (checkMakovice(username, cislomakovice)) {
        if (parseInt(db_pole.get(`${username}.${cislomakovice}`)) <= getTimestamp()) {

          var sklizeno = between(75,125)

          db_pole.set(`${username}.${cislomakovice}`, getTimestamp()+7200)
          db_users.set(`${username}.inventory.makovice`, db_users.get(`${username}.inventory.makovice`)+parseInt(sklizeno))

          console.log(`makoviceharvest$${sklizeno}`)
          socket.send(`makoviceharvest$${sklizeno}`)
        }
        else {
          console.log("error 0x16")
          socket.send("error 0x16")
        }
      }
      else {
        console.log("error 0x1E")
        socket.send("error 0x1E")
      }
    }
    else if (msg.startsWith("poleupgrade") && Auth(username, password)) {
      var newLevel = UpgradePole(username);

      if (newLevel !== 0) {
        console.log(`poleupgrade$${newlevel}`)
        socket.send(`poleupgrade$${newLevel}`)
      }
      else {
        console.log("error 0x17")
        socket.send("error 0x17")
      }
    }
    else if (msg.startsWith("heroinstart") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]
      var minigameResult = msg.split("$")[5]

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) < getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "heroin" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === true) {
        if (db_users.get(`${username}.inventory.cpavek`) >= 1 && db_users.get(`${username}.inventory.vapno`) >= 1 && db_users.get(`${username}.inventory.makovice`) >= 25) {
          
          var sklizeno = between(15,25)

          sklizeno = parseInt(sklizeno - (-2*parseInt(minigameResult)))
  
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.start`, getTimestamp())
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, getTimestamp()+1200)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.harvested`, false)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.amount`, sklizeno)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stage`, 1)
          
          db_users.set(`${username}.inventory.makovice`, db_users.get(`${username}.inventory.makovice`)-25)
          db_users.set(`${username}.inventory.vapno`, db_users.get(`${username}.inventory.vapno`)-1)
          db_users.set(`${username}.inventory.cpavek`, db_users.get(`${username}.inventory.cpavek`)-1)
  
          console.log(`heroinstart$${getTimestamp()+1200}`)
          socket.send(`heroinstart$${getTimestamp()+1200}`)
        }
        else {
          console.log("error 0x1A")
          socket.send("error 0x1A")
        }
      }
      else {
        console.log("error 0x19")
        socket.send("error 0x19")
      }
    }
    else if (msg.startsWith("heroincontinue") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]
      var minigameResult = msg.split("$")[5]

      if (minigameResult === "0") {minigameResult="4"}
      else if (minigameResult === "1") {minigameResult="3"}
      else if (minigameResult === "3") {minigameResult="1"}
      else if (minigameResult === "4") {minigameResult="0"}

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "heroin" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) <= getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stage`) === 1) {

        if (db_users.get(`${username}.inventory.ocet`) >= 1 && db_users.get(`${username}.inventory.chloroform`) >= 1 && db_users.get(`${username}.inventory.uhlicitan`) >= 1 && db_users.get(`${username}.inventory.alkohol`) >= 1 && db_users.get(`${username}.inventory.aktivniuhli`) >= 1) {
          
          var sklizeno = parseInt(db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`)*parseInt(minigameResult))

          if (parseInt(minigameResult) === 5) {
            sklizeno = 0
          }
          
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, getTimestamp()+1200)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stage`, 2)
          db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.amount`, sklizeno)
          
          db_users.set(`${username}.inventory.alkohol`, db_users.get(`${username}.inventory.alkohol`)-1)
          db_users.set(`${username}.inventory.aktivniuhli`, db_users.get(`${username}.inventory.aktivniuhli`)-1)
          db_users.set(`${username}.inventory.chloroform`, db_users.get(`${username}.inventory.chloroform`)-1)
          db_users.set(`${username}.inventory.uhlicitan`, db_users.get(`${username}.inventory.uhlicitan`)-1)
          db_users.set(`${username}.inventory.ocet`, db_users.get(`${username}.inventory.ocet`)-1)
        
          console.log(`heroincontinue$${getTimestamp()+1200}`)
          socket.send(`heroincontinue$${getTimestamp()+1200}`)
        }
        else {
          console.log("error 0x1C")
          socket.send("error 0x1C")
        }
      }
      else {
        console.log("error 0x1B")
        socket.send("error 0x1B")
      }
    }
    else if (msg.startsWith("heroinharvest") && Auth(username, password)) {
      var idVarny = msg.split("$")[3]
      var idTabelu = msg.split("$")[4]

      if (db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.harvested`) === false && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stop`) < getTimestamp() && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.type`) === "heroin" && db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.stage`) === 2) {
       
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.harvested`, true)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stop`, 0)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.start`, 0)
        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.stage`, 0)
        
        db_users.set(`${username}.inventory.heroin`, db_users.get(`${username}.inventory.heroin`)+db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`))

        console.log(`heroinharvest$${db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`)}`)
        socket.send(`heroinharvest$${db_varny.get(`${username}.varna${idVarny}.table${idTabelu}.amount`)}`)

        db_varny.set(`${username}.varna${idVarny}.table${idTabelu}.amount`, 0)
      }
      else {
        console.log("error 0x1D")
        socket.send("error 0x1D")
      }
    }
    else if (msg.startsWith("loadpole") && Auth(username, password)) {
      console.log(`loadpole$${db_users.get(`${username}.pole`)}`)
      socket.send(`loadpole$${db_users.get(`${username}.pole`)}`)
    }
    else if (msg.startsWith("loadsektorpole") && Auth(username, password)) {
      var sektor = msg.split("$")[3]

      if (sektor <= db_users.get(`${username}.pole`)) {
        var answer = "loadsektorpole$";
        var max = 0
        if (sektor === "1") {max = 2}
        else if (sektor === "2") {max = 6}
        else if (sektor === "3") {max = 12}
        else if (sektor === "4") {max = 20}
        else if (sektor === "5") {max = 32}

        for (var i=1; i<=max;i++) {
          answer += `${db_pole.get(`${username}.${i}`)}` + "$"
        }

        console.log(answer)
        socket.send(answer)
      }
      else {
        console.log("0x18")
        socket.send("0x18")
      }
    }
    else if (msg.startsWith("leaderboard")) {
      var type = msg.split("$")[1]

      if (db_leaderboard.get(`${type}`) !== undefined && type !== "most_money" && type !== "most_respect") {
        var users = db_config.get("listOfUsers");

        var first_place_value = 0;
        var first_place_name = "";
        var second_place_value = 0;
        var second_place_name = "";
        var third_place_value = 0;
        var third_place_name = "";
  
        var leaderboard = [];
  
        users.forEach(user => {
          if (db_leaderboard.get(`${type}.${user}`) !== undefined) {leaderboard.push(db_leaderboard.get(`${type}.${user}`))}
        });
  
        leaderboard.sort(function(a, b){return a - b});
  
        var leaderboard_size = leaderboard.length;
  
        users.forEach(user => {
          if (db_leaderboard.get(`${type}.${user}`) === leaderboard[leaderboard_size-1]) { first_place_name = user; first_place_value = leaderboard[leaderboard_size-1]; }
          if (db_leaderboard.get(`${type}.${user}`) === leaderboard[leaderboard_size-2]) { second_place_name = user; second_place_value = leaderboard[leaderboard_size-2]; }
          if (db_leaderboard.get(`${type}.${user}`) === leaderboard[leaderboard_size-3]) { third_place_name = user; third_place_value = leaderboard[leaderboard_size-3]; }
        });
  
        console.log(`leaderboard$${third_place_name}$${third_place_value}$${second_place_name}$${second_place_value}$${first_place_name}$${first_place_value}`)
        socket.send(`leaderboard$${third_place_name}$${third_place_value}$${second_place_name}$${second_place_value}$${first_place_name}$${first_place_value}`)
      }
      else if (type === "most_money" || type === "most_respect") {
        var typ = ""

        if (type === "most_money") {typ = "money"}
        else if (type === "most_respect") {typ = "respect"}

        var users = db_config.get("listOfUsers");
  
        var first_place_value = 0;
        var first_place_name = "";
        var second_place_value = 0;
        var second_place_name = "";
        var third_place_value = 0;
        var third_place_name = "";
  
        var leaderboard = [];
  
        users.forEach(user => {
          leaderboard.push(parseInt(db_users.get(`${user}.${typ}`)))
        });

        leaderboard.sort(function(a, b){return a - b});
  
        var leaderboard_size = leaderboard.length;

        users.forEach(user => {
          if (db_users.get(`${user}.${typ}`) === leaderboard[leaderboard_size-1]) { first_place_name = user; first_place_value = leaderboard[leaderboard_size-1]; }
          if (db_users.get(`${user}.${typ}`) === leaderboard[leaderboard_size-2]) { second_place_name = user; second_place_value = leaderboard[leaderboard_size-2]; }
          if (db_users.get(`${user}.${typ}`) === leaderboard[leaderboard_size-3]) { third_place_name = user; third_place_value = leaderboard[leaderboard_size-3]; }
        });

        console.log(`leaderboard$${third_place_name}$${third_place_value}$${second_place_name}$${second_place_value}$${first_place_name}$${first_place_value}`)
        socket.send(`leaderboard$${third_place_name}$${third_place_value}$${second_place_name}$${second_place_value}$${first_place_name}$${first_place_value}`)
      }
      else {
        console.log("error 0x1F")
        socket.send("error 0x1F")
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

  var users_array = db_config.get(`listOfUsers`)

  users_array.forEach(user => {
    for (var hood=1;hood<=13;hood++) {
      db_hoods.set(`${user}.${hood}.weed_cena`, parseInt((100*((random.float((min = 0.75),(max = 1.25))).toFixed(1)))))
      db_hoods.set(`${user}.${hood}.meth_cena`, parseInt((500*((random.float((min = 0.75),(max = 1.25))).toFixed(1)))))
      db_hoods.set(`${user}.${hood}.heroin_cena`, parseInt((750*((random.float((min = 0.75),(max = 1.25))).toFixed(1)))))
    }
  });
  }
}

function getTimestamp() {
  return Math.floor(Date.now()/1000) 
}

function Auth(username, password) {
  try {
    if (password.length === 10 && db_login.get(`${username}.password`).startsWith(password)) {
      console.log(`\x1b[32mAuth successful\x1b[0m`)
      return true;
    }
    else {
      console.log(`\x1b[31mAuth failed 0b02\x1b[0m`)
      return false;
    }
  }
  catch {
    console.log(`\x1b[31mAuth failed 0b01\x1b[0m`)
    return false;
  }
}

function between(min, max) {  
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Buy(IDzbozi, username, pocetZbozi) {
  var pocetZbozi = parseInt(pocetZbozi)

  if (IDzbozi === "1") {
    if (db_users.get(`${username}.money`) >= (100*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(100*pocetZbozi))

      db_users.set(`${username}.inventory.seminka`, db_users.get(`${username}.inventory.seminka`)+pocetZbozi)

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "2") {
    if (db_users.get(`${username}.inventory.hnuj`) === 0) {
      if (db_users.get(`${username}.money`) >= 500) {
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
    if (db_users.get(`${username}.money`) >= (4000*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(4000*pocetZbozi))

      db_users.set(`${username}.inventory.varna`, db_users.get(`${username}.inventory.varna`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "4") {
    if (db_users.get(`${username}.money`) >= (100*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(pocetZbozi*100))

      db_users.set(`${username}.inventory.aceton`, db_users.get(`${username}.inventory.aceton`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "5") {
    if (db_users.get(`${username}.money`) >= (80*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(80*pocetZbozi))

      db_users.set(`${username}.inventory.hydroxid`, db_users.get(`${username}.inventory.hydroxid`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "6") {
    if (db_users.get(`${username}.money`) >= (95*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(95*pocetZbozi))

      db_users.set(`${username}.inventory.chlorovodikova`, db_users.get(`${username}.inventory.chlorovodikova`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "7") {
    if (db_users.get(`${username}.money`) >= (370*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(370*pocetZbozi))

      db_users.set(`${username}.inventory.ether`, db_users.get(`${username}.inventory.ether`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "8") {
    if (db_users.get(`${username}.money`) >= (2000*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(2000*pocetZbozi))

      db_users.set(`${username}.inventory.efedrin`, db_users.get(`${username}.inventory.efedrin`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "9") {
    if (db_users.get(`${username}.money`) >= (1000*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(1000*pocetZbozi))

      db_users.set(`${username}.inventory.varic`, db_users.get(`${username}.inventory.varic`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "10") {
    if (db_users.get(`${username}.money`) >= (120*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(120*pocetZbozi))

      db_users.set(`${username}.inventory.chloroform`, db_users.get(`${username}.inventory.chloroform`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "11") {
    if (db_users.get(`${username}.money`) >= (50*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(50*pocetZbozi))

      db_users.set(`${username}.inventory.uhlicitan`, db_users.get(`${username}.inventory.uhlicitan`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "12") {
    if (db_users.get(`${username}.money`) >= (150*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(150*pocetZbozi))

      db_users.set(`${username}.inventory.aktivniuhli`, db_users.get(`${username}.inventory.aktivniuhli`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "13") {
    if (db_users.get(`${username}.money`) >= (100*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(100*pocetZbozi))

      db_users.set(`${username}.inventory.alkohol`, db_users.get(`${username}.inventory.alkohol`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "14") {
    if (db_users.get(`${username}.money`) >= (15*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(15*pocetZbozi))

      db_users.set(`${username}.inventory.ocet`, db_users.get(`${username}.inventory.ocet`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "15") {
    if (db_users.get(`${username}.money`) >= (600*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(600*pocetZbozi))

      db_users.set(`${username}.inventory.cpavek`, db_users.get(`${username}.inventory.cpavek`)+(pocetZbozi))

      return true
    }    
    else {
      return false
    }
  }
  else if (IDzbozi === "16") {
    if (db_users.get(`${username}.money`) >= (80*pocetZbozi)) {
      db_users.set(`${username}.money`, db_users.get(`${username}.money`)-(80*pocetZbozi))

      db_users.set(`${username}.inventory.vapno`, db_users.get(`${username}.inventory.vapno`)+(pocetZbozi))

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
  else if (respekt >= 1000 && respekt < 2500) {
    return 4
  }
  else if (respekt >= 2500 && respekt < 5000) {
    return 5
  }
  else if (respekt >= 5000 && respekt < 7500) {
    return 6
  }
  else if (respekt >= 7500 && respekt < 10000) {
    return 7
  }
  else if (respekt >= 10000 && respekt < 15000) {
    return 8
  }
  else if (respekt >= 15000 && respekt < 20000) {
    return 9
  }
  else if (respekt >= 20000 && respekt < 30000) {
    return 10
  }
  else if (respekt >= 30000 && respekt < 50000) {
    return 11
  }
  else if (respekt >= 50000 && respekt < 100000) {
    return 12
  }
  else if (respekt >= 100000) {
    return 13
  }
}

function checkMakovice (username, cislomakovice) {

  var pole = db_users.get(`${username}.pole`)

  if (cislomakovice >= 1 && cislomakovice <= 2 && pole >= 1) {
    return true;
  }
  else if (cislomakovice >= 3 && cislomakovice <= 6 && pole >= 2) {
    return true;
  }
  else if (cislomakovice >= 7 && cislomakovice <= 12 && pole >= 3) {
    return true;
  }
  else if (cislomakovice >= 13 && cislomakovice <= 20 && pole >= 4) {
    return true;
  }
  else if (cislomakovice >= 21 && cislomakovice <= 32 && pole >= 5) {
    return true;
  }
  else {
    return false;
  }
}

function UpgradePole(username) {

  var poleLevel = db_users.get(`${username}.pole`)
  var money = db_users.get(`${username}.money`)

  if (poleLevel === 1 && money >= 500) {
    db_users.set(`${username}.money`, db_users.get(`${username}.money`)-500)
    db_users.set(`${username}.pole`, 2)
    return 2;
  }
  else if (poleLevel === 2 && money >= 1250) {
    db_users.set(`${username}.money`, db_users.get(`${username}.money`)-500)
    db_users.set(`${username}.pole`, 3)
    return 3;
  }
  else if (poleLevel === 3 && money >= 2500) {
    db_users.set(`${username}.money`, db_users.get(`${username}.money`)-500)
    db_users.set(`${username}.pole`, 4)
    return 4;
  }
  else if (poleLevel === 4 && money >= 5000) {
    db_users.set(`${username}.money`, db_users.get(`${username}.money`)-500)
    db_users.set(`${username}.pole`, 5)
    return 5;
  }
  else {
    return 0;
  }
}

function UpdateLeaderboard(username, type, amount) {

  console.log("username: " + username)
  console.log("type: " + type)
  console.log("amount: " + amount)

  if (db_leaderboard.get(`${type}.${username}`) !== undefined) {
    db_leaderboard.set(`${type}.${username}`, db_leaderboard.get(`${type}.${username}`)+parseInt(amount))
  }
  else {
    db_leaderboard.set(`${type}.${username}`, parseInt(amount))
  }
  return 0;
}

function CreateHoodDB(username) {
  db_hoods.set(`${username}`, {})
  for (var cisloHoodu = 1; cisloHoodu<=13; cisloHoodu++) {
    db_hoods.set(`${username}.${cisloHoodu}`, {})
    db_hoods.set(`${username}.${cisloHoodu}.weed_cena`, 100)
    db_hoods.set(`${username}.${cisloHoodu}.meth_cena`, 500)
    db_hoods.set(`${username}.${cisloHoodu}.heroin_cena`, 750)

    db_hoods.set(`${username}.${cisloHoodu}.dealer1`, "0")
    db_hoods.set(`${username}.${cisloHoodu}.dealer1_info`, {})
    db_hoods.set(`${username}.${cisloHoodu}.dealer1_info.startTimestamp`, 0)
    db_hoods.set(`${username}.${cisloHoodu}.dealer1_info.endTimestamp`, 0)
    db_hoods.set(`${username}.${cisloHoodu}.dealer1_info.profit`, 0)
    db_hoods.set(`${username}.${cisloHoodu}.dealer1_info.amount`, 0)

    db_hoods.set(`${username}.${cisloHoodu}.dealer2`, "0")
    db_hoods.set(`${username}.${cisloHoodu}.dealer2_info`, {})
    db_hoods.set(`${username}.${cisloHoodu}.dealer2_info.startTimestamp`, 0)
    db_hoods.set(`${username}.${cisloHoodu}.dealer2_info.endTimestamp`, 0)
    db_hoods.set(`${username}.${cisloHoodu}.dealer2_info.profit`, 0)
    db_hoods.set(`${username}.${cisloHoodu}.dealer2_info.amount`, 0)
  }
}

function CreateVarnyDB(username) {
  db_varny.set(`${username}`, {})
  var max_pocet_stolu = 5
  for (var cisloVarny = 1; cisloVarny <= 7; cisloVarny++) {
    db_varny.set(`${username}.varna${cisloVarny}`, {})
    for (var cisloStolu = 1; cisloStolu<=max_pocet_stolu; cisloStolu++) {
      db_varny.set(`${username}.varna${cisloVarny}.table${cisloStolu}`, {})
      db_varny.set(`${username}.varna${cisloVarny}.table${cisloStolu}.type`, "notype")
      db_varny.set(`${username}.varna${cisloVarny}.table${cisloStolu}.start`, 0)
      db_varny.set(`${username}.varna${cisloVarny}.table${cisloStolu}.stop`, 0)
      db_varny.set(`${username}.varna${cisloVarny}.table${cisloStolu}.harvested`, true)
      db_varny.set(`${username}.varna${cisloVarny}.table${cisloStolu}.amount`, 0)
      db_varny.set(`${username}.varna${cisloVarny}.table${cisloStolu}.stage`, 0)
    }
    max_pocet_stolu += 2
  }
}

function CreateUserDB(username) {
  db_users.set(`${username}`, {})
  db_users.set(`${username}.logged`, 0)
  db_users.set(`${username}.respect`, 0)
  db_users.set(`${username}.pole`, 1)
  db_users.set(`${username}.money`, 2000)

  db_users.set(`${username}.inventory`, {})
  db_users.set(`${username}.inventory.seminka`, 0)
  db_users.set(`${username}.inventory.hnuj`, 0)
  db_users.set(`${username}.inventory.weed`, 0)
  db_users.set(`${username}.inventory.meth`, 0)
  db_users.set(`${username}.inventory.heroin`, 0)
  db_users.set(`${username}.inventory.varna`, 0)
  db_users.set(`${username}.inventory.aceton`, 0)
  db_users.set(`${username}.inventory.chlorovodikova`, 0)
  db_users.set(`${username}.inventory.hydroxid`, 0)
  db_users.set(`${username}.inventory.ether`, 0)
  db_users.set(`${username}.inventory.efedrin`, 0)
  db_users.set(`${username}.inventory.varic`, 0)
  db_users.set(`${username}.inventory.chloroform`, 0)
  db_users.set(`${username}.inventory.aktivniuhli`, 0)
  db_users.set(`${username}.inventory.uhlicitan`, 0)
  db_users.set(`${username}.inventory.alkohol`, 0)
  db_users.set(`${username}.inventory.ocet`, 0)
  db_users.set(`${username}.inventory.cpavek`, 0)
  db_users.set(`${username}.inventory.vapno`, 0)
  db_users.set(`${username}.inventory.makovice`, 0)

}

function CreatePoleDB(username) {
  db_pole.set(`${username}`, {})
  for (var cisloPole = 1; cisloPole <= 32; cisloPole++) {
    db_pole.set(`${username}.${cisloPole}`, 0)
  }
}