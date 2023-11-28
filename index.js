const express = require('express');
const {MongoClient} = require('mongodb');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const { name } = require('ejs');
const path = require('path');
const PORT = process.env.PORT || 6967;
const PUBLISHABLE_KEY = "pk_test_51NVb0EBytzxEIsxrueGjfsyyo3yXtviUZmaUB6z4wfTyfId3F5FGCbrBM0mDKGDnuENfh5oMPMv0LhXLPn3SC6JY00uypwFqpS"
const SECRET_KEY = "sk_test_51NVb0EBytzxEIsxrzZtxnD7mTmXXJE5PaDUQYz1ikpQH2uMVRPvTVcYXHY5zPdcJp1DLMNnw3Bo5fbE3GGewRvqO002AiqCLQa"
const stripe = require('stripe')(SECRET_KEY)




mongoose.connect('mongodb://0.0.0.0:27017/mydb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

var db = mongoose.connection;

// check connect
db.on('error', () => console.log("error in connecting database"));
db.once('open', () => console.log("Connected to Database"));

//lain
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('views'));
app.use(express.json());
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false }));
const port = 6967;

const usersSchema = {
    name: String,
    category: String,
    menu: Array,
    email: String,
    date: String,
    total: String,
    time: String,
    fullname: String,
    phone: String,
    restaurant: String,
    table: String,
    price: Array,
  }
  
const userslist = mongoose.model('users', usersSchema);

//session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}))

//middleware to check if user is logged in
app.use(function(req, res, next){
    var err = req.session.error;
    var msg = req.session.success;
    res.locals.user = req.session.user;
    res.locals.category = req.session.category;
    res.locals.name = req.session.name;
    res.locals.total = req.session.total;
    res.locals.loggedIn = req.session.user ? true : false;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
    if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
    next();
});

//retrieve user from session 
function isAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.listen(port, () => {
    console.log(`listening at port 3000`)
});

//home page
app.get('/', function(req, res){
    //render index page with user session and image from db
    getData().then(function(result){
        return result;
    })
    .then(function(result){
      res.render('index');
    })
    .catch(function(err){
        console.log(err);
    })
});


//if user is logged in, post data to database
app.post('/', isAuth, function(req, res){
    res.redirect('/');
});

//logout
app.get('/logout', function(req, res){
    // destroy the user's session to log them out
    // will be re-created next request
    req.session.destroy(function(){
      res.redirect('/login');
    });
    console.log("User logged out"); 
});

//login
app.get('/login', function(req, res){
    res.render('login');
});

app.post('/login', express.urlencoded({ extended: true }), async function(req, res){ 
    var name = req.body.username;
    var pass = req.body.password;
    // query the mongodb for the given username and validate the password
    await checkUser(name,pass)
      .then(function(result){
          return result;
      })
      .then(function(result){
        if (result) {

          //create session globally
          req.session.regenerate( async function(err){
            if(err){ return res.send(500); }
            req.session.user = name;

            req.session.save(function (err) {
                if (err) { return next(err) }
                res.redirect('/');
            })
          })

          console.log("User logged in");  
        } else {
          res.redirect('/login');
          console.log("User not logged in");
        }
      })
      .catch(function(err){
        console.log(err);
      })
});

//checkUser
async function checkUser(user, pass){
    //check if user exists
    const result = await db.collection("users").find().toArray();
    for (var i = 0; i < result.length; i++) {
        if (result[i].name == user) {
            if (result[i].password == pass) {
                return true;
            }
        }
    }
}


//get the data
async function getData(req, res){
    const result = await db.collection("users").find().toArray();
    return result;
}

//signup
app.get('/signup', function(req, res){
    res.render('signup');
 });

 //signup page
app.post('/signup', async function(req, res){
    //get multipart user input
    var user = req.body.username;
    var pass = req.body.password;
    var pass2 = req.body.password2;
    var email = req.body.email;
    
    //check if passwords match   
      if (pass != pass2) {
        req.session.error = 'Passwords do not match';
        res.redirect('/signup');
      } else {
        //insert user, pass, image into mongodb
        var newUser = {
            name: user,
            password: pass,
            email: email,
        };
        createUser(newUser);
        
        res.redirect('/login');
        } 
});

//insert record
async function createUser(newUser){
    const result = await db.collection("users").insertOne(newUser);
    console.log(`New user created with the following id: ${result.insertedId}`);
}

app.get('/index', function(req, res){
    res.redirect('/');
 });

app.post('/category', async function(req, res){
    var category= req.body.category;
    var user = req.session.user;
  
  
    req.session.user = user;
    req.session.category = category;
  
    req.session.save(function (err) {
        if (err) { return next(err) }
        res.redirect('/chooserestaurant');  
    })
});

const restaurantSchema = {
    name: String,
    category: String,
    menu: Array,
    table1: Boolean,
    table2: Boolean,
    table3: Boolean,
    table4: Boolean,
    table5: Boolean,
    description: String,
    price: Array,
  }
  
const list = mongoose.model('restaurants', restaurantSchema);
  
app.get('/chooserestaurant', async function (req, res) {
const allList = await list.find({ category: req.session.category });
  
    res.render('chooserestaurant', { dataList: allList });
});

app.post('/chooserestaurant', async function (req, res) {
    var user = req.session.user;
    var name = req.body.name;

    
    req.session.user = user;
    req.session.name = name;
    

        req.session.save(function (err) {
            if (err) { return next(err) }
            res.redirect('/reservepage');
            
        })
});


app.get('/reservepage', async function (req, res) {
    
    const allList = await list.find({ name: req.session.name });

    res.render('reservepage',{ dataList: allList });
});

app.get('/api', (req, res) => {
    res.send('API Status: Running');
});

app.get('/payment', async (req,res)=> {
    const alluserList = await userslist.find({ name: req.session.user });

    res.render('payment.ejs',{
        key:PUBLISHABLE_KEY, userList: alluserList
    })
})

app.post('/payment',(req,res) =>{
    stripe.customers.create({
        email:req.body.stripeEmail,
        source:req.body.stripeToken,
        name:'Luqman'

    })
    .then((customer) =>{
        return stripe.charges.create({
            amount:7000,
            description:'Reservation',
            currency: "USD",
            customer:customer.id
        })
    })
    .then((charge) =>{
        res.send("Success")
    })
    .catch((err) => {
        res.send(err)
    })
})

app.post('/reserve', express.urlencoded({ extended: true }), async function(req, res){
    var user = req.session.user;
    var category = req.session.category;
    var menu = req.body.menu;
    var fullname = req.body.fullname;
    var phone = req.body.phone;
    var date = req.body.date;
    var time = req.body.time;
    var changetable = req.body.table;
    var price = await db.collection('restaurants').findOne({"name": req.session.name},{price:1});


    var total = 0;

    for (var i = 0; i < menu.length; i++) {
        total += parseFloat(price.price[i]);
    }


    var addreserve =  {
        "fullname": fullname,
        "phone": phone,
        "date": date,
        "menu": menu,
        "total" : total.toFixed(2),
        "price": price.price,
        "time": time,
        "category" : category,
        "restaurant" : req.session.name,
        "table": changetable,
    };

    var updatetable =  {
        [changetable]:false,
    };

    db.collection('users').updateOne(
        { "name": user},
        { $set: addreserve },
        {upsert: true}
    )

    db.collection('restaurants').updateOne(
        { "name": req.session.name},
        { $set: updatetable },
        {upsert: true}
    )

    req.session.user = user;
    req.session.category = category;
    req.session.name = req.session.name;
    req.session.total = total.toFixed(2);
    

        req.session.save(function (err) {
            if (err) { return next(err) }
            res.redirect('/');
            
        })

});

app.get('/admin',express.urlencoded({ extended: true }), async function(req, res){

    const allList = await list.find();

    
    res.render('admin', { dataList: allList });

});



app.get('/adminedit/:name',express.urlencoded({ extended: true }), async function(req, res){
    const allList = await list.findOne({"name": req.params.name});
    
    res.render('adminedit',{ dataList: allList });

});

app.post('/changetablestatus/:name',express.urlencoded({ extended: true }), async function(req, res){
    var table1 = req.body.table1 === 'true';
    var table2 = req.body.table2 === 'true';
    var table3 = req.body.table3 === 'true';
    var table4 = req.body.table4 === 'true';
    var table5 = req.body.table5 === 'true';

    var updaterestaurants = {
        table1: table1,
        table2: table2,
        table3: table3,
        table4: table4,
        table5: table5
    }

    await db.collection('restaurants').updateOne(
        { name: req.params.name },
        { $set: updaterestaurants },
        {upsert: true}
    );
    
    res.redirect('/admin');
});

app.post('/addmenu/:name',express.urlencoded({ extended: true }), async function(req, res){
    var menu = req.body.menu;
    var price = req.body.price;

    await db.collection('restaurants').updateOne(
        { name: req.params.name },
        { $push: { menu: { $each: menu }, price: { $each: price} } },
        {upsert: true}
    );
    
    res.redirect('/admin');
});

app.post('/addrestaurant',express.urlencoded({ extended: true }), async function(req, res){
    var name = req.body.name;
    var category = req.body.category;
    var menu = req.body.menu;
    var description = req.body.description;
    var price = req.body.price;

    var newTable = {
        category: category,
        description: description,
        table1: true,
        table2: true,
        table3: true,
        table4: true,
        table5: true
    }
    await db.collection('restaurants').updateOne(
        { name: name },
        { $push: { menu: { $each: menu },price: { $each: price} }, $set: newTable},
        {upsert: true}
    );
    
    res.redirect('/admin');

});

app.post('/remove',express.urlencoded({ extended: true }), async function(req, res){

    var name = req.body.name;

    await db.collection('restaurants').findOneAndDelete(
        { name: name },
    );

    res.redirect('/admin');

});



app.get('/details',express.urlencoded({ extended: true }), async function(req, res){
    const alluserList = await userslist.find({ name: req.session.user });

    res.render('details', { userList: alluserList });

});

//app.post('/reservepage', async function (req, res) {
   // res.render('reservepage');
//});

/**
@param {MongoClient} client
@param {string} namevar
@param {Array} newUser
@param {string} user
@param {string} pass
@param {string} email
@param {string} _id
 */