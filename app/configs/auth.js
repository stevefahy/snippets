// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth': {
        'clientID': 'your-secret-clientID-here', // your App ID
        'clientSecret': 'your-client-secret-here', // your App Secret
        'callbackURL': 'http://localhost:8080/auth/facebook/callback',
        'profileURL': 'https://graph.facebook.com/v2.5/me?fields=first_name,last_name,email'

    },

    'twitterAuth': {
        'consumerKey': 'your-consumer-key-here',
        'consumerSecret': 'your-client-secret-here',
        'callbackURL': 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth': {
        'clientID': '292060075581-keurvsehjst5sikfq0i83ma57hboe9mb.apps.googleusercontent.com',
        'clientSecret': '5Ao5jXQtjgCXVcQ4C6v5feOa' //,
        //'callbackURL': 'http://localhost:8090/auth/google/callback'
    }

};