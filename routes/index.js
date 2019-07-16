const express    = require('express'),
      router     = express.Router(),
      passport   = require('passport'),
      nodemailer = require('nodemailer'),
      async      = require('async'),
      crypto     = require('crypto'),
      User       = require('../models/user'),
      Campground = require('../models/campground');


// Root Route
router.get('/', function(req, res) {
    res.render('landing');
});

// Register Form Route
router.get('/register', function(req, res) {
    res.render('register', {page: 'register'});
});

// Register Logic
router.post('/register', function(req, res) {
    let newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body. avatar
    });
    if(req.body.adminCode === 'iamadmin') {
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user) {
        if(err) {
            console.log(err);
            return res.render('register', {error: err.message + '.'});
        }
        passport.authenticate('local')(req, res, function() {
            req.flash('success', 'Signed Up Successfully! Nice to meet you ' + user.username + '!');
            res.redirect('/campgrounds');
        });
    });
});

// Login Form Route
router.get('/login', function(req, res) {
    res.render('login', {page: 'login'});
});

// Login Logic
router.post('/login', passport.authenticate('local', 
    {
        successRedirect: '/campgrounds',
        successFlash: 'Welcome back.',
        failureRedirect: '/login',
        failureFlash: 'Invalid username/password.'
    }), function(req, res) {

});

// Logout Route
router.get('/logout', function(req, res) {
    req.logout();
    req.flash('Success', 'Logged out successfully.');
    res.redirect('/campgrounds');
});

// Forgot Password Routes
router.get('/forgot', function(req, res) {
    res.render('forgot');
});

router.post('/forgot', function(req, res) {
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                if(err) {
                    console.log(err);
                    req.flash('error', 'Oops, something went wrong!');
                    res.redirect('back');
                } else {
                    let token = buf.toString('hex');
                    done(err, token);
                }
            });
        },
        function(token, done) {
            User.findOne({email: req.body.email}, function(err, user) {
                if(err) {
                    console.log(err);
                    req.flash('error', 'Oops, something went wrong!');
                    res.redirect('back');
                } else if(!user) {
                    req.flash('error', 'No account with that email address exists.');
                    res.redirect('/forgot');
                } else {
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000;
                    user.save(function(err) {
                        done(err, token, user);
                    });
                }
            });
        },
        function(token, user, done) {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'yelpcamp.resetpw@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            let mailOptions = {
                to: user.email,
                from: 'YelpCamp',
                subject: 'YelpCamp Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                if(err) {
                    console.log(err);
                    req.flash('error', 'Oops, something went wrong!');
                    res.redirect('back');
                } else {
                    console.log('mail sent');
                    req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                    done(err, 'done');
                }
            });
        },
    ], function(err) {
        if(err) {
            console.log(err);
            return next(err);
        } 
        res.redirect('/forgot');
    });
});

//Reset Password Routes
router.get('/reset/:token', function(req, res) {
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function(err, user) {
        if(err) {
            req.flash('error', 'Oops, something went wrong!');
            res.redirect('back');
        } else if(!user) {
            req.flash('error', 'Password reset token is invalid or expired.');
            res.redirect('/forgot');
        } else {
            res.render('reset', {token: req.params.token});
        }
    });
});

router.post('/reset/:token', function(req, res) {
    async.waterfall([
        function(done) {
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function(err, user) {
                if(err) {
                    req.flash('error', 'Oops, something went wrong!');
                    res.redirect('back');
                } else if(!user) {
                    req.flash('error', 'Password reset token is invalid or expired.');
                    res.redirect('/forgot');
                } else if(req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, function(err) {
                        if(err) {
                            req.flash('error', 'Oops, something went wrong!');
                            res.redirect('back');
                        } else {
                            user.resetPasswordToken = undefined;
                            user.resetPasswordExpires = undefined;
                            user.save(function(err) {
                                if(err) {
                                    req.flash('error', 'Oops, something went wrong!');
                                    res.redirect('back');
                                } else {
                                    req.logIn(user, function(err) {
                                        done(err, user);
                                    });
                                }
                            });
                        }
                    });
                } else {
                    req.flash('error', 'Passwords do not match.');
                    res.redirect('back');
                }
            });
        },
        function(user, done) {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'yelpcamp.resetpw@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            let mailOptions = {
                to: user.email,
                from: 'YelpCamp',
                subject: 'Your password has been reset.',
                text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                req.flash('success', 'Your password has been reset successfully.');
                done(err);
            });
        }
    ], function(err) {
        if(err) {
            req.flash('error', 'Oops, something went wrong!');
            res.redirect('back');
        } else {
            res.redirect('/campgrounds');
        }
    });
});

// User Profile Route
router.get('/users/:id', function(req, res) {
    User.findById(req.params.id, function(err, foundUser) {
        if(err) {
            req.flash('error', 'Oops! Something went wrong');
            res.redirect('back');
        } else {
            Campground.find().where('author.id').equals(foundUser._id).exec(function(err, userCampgrounds) {
                if(err) {
                    req.flash('error', 'Oops! Something went wrong');
                    res.redirect('back');
                } else {
                    res.render('users/show', {user: foundUser, campgrounds: userCampgrounds});
                }
            });
        }
    });
});

module.exports = router;