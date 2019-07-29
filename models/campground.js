const mongoose = require('mongoose');

const campgroundSchema = new mongoose.Schema({
    name: {
        type: String,
        required: 'Campground name cannot be blank.'
    },
    image: String,
    price: String,
    description: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ],
    slug: {
        type: String,
        unique: true
    }
});

campgroundSchema.pre('save', async function(next) {
    try {
        if(this.isNew || this.isModified('name')) {
            this.slug = await generateUniqueSlug(this._id, this.name);
        }
        next();
    } catch(err) {
        next(err);
    }
});

const Campground = mongoose.model('Campground', campgroundSchema);

module.exports = Campground;

async function generateUniqueSlug(id, campgroundName, slug) {
    try {
        if(!slug) {
            slug = slugify(campgroundName);
        }
        let campground = await Campground.findOne({slug: slug});
        if(!campground || campground._id.equals(id)) {
            return slug;
        }
        let newSlug = slugify(campgroundName);
        return await generateUniqueSlug(id, campgroundName, newSlug);
    } catch(err) {
        throw new Error(err);
    }
}

function slugify(text) {
    let slug = text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
        .substring(0, 75);
    return slug + '-' + Math.floor(1000 + Math.random() * 9000);
}