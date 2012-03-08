
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , crypto = require('crypto')
  , moment = require('moment')
  , db = require('mongojs').connect('blog', ['post', 'user']);

var conf = {
  salt: 'rdasSDAg'
};

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'wasdsafeAD' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

app.helpers({
  moment: moment
});

app.dynamicHelpers({
  user: function(req, res) {
    return req.session.user;
  }
});
// Routes

function isUser(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    next(new Error('You must be user to access this page'));
  }
}

// Listing
app.get('/', function(req, res) {
  var fields = { subject: 1, body: 1, tags: 1, created: 1, author: 1 };
  db.post.find({ state: 'published'}, fields).sort({ created: -1}, function(err, posts) {
    if (!err && posts) {
      res.render('index.jade', { title: 'Blog list', postList: posts }); 
    }
  });
});

app.get('/post/add', isUser, function(req, res) {
  res.render('add.jade', { title: 'Add new blog post '});
});

app.post('/post/add', isUser, function(req, res) {
  var values = {
      subject: req.body.subject
    , body: req.body.body
    , tags: req.body.tags.split(',')
    , state: 'published'
    , created: new Date()
    , modified: new Date()
    , comments: []
    , author: { 
        username: req.session.user.user
    }
  };

  db.post.insert(values, function(err, post) {
    console.log(err, post);
    res.redirect('/');
  });
});
// Show post
// Route param pre condition
app.param('postid', function(req, res, next, id) {
  if (id.length != 24) return next(new Error('The post id is not having correct length'));

  db.post.findOne({ _id: db.ObjectId(id) }, function(err, post) {
    if (err) return next(new Error('Make sure you provided correct post id'));
    if (!post) return next(new Error('Post loading failed'));
    req.post = post;
    next();
  });
});

app.get('/post/:postid', function(req, res) {
  res.render('show.jade', { 
    title: 'Showing post - ' + req.post.subject,
    post: req.post 
  });
});

// Add comment
app.post('/post/comment', function(req, res) {
  var data = {
      name: req.body.name
    , body: req.body.comment
    , created: new Date()
  };

  console.log(data);

  db.post.update({ _id: db.ObjectId(req.body.id) }, {
    $push: { comments: data }}, { safe: true }, function(err, field) {
      res.redirect('/'); 
  });
});

// Login
app.get('/login', function(req, res) {
  res.render('login.jade', {
    title: 'Login user'
  });
});

app.get('/logout', isUser, function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

app.post('/login', function(req, res) {
  var select = {
      user: req.body.username
    , pass: crypto.createHash('sha256').update(req.body.password + conf.salt).digest('hex')
  };

  db.user.findOne(select, function(err, user) {
    if (!err && user) {
      // Found user register session
      req.session.user = user;
      res.redirect('/');
    } else {
      // User not found lets go through login again
      res.redirect('/login');
    }
    
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
