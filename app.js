const express        = require('express'),
      mongoose       = require('mongoose'),
      bodyParser     = require('body-parser'),
      flash          = require('connect-flash'),
      passport       = require('passport'),
      LocalStrategy  = require('passport-local'),
      methodOverride = require('method-override'),
      User           = require('./models/user');

// Requiring Routes
const commentRoutes    = require('./routes/comments'),
      reviewRoutes     = require('./routes/reviews'),
      campgroundRoutes = require('./routes/campgrounds'),
      indexRoutes      = require('./routes/index');

const app = express();

require('dotenv').config();

// Database Connection
const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost/yelp_camp_v5";
mongoose.connect(databaseUrl, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
app.use(flash());

app.locals.moment = require('moment');

// PASSPORT CONFIGURATION
app.use(require('express-session')({
    secret: PASSPORT_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

// Route Prefixes
app.use('/', indexRoutes);
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:slug/comments', commentRoutes);
app.use('/campgrounds/:slug/reviews', reviewRoutes);

app.listen(process.env.PORT || 3000, function() {
    console.log('YelpCamp Server Started. Listening on Port 3000');
});