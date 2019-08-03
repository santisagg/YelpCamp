const express    = require('express'),
      router     = express.Router({mergeParams: true}),
      Campground = require('../models/campground'),
      Review     = require('../models/review'),
      middleware = require('../middleware');


// Reviews Index Route
router.get('/', function(req, res) {
    Campground.findOne({slug: req.params.slug}).populate({
        path: 'reviews',
        options: {sort: {createdAt: -1}}
    }).exec(function(err, campground) {
        if(err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        res.render('reviews/index', {campground: campground});
    });
});

// New Review Route
router.get('/new', middleware.isLoggedIn, middleware.checkReviewExistence, function(req, res) {
    Campground.findOne({slug: req.params.slug}, function(err, campground) {
        if(err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        res.render('reviews/new', {campground: campground});
    });
});

// Review Create Route
router.post('/', middleware.isLoggedIn, middleware.checkReviewExistence, function(req, res) {
    Campground.findOne({slug: req.params.slug}).populate('reviews').exec(function(err, campground) {
        if(err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        Review.create(req.body.review, function(err, review) {
            if(err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
            review.author.id = req.user._id;
            review.author.username = req.user.username;
            review.campground = campground;
            review.save();
            campground.reviews.push(review);
            campground.rating = calculateAverage(campground.reviews);
            campground.save();
            req.flash('success', 'Your review has been successfully added.');
            res.redirect('/campgrounds/' + campground.slug);
        });
    });
});

// Reviews Edit Route
router.get('/:review_id/edit', middleware.checkReviewOwnership, function(req, res) {
    Review.findById(req.params.review_id, function(err, foundReview) {
        if(err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        res.render('reviews/edit', {campground_slug: req.params.slug, review: foundReview});
    });
});

// Reviews Update Route
router.put('/:review_id', middleware.checkReviewOwnership, function(req, res) {
    Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, function(err, updatedReview) {
        if(err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        Campground.findOne({slug: req.params.slug}).populate('reviews').exec(function(err, campground) {
            if(err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
            campground.rating = calculateAverage(campground.reviews);
            campground.save();
            req.flash('success', 'Your review has been successfully updated.');
            res.redirect('/campgrounds/' + campground.slug);
        });
    });
});

// Reviews Destroy Route
router.delete('/:review_id', middleware.checkReviewOwnership, function(req, res) {
    Review.findByIdAndRemove(req.params.review_id, function(err) {
        if(err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        Campground.findOneAndUpdate({slug:req.params.slug}, {$pull: {reviews: req.params.review_id}}, {new: true}).populate('reviews').exec(function(err, campground) {
            if(err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
            campground.rating = calculateAverage(campground.reviews);
            req.flash('success', 'Your review has been successfully deleted.');
            res.redirect('/campgrounds/' + campground.slug);
        });
    });
});

function calculateAverage(reviews) {
    if(reviews.length === 0) {
        return 0;
    }
    let sum = 0;
    reviews.forEach(function(element) {
        sum += element.rating;
    });
    return sum / reviews.length;
}

module.exports = router;