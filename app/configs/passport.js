// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

// load up the models
var User = require('../models/user');
var Invite = require('../models/invite');

// load the auth variables
var configAuth = require('./auth'); // use this one for testing

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        //console.log('serializeUser');
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            //console.log('deserializeUser');
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        },
        function(req, email, password, done) {
            if (email)
                email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

            // asynchronous
            process.nextTick(function() {
                User.findOne({ 'local.email': email }, function(err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // if no user is found, return the message
                    if (!user)
                        return done(null, false, req.flash('loginMessage', 'No user found.'));

                    if (!user.validPassword(password))
                        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

                    // all is well, return user
                    else
                        return done(null, user);
                });
            });

        }));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        },
        function(req, email, password, done) {
            if (email)
                email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

            // asynchronous
            process.nextTick(function() {
                // if the user is not already logged in:
                if (!req.user) {
                    User.findOne({ 'local.email': email }, function(err, user) {
                        // if there are any errors, return the error
                        if (err)
                            return done(err);

                        // check to see if theres already a user with that email
                        if (user) {
                            return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                        } else {

                            // create the user
                            var newUser = new User();

                            newUser.local.email = email;
                            newUser.local.password = newUser.generateHash(password);

                            newUser.save(function(err) {
                                if (err)
                                    return done(err);

                                return done(null, newUser);
                            });
                        }

                    });
                    // if the user is logged in but has no local account...
                } else if (!req.user.local.email) {
                    // ...presumably they're trying to connect a local account
                    // BUT let's check if the email used to connect a local account is being used by another user
                    User.findOne({ 'local.email': email }, function(err, user) {
                        if (err)
                            return done(err);

                        if (user) {
                            return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
                            // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
                        } else {
                            var user = req.user;
                            user.local.email = email;
                            user.local.password = user.generateHash(password);
                            user.save(function(err) {
                                if (err)
                                    return done(err);

                                return done(null, user);
                            });
                        }
                    });
                } else {
                    // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
                    return done(null, req.user);
                }

            });

        }));

    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    var fbStrategy = configAuth.facebookAuth;
    fbStrategy.passReqToCallback = true; // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    passport.use(new FacebookStrategy(fbStrategy,
        function(req, token, refreshToken, profile, done) {

            // asynchronous
            process.nextTick(function() {

                // check if the user is already logged in
                if (!req.user) {

                    User.findOne({ 'facebook.id': profile.id }, function(err, user) {
                        if (err)
                            return done(err);

                        if (user) {

                            // if there is a user id already but no token (user was linked at one point and then removed)
                            if (!user.facebook.token) {
                                user.facebook.token = token;
                                user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
                                user.facebook.email = (profile.emails[0].value || '').toLowerCase();

                                user.save(function(err) {
                                    if (err)
                                        return done(err);

                                    return done(null, user);
                                });
                            }

                            return done(null, user); // user found, return that user
                        } else {
                            // if there is no user, create them
                            var newUser = new User();

                            newUser.facebook.id = profile.id;
                            newUser.facebook.token = token;
                            newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
                            newUser.facebook.email = (profile.emails[0].value || '').toLowerCase();

                            newUser.save(function(err) {
                                if (err)
                                    return done(err);

                                return done(null, newUser);
                            });
                        }
                    });

                } else {
                    // user already exists and is logged in, we have to link accounts
                    var user = req.user; // pull the user out of the session

                    user.facebook.id = profile.id;
                    user.facebook.token = token;
                    user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
                    user.facebook.email = (profile.emails[0].value || '').toLowerCase();

                    user.save(function(err) {
                        if (err)
                            return done(err);

                        return done(null, user);
                    });

                }
            });

        }));

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

            consumerKey: configAuth.twitterAuth.consumerKey,
            consumerSecret: configAuth.twitterAuth.consumerSecret,
            callbackURL: configAuth.twitterAuth.callbackURL,
            passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

        },
        function(req, token, tokenSecret, profile, done) {

            // asynchronous
            process.nextTick(function() {

                // check if the user is already logged in
                if (!req.user) {

                    User.findOne({ 'twitter.id': profile.id }, function(err, user) {
                        if (err)
                            return done(err);

                        if (user) {
                            // if there is a user id already but no token (user was linked at one point and then removed)
                            if (!user.twitter.token) {
                                user.twitter.token = token;
                                user.twitter.username = profile.username;
                                user.twitter.displayName = profile.displayName;

                                user.save(function(err) {
                                    if (err)
                                        return done(err);

                                    return done(null, user);
                                });
                            }

                            return done(null, user); // user found, return that user
                        } else {
                            // if there is no user, create them
                            var newUser = new User();

                            newUser.twitter.id = profile.id;
                            newUser.twitter.token = token;
                            newUser.twitter.username = profile.username;
                            newUser.twitter.displayName = profile.displayName;

                            newUser.save(function(err) {
                                if (err)
                                    return done(err);

                                return done(null, newUser);
                            });
                        }
                    });

                } else {
                    // user already exists and is logged in, we have to link accounts
                    var user = req.user; // pull the user out of the session

                    user.twitter.id = profile.id;
                    user.twitter.token = token;
                    user.twitter.username = profile.username;
                    user.twitter.displayName = profile.displayName;

                    user.save(function(err) {
                        if (err)
                            return done(err);

                        return done(null, user);
                    });
                }

            });

        }));

    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================


    passport.use('google', new GoogleStrategy({
            clientID: configAuth.googleAuth.clientID,
            clientSecret: configAuth.googleAuth.clientSecret,
            callbackURL: global.callbackURL,
            passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        },
        function(req, token, refreshToken, profile, done) {
            // If req.use_access_token = true has been passed from /auth/google/callback
            // then pass back the access_token otherwise set it to empty.
            var contacts_token = { 'access_token': token };
            // 
            if (!req.use_access_token) {
                contacts_token.access_token = 'empty';
            }
            // asynchronous
            process.nextTick(function() {
                // check if the user is already logged in
                if (!req.user) {
                    //console.log('!req.user');
                    User.findOne({ 'google.id': profile.id }, function(err, user) {
                        if (err) {
                            return done(err);
                        }

                        if (user) {
                            //console.log('user found');
                            // if there is a user id already but no token (user was linked at one point and then removed)
                            if (!user.google.token || user.google.token != token) {
                                //user.google.token = token;
                                user.google.name = profile.displayName;
                                user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                                user.save(function(err) {
                                    if (err) {
                                        console.log('err: ' + err);
                                        return done(err);
                                    }
                                    // Pass back the user and the access_token.
                                    return done(null, user, contacts_token);
                                });
                            } else {
                                // added
                                return done(null, user);
                            }

                        } else {
                            //
                            // NEW USER
                            //
                            var newUser = new User();
                            newUser._id = new mongoose.Types.ObjectId();
                            //newUser.contacts = ''; Empty
                            newUser.first_login = true;
                            newUser.user_name = profile.displayName;
                            if (profile._json.picture) {
                                newUser.avatar = (profile.photos[0].value || '');
                            } else {
                                newUser.avatar = 'default';
                            }
                            newUser.google.id = profile.id;
                            //newUser.google.token = token;
                            newUser.google.name = profile.displayName;
                            newUser.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                            newUser.save(function(err) {
                                if (err) {
                                    return done(err);
                                }

                                return done(null, newUser);
                            });
                        }
                    });

                } else {
                    //console.log('req.user');
                    // A user is already logged in
                    // If the logged in user is the as the user loggin in
                    if (req.user.google.id === profile.id) {
                        var user = req.user; // pull the user out of the session

                        user.google.id = profile.id;
                        //user.google.token = token;
                        user.google.name = profile.displayName;
                        user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                        user.save(function(err) {
                            if (err)
                                return done(err);
                            // Pass back the user and the access_token.
                            return done(null, user, contacts_token);
                        });
                    } else {
                        // The user logging in is different to the currently logged in user
                        // Find the user logging in
                        User.findOne({ 'google.id': profile.id }, function(err, user) {
                            if (err)
                                return done(err);

                            if (user) {
                                // if there is a user id already but no token (user was linked at one point and then removed)
                                if (!user.google.token) {
                                    //user.google.token = token;
                                    user.google.name = profile.displayName;
                                    user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                                    user.save(function(err) {
                                        if (err)
                                            return done(err);

                                        return done(null, user);
                                    });
                                }

                                return done(null, user);
                            } else {
                                //
                                // NEW USER
                                //
                                var newUser = new User();
                                newUser._id = new mongoose.Types.ObjectId();
                                //newUser.contacts = ''; Empty
                                newUser.first_login = true;
                                newUser.user_name = profile.displayName;
                                if (!profile._json.image.isDefault) {
                                    newUser.avatar = (profile.photos[0].value || '');
                                } else {
                                    newUser.avatar = 'default';
                                }
                                newUser.google.id = profile.id;
                                //newUser.google.token = token;
                                newUser.google.name = profile.displayName;
                                newUser.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                                newUser.save(function(err) {
                                    if (err) {
                                        return done(err);
                                    }
                                    return done(null, newUser);
                                });
                            }
                        });

                    }

                }

            });

        }));

};