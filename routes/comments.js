const express    = require('express'),
      router     = express.Router({mergeParams: true}),
      Campground = require('../models/campground'),
      Comment    = require('../models/comment'),
      middleware = require('../middleware');


// New Comment Route
router.get('/new', middleware.isLoggedIn, function(req, res) {
    Campground.findOne({slug: req.params.slug}, function(err, campground) {
        if(err) {
            console.log(err);
        } else {
            return res.render('comments/new', {campground: campground});
        }
    });
});


// Create Comment Route
router.post('/', middleware.isLoggedIn, function(req, res) {
    Campground.findOne({slug: req.params.slug}, function(err, campground){
        if(err) {
            console.log(err);
            res.redirect('/campgrounds');
        } else {
            Comment.create(req.body.comment, function(err, comment) {
                if(err) {
                    req.flash('error', 'Oops, something went wrong.');
                    console.log(err);
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    campground.comments.push(comment);
                    campground.save();
                    req.flash('success', 'Comment added successfully.');
                    res.redirect('/campgrounds/' + campground.slug);
                }
            });
        }
    });
});

// Edit Comment Route
router.get('/:comment_id/edit', middleware.checkCommentOwnership, function(req, res) {
    Comment.findById(req.params.comment_id, function(err, foundComment) {
        if(err) {
            res.redirect('back');
        } else {
            res.render('comments/edit', { campground_slug: req.params.slug, comment: foundComment});
        }
    });
});

// Update Comment Route
router.put('/:comment_id', middleware.checkCommentOwnership, function(req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment) {
        if(err) {
            res.redirect('back');
        } else {
            res.redirect('/campgrounds/' + req.params.slug);
        }
    });
});

// Destroy Comment Route
router.delete('/:comment_id', middleware.checkCommentOwnership, function(req, res) {
    Comment.findByIdAndRemove(req.params.comment_id, function(err, removedComment) {
        if(err) {
            res.redirect('back');
        } else {
            req.flash('success', 'Comment deleted.');
            res.redirect('/campgrounds/' + req.params.slug);
        }
    });
});

module.exports = router;