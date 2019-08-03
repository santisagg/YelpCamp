const express    = require('express'),
      router     = express.Router(),
      Campground = require('../models/campground'),
      Comment    = require('../models/comment'),
      Review     = require('../models/review'),
      middleware = require('../middleware');

// Index Route
router.get('/', function(req, res) {
    let perPage = 8;
    let pageQuery = parseInt(req.query.page);
    let pageNumber = pageQuery ? pageQuery : 1;
    let noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, campgrounds) {
            Campground.countDocuments({name: regex}).exec(function(err, count) {
                if(err) {
                    console.log(err);
                } else {
                    if(campgrounds.length < 1) {
                        noMatch = 'No campgrounds match that query, please try again';
                    }
                    res.render('campgrounds/index', {
                        campgrounds: campgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        page: 'campgrounds',
                        search: req.query.search
                    }); 
                }
            });
        });
    } else {
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, campgrounds) {
            Campground.countDocuments({}).exec(function(err, count) {
                if(err) {
                    console.log(err);
                } else {
                    res.render('campgrounds/index', {
                        campgrounds: campgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        page: 'campgrounds',
                        search: false
                    }); 
                }
            });
        });
    }
});

// New Campground Route
router.get('/new', middleware.isLoggedIn, function(req, res) {
    res.render('campgrounds/new');
});

// Create Campground Route
router.post('/', middleware.isLoggedIn, function(req, res) {
    let name = req.body.name,
        image = req.body.image,
        price = req.body.price,
        availability = req.body.availability,
        extras = req.body.extras,
        contact = req.body.contact,
        desc = req.body.description,
        author = {
            id: req.user._id,
            username: req.user.username
        };
    newCampground = { name: name, image: image, price: price, availability: availability, extras: extras, contact: contact, description: desc, author: author };
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
    Campground.findOne({slug: req.params.slug}).populate('comments').populate({
        path: 'reviews',
        options: {sort: {createdAt: -1}}
    }).exec(function(err, foundCampground) {
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
    delete req.body.campground.rating;
    Campground.findOne({slug: req.params.slug}, function(err, campground) {
        if(err) {
            res.redirect('/campgrounds/edit');
        } else {
            campground.name = req.body.campground.name;
            campground.image = req.body.campground.image;
            campground.description = req.body.campground.description;
            campground.price = req.body.campground.price;
            campground.availability = req.body.campground.availability;
            campground.extras = req.body.campground.extras;
            campground.contact = req.body.campground.contact;
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
    Campground.findOne({slug: req.params.slug}, function(err, campground) {
       if(err) {
            res.redirect('/campgrounds');
       } else {
            Comment.remove({"_id": {$in: campground.comments}}, function(err) {
                if(err) {
                    console.log(err);
                    return res.redirect('/campgrounds');
                }
                Review.remove({"_id": {$in: campground.reviews}}, function(err) {
                    campground.remove();
                    req.flash('success', 'Campground deleted successfully.');
                    res.redirect('/campgrounds');
                })
            });
       }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;