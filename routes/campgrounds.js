const express    = require('express'),
      router     = express.Router(),
      Campground = require('../models/campground'),
      Comment    = require('../models/comment'),
      middleware = require('../middleware');

// Index Route
router.get('/', function(req, res) {
    let noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}, function(err, campgrounds) {
            if(err) {
                console.log(err);
            } else {
                if(campgrounds.length < 1) {
                    noMatch = 'No campgrounds match that query, please try again';
                }
                res.render('campgrounds/index', {campgrounds: campgrounds, noMatch: noMatch, page: 'campgrounds'}); 
            }
        });
    } else {
        Campground.find({}, function(err, campgrounds) {
            if(err) {
                console.log(err);
            } else {
                res.render('campgrounds/index', {campgrounds: campgrounds, noMatch: noMatch, page: 'campgrounds'}); 
            }
        });
    }
});

// New Campground Route
router.get('/new', middleware.isLoggedIn, function(req, res) {
    res.render('campgrounds/new');
});

// Create Campground Route
router.post('/', middleware.isLoggedIn, function(req, res) {
    let name = req.body.name;
    let image = req.body.image;
    let price = req.body.price;
    let desc = req.body.description;
    let author = {
        id: req.user._id,
        username: req.user.username
    };
    newCampground = { name: name, image: image, price: price, description: desc, author: author };
    Campground.create(newCampground, function(err, newlyCreated) {
        if(err) {
            console.log(err);
        } else {
            req.flash('success', 'Campground created.');
            res.redirect('/campgrounds');
        }
    });
});

// Show Campground Route
router.get('/:slug', function(req, res) {
    Campground.findOne({slug: req.params.slug}).populate('comments').exec(function(err, foundCampground) {
        if(err) {
            console.log(err);
        } else {
            res.render('campgrounds/show', {campground: foundCampground});
        }
    });
});

// Edit Campground Route
router.get('/:slug/edit', middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findOne({slug: req.params.slug}, function(err, foundCampground) {
        if(err) {
            res.redirect('/campgrounds');
        } else{
            res.render('campgrounds/edit', {campground: foundCampground});
        }
    });
});

// Update Campground Route
router.put('/:slug/', middleware.checkCampgroundOwnership, function( req, res) {
    Campground.findOne({slug: req.params.slug}, function(err, campground) {
        if(err) {
            res.redirect('/campgrounds/edit');
        } else {
            campground.name = req.body.campground.name;
            campground.image = req.body.campground.image;
            campground.description = req.body.campground.description;
            campground.price = req.body.campground.price;
            campground.save(function(err) {
                if(err) {
                    req.flash('error', 'Oops, something went wrong!');
                    res.redirect('back');
                } else {
                    req.flash('success', 'Campground updated.');
                    res.redirect('/campgrounds/' + campground.slug);
                }
            });
        }
    });
});

// Destroy Campground Route
router.delete('/:id', middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findOneAndRemove({slug: req.params.slug}, function(err, deletedCampground) {
       if(err) {
            res.redirect('/campgrounds');
       } else {
            Comment.deleteMany({_id: {$in: deletedCampground.comments}}, function(err, deletedComments) {
                if(err) {
                    console.log(err);
                    res.redirect('/campgrounds');
                } else {
                    req.flash('success', 'Campground deleted.');
                    res.redirect('/campgrounds');
                }
            });
       }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;