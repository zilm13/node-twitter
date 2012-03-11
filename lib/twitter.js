var	VERSION = '0.2.0',
	http = require('http'),
	querystring = require('querystring'),
	request = require('request'),
	streamparser = require('./parser');

function Twitter(options) {
	if (!(this instanceof Twitter)) return new Twitter(options);

	var defaults = {
		consumer_key: null,
		consumer_secret: null,
		token: null,
		token_secret: null,
		access_token_key: null,
		access_token_secret: null,

		headers: {
			'Accept': '*/*',
			'Connection': 'close',
			'User-Agent': 'node-twitter/' + VERSION
		},

		request_token_url: 'https://api.twitter.com/oauth/request_token',
		access_token_url: 'https://api.twitter.com/oauth/access_token',
		authenticate_url: 'https://api.twitter.com/oauth/authenticate',
		authorize_url: 'https://api.twitter.com/oauth/authorize',
		callback_url: null,

		rest_base: 'https://api.twitter.com/1',
		upload_base: 'https://upload.twitter.com/1',
		search_base: 'https://search.twitter.com',
		stream_base: 'https://stream.twitter.com/1',
		user_stream_base: 'https://userstream.twitter.com/2',
		site_stream_base: 'https://sitestream.twitter.com/2b'
	};
	this.options = merge(defaults, options);

	this.request = request.defaults({
		headers: this.options.headers,
		followRedirect: false,
		oauth: {
			consumer_key: this.options.consumer_key,
			consumer_secret: this.options.consumer_secret,
			token: this.options.token || this.options.access_token_key,
			token_secret: this.options.token_secret || this.options.access_token_secret
		},
		strictSSL: true,
		jar: false
	});
}
Twitter.VERSION = VERSION;
module.exports = Twitter;


/*
 * GET
 */
Twitter.prototype.get = function(url, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	if (url.charAt(0) == '/')
		url = this.options.rest_base + url;

	this.request.get(url, {qs: params}, _handleTwitterResponse(callback));
	return this;
}


/*
 * POST
 */
Twitter.prototype.post = function(url, content, content_type, callback) {
	if (typeof content === 'function') {
		callback = content;
		content = null;
		content_type = null;
	} else if (typeof content_type === 'function') {
		callback = content_type;
		content_type = null;
	}

	if (url.charAt(0) == '/')
		url = this.options.rest_base + url;

	this.request.post(url, {form: content}, _handleTwitterResponse(callback));
	return this;
}


/*
 * STREAM
 */
Twitter.prototype.stream = function(method, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var stream_base = this.options.stream_base;

	// Stream type customisations
	if (method === 'user') {
		stream_base = this.options.user_stream_base;
	} else if (method === 'site') {
		stream_base = this.options.site_stream_base;
	}

	var stream = new streamparser();

	var request = this.request.post({
		url: stream_base + '/' + escape(method) + '.json',
		form: params,
		onResponse: true
	}, function(error, response) {
		if (error) callback(error);

		// FIXME: Somehow provide chunks of the response when the stream is connected
		// Pass HTTP response data to the parser, which raises events on the stream
		response.on('data', function(chunk) {
			stream.receive(chunk);
		});
		response.on('error', function(error) {
			stream.emit('error', error);
		});
		response.on('end', function() {
			stream.emit('end', response);
		});
	});

	stream.destroy = function() {
		// FIXME: should we emit end/close on explicit destroy?
		request.abort();
	};

	if ( typeof callback === 'function' ) callback(null, stream);
	return this;
}


/*
 * CONVENIENCE FUNCTIONS (not API stable!)
 */

// Timelines

// GET statuses/home_timeline
Twitter.prototype.getHomeTimeline = function(params, callback) {
	var url = '/statuses/home_timeline.json';
	this.get(url, params, callback);
	return this;
}

// GET statuses/mentions
Twitter.prototype.getMentions = function(params, callback) {
	var url = '/statuses/mentions.json';
	this.get(url, params, callback);
	return this;
}

// GET statuses/retweeted_by_me
Twitter.prototype.getRetweetedByMe = function(params, callback) {
	var url = '/statuses/retweeted_by_me.json';
	this.get(url, params, callback);
	return this;
}

// GET statuses/retweeted_to_me
Twitter.prototype.getRetweetedToMe = function(params, callback) {
	var url = '/statuses/retweeted_to_me.json';
	this.get(url, params, callback);
	return this;
}

// GET statuses/retweets_of_me
Twitter.prototype.getRetweetsOfMe = function(params, callback) {
	var url = '/statuses/retweets_of_me.json';
	this.get(url, params, callback);
	return this;
}

// GET statuses/user_timeline
Twitter.prototype.getUserTimeline = function(params, callback) {
	var url = '/statuses/user_timeline.json';
	this.get(url, params, callback);
	return this;
}

// GET statuses/retweeted_to_user
Twitter.prototype.getRetweetedToUser = function(params, callback) {
	var url = '/statuses/retweeted_to_user.json';
	this.get(url, params, callback);
	return this;
}

// GET statuses/retweeted_by_user
Twitter.prototype.getRetweetedByUser = function(params, callback) {
	var url = '/statuses/retweeted_by_user.json';
	this.get(url, params, callback);
	return this;
}

// Tweets

// GET statuses/:id/retweeted_by
Twitter.prototype.getRetweetedBy = function(id, params, callback) {
	var url = '/statuses/' + escape(id) + '/retweeted_by.json';
	this.post(url, params, null, callback);
	return this;
}

// GET statuses/:id/retweeted_by/ids
Twitter.prototype.getRetweetedByIds = function(id, params, callback) {
	var url = '/statuses/' + escape(id) + '/retweeted_by/ids.json';
	this.post(url, params, null, callback);
	return this;
}

// GET statuses/retweets/:id
Twitter.prototype.getRetweets = function(id, params, callback) {
	var url = '/statuses/retweets/' + escape(id) + '.json';
	this.get(url, params, callback);
	return this;
}

// GET statuses/show/:id
Twitter.prototype.showStatus = function(id, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var url = '/statuses/show/' + escape(id) + '.json';
	var defaults = {
		include_entities: 1
	};
	params = merge(defaults, params);

	this.get(url, params, callback);
	return this;
}
Twitter.prototype.getStatus
	= Twitter.prototype.showStatus;

// POST statuses/destroy/:id
Twitter.prototype.destroyStatus = function(id, callback) {
	var url = '/statuses/destroy/' + escape(id) + '.json';
	this.post(url, null, null, callback);
	return this;
}
Twitter.prototype.deleteStatus
	= Twitter.prototype.destroyStatus;

// POST statuses/retweet/:id
Twitter.prototype.retweetStatus = function(id, callback) {
	var url = '/statuses/retweet/' + escape(id) + '.json';
	this.post(url, null, null, callback);
	return this;
}

// POST statuses/update
Twitter.prototype.updateStatus = function(text, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var url = '/statuses/update.json';
	var defaults = {
		status: text,
		include_entities: 1
	};
	params = merge(defaults, params);
	this.post(url, params, null, callback);
	return this;
}

// POST statuses/update_with_media
Twitter.prototype.updateStatusWithMedia = function(text, media, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var url = '/statuses/update_with_media.json';
	var defaults = {
		status: text
	};
	params = merge(defaults, params);

	var multipart = [];
	for (var name in params) {
		multipart.push({
			'content-disposition': 'form-data; name="' + name + '"',
			body: params[name]
		});
	};

	var self = this;
	require('fs').readFile(media, function(error, data) {
		if (error) callback(error);

		multipart.push({
			'content-disposition': 'form-data; name="media[]"',
			'content-type': 'application/octet-stream',
			body: data
		});

		self.request.post(self.options.upload_base + url, {
			headers: merge(self.options.headers, {'content-type': 'multipart/form-data'}),
			multipart: multipart
		}, _handleTwitterResponse(callback));
	});
	return this;
}

// FIXME: GET statuses/oembed

// Search

// GET search
Twitter.prototype.search = function(q, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var url = this.options.search_base + '/search.json';
	params = merge(params, {q:q});
	this.get(url, params, callback);
	return this;
}

// Direct Messages

// GET direct_messages
Twitter.prototype.getDirectMessages = function(params, callback) {
	var url = '/direct_messages.json';
	this.get(url, params, callback);
	return this;
}

// GET direct_messages/sent
Twitter.prototype.getDirectMessagesSent = function(params, callback) {
	var url = '/direct_messages/sent.json';
	this.get(url, params, callback);
	return this;
}
Twitter.prototype.getSentDirectMessages
	= Twitter.prototype.getDirectMessagesSent;

// POST direct_messages/destroy/:id
Twitter.prototype.destroyDirectMessage = function(id, callback) {
	var url = '/direct_messages/destroy/' + escape(id) + '.json?_method=DELETE';
	this.post(url, null, callback);
	return this;
}
Twitter.prototype.deleteDirectMessage
	= Twitter.prototype.destroyDirectMessage;

// POST direct_messages/new
Twitter.prototype.newDirectMessage = function(id, text, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var defaults = {
		text: text,
		include_entities: 1
	};
	if (typeof id === 'string')
		defaults.screen_name = id;
	else
		defaults.user_id = id;
	params = merge(defaults, params);

	var url = '/direct_messages/new.json';
	this.post(url, params, null, callback);
	return this;
}
Twitter.prototype.updateDirectMessage
	= Twitter.prototype.sendDirectMessage
	= Twitter.prototype.newDirectMessage;

// GET direct_messages/show/:id
Twitter.prototype.getDirectMessage = function(id, callback) {
	var url = '/direct_messages/show/' + escape(id) + '.json';
	this.get(url, null, callback);
	return this;
}
Twitter.prototype.getDirectMessage
	= Twitter.prototype.showDirectMessage;

// Friends & Followers

// GET followers/ids
Twitter.prototype.getFollowersIds = function(id, callback) {
	if (typeof id === 'function') {
		callback = id;
		id = null;
	}

	var params = { key: 'ids' };
	if (typeof id === 'string')
		params.screen_name = id;
	else if (typeof id === 'number')
		params.user_id = id;

	var url = '/followers/ids.json';
	this._getUsingCursor(url, params, callback);
	return this;
}

// GET friends/ids
Twitter.prototype.getFriendsIds = function(id, callback) {
	if (typeof id === 'function') {
		callback = id;
		id = null;
	}

	var params = { key: 'ids' };
	if (typeof id === 'string')
		params.screen_name = id;
	else if (typeof id === 'number')
		params.user_id = id;

	var url = '/friends/ids.json';
	this._getUsingCursor(url, params, callback);
	return this;
}

// FIXME: GET friendships/exists

// GET friendships/incoming
Twitter.prototype.incomingFriendship = function(callback) {
	var url = '/friendships/incoming.json';
	this._getUsingCursor(url, {key:'ids'}, callback);
	return this;
}
Twitter.prototype.incomingFriendships
	= Twitter.prototype.incomingFriendship;

// GET friendships/outgoing
Twitter.prototype.outgoingFriendship = function(callback) {
	var url = '/friendships/outgoing.json';
	this._getUsingCursor(url, {key:'ids'}, callback);
	return this;
}
Twitter.prototype.outgoingFriendships
	= Twitter.prototype.outgoingFriendship;

// GET friendships/show
Twitter.prototype.showFriendship = function(source, target, callback) {
	var params = {};

	if (typeof source === 'string')
		params.source_screen_name = source;
	else
		params.source_id = source;

	if (typeof target === 'string')
		params.target_screen_name = target;
	else
		params.target_id = target;

	var url = '/friendships/show.json';
	this.get(url, params, callback);
	return this;
}

// POST friendships/create
Twitter.prototype.createFriendship = function(id, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var defaults = {
		include_entities: 1
	};
	if (typeof id === 'string')
		defaults.screen_name = id;
	else
		defaults.user_id = id;
	params = merge(defaults, params);

	var url = '/friendships/create.json';
	this.post(url, params, null, callback);
	return this;
}

// POST friendships/destroy
Twitter.prototype.destroyFriendship = function(id, callback) {
	if (typeof id === 'function') {
		callback = id;
		id = null;
	}

	var params = {
		include_entities: 1
	};
	if (typeof id === 'string')
		params.screen_name = id;
	else
		params.user_id = id;

	var url = '/friendships/destroy.json?_method=DELETE';
	this.post(url, params, null, callback);
	return this;
}
Twitter.prototype.deleteFriendship
	= Twitter.prototype.destroyFriendship;

// FIXME: GET friendships/lookup

// FIXME: POST friendships/update

// FIXME: GET friendships/no_retweet_ids

// Users

// FIXME: GET users/lookup

// FIXME: GET users/profile_image/:screen_name

// GET users/search
Twitter.prototype.searchUser = function(q, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var url = '/users/search.json';
	params = merge(params, {q:q});
	this.get(url, params, callback);
	return this;
}
Twitter.prototype.searchUsers
	= Twitter.prototype.searchUser;

// GET users/show
Twitter.prototype.showUser = function(id, callback) {
	// FIXME: handle id-array and id-with-commas as lookupUser
	//  NOTE: params with commas b0rk between node-oauth and twitter
	//        https://github.com/ciaranj/node-oauth/issues/7
	var url = '/users/show.json';

	var params = {};
	if (typeof id === 'string')
		params.screen_name = id;
	else
		params.user_id = id;

	this.get(url, params, callback);
	return this;
}

// FIXME: GET users/contributees

// FIXME: GET users/contributors

// Suggested Users

// FIXME: GET users/suggestions

// FIXME: GET users/suggestions/:slug

// FIXME: GET users/suggestions/:slug/members

// Favorites

// GET favorites
Twitter.prototype.getFavorites = function(params, callback) {
	var url = '/favorites.json';
	this.get(url, params, callback);
	return this;
}

// POST favorites/create/:id
Twitter.prototype.createFavorite = function(id, params, callback) {
	var url = '/favorites/create/' + escape(id) + '.json';
	this.post(url, params, null, callback);
	return this;
}
Twitter.prototype.favoriteStatus
	= Twitter.prototype.createFavorite;

// POST favorites/destroy/:id
Twitter.prototype.destroyFavorite = function(id, params, callback) {
	var url = '/favorites/destroy/' + escape(id) + '.json';
	this.post(url, params, null, callback);
	return this;
}
Twitter.prototype.deleteFavorite
	= Twitter.prototype.destroyFavorite;

// Lists, FIXME: document resource signatures

Twitter.prototype.getLists = function(id, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var defaults = {key:'lists'};
	if (typeof id === 'string')
		defaults.screen_name = id;
	else
		defaults.user_id = id;
	params = merge(defaults, params);

	var url = '/lists.json';
	this._getUsingCursor(url, params, callback);
	return this;
}

Twitter.prototype.getListMemberships = function(id, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var defaults = {key:'lists'};
	if (typeof id === 'string')
		defaults.screen_name = id;
	else
		defaults.user_id = id;
	params = merge(defaults, params);

	var url = '/lists/memberships.json';
	this._getUsingCursor(url, params, callback);
	return this;
}

Twitter.prototype.getListSubscriptions = function(id, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var defaults = {key:'lists'};
	if (typeof id === 'string')
		defaults.screen_name = id;
	else
		defaults.user_id = id;
	params = merge(defaults, params);

	var url = '/lists/subscriptions.json';
	this._getUsingCursor(url, params, callback);
	return this;
}

// FIXME: Uses deprecated Twitter lists API
Twitter.prototype.showList = function(screen_name, list_id, callback) {
	var url = '/' + escape(screen_name) + '/lists/' + escape(list_id) + '.json';
	this.get(url, null, callback);
	return this;
}

// FIXME: Uses deprecated Twitter lists API
Twitter.prototype.getListTimeline = function(screen_name, list_id, params, callback) {
	var url = '/' + escape(screen_name) + '/lists/' + escape(list_id) + '/statuses.json';
	this.get(url, params, callback);
	return this;
}
Twitter.prototype.showListStatuses
	= Twitter.prototype.getListTimeline;

// FIXME: Uses deprecated Twitter lists API
Twitter.prototype.createList = function(screen_name, list_name, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var url = '/' + escape(screen_name) + '/lists.json';
	params = merge(params, {name:list_name});
	this.post(url, params, null, callback);
	return this;
}

// FIXME: Uses deprecated Twitter lists API
Twitter.prototype.updateList = function(screen_name, list_id, params, callback) {
	var url = '/' + escape(screen_name) + '/lists/' + escape(list_id) + '.json';
	this.post(url, params, null, callback);
	return this;
}

// FIXME: Uses deprecated Twitter lists API
Twitter.prototype.deleteList = function(screen_name, list_id, callback) {
	var url = '/' + escape(screen_name) + '/lists/' + escape(list_id) + '.json?_method=DELETE';
	this.post(url, null, callback);
	return this;
}
Twitter.prototype.destroyList
	= Twitter.prototype.deleteList;

// FIXME: Uses deprecated Twitter lists API
Twitter.prototype.getListMembers = function(screen_name, list_id, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var url = '/' + escape(screen_name) + '/' + escape(list_id) + '/members.json';
	params = merge(params, {key:'users'});
	this._getUsingCursor(url, params, callback);
	return this;
}

// FIXME: the rest of list members

// FIXME: Uses deprecated Twitter lists API
Twitter.prototype.getListSubscribers = function(screen_name, list_id, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = null;
	}

	var url = '/' + escape(screen_name) + '/' + escape(list_id) + '/subscribers.json';
	params = merge(params, {key:'users'});
	this._getUsingCursor(url, params, callback);
	return this;
}

// FIXME: the rest of list subscribers

// Accounts

// GET account/rate_limit_status
Twitter.prototype.rateLimitStatus = function(callback) {
	var url = '/account/rate_limit_status.json';
	this.get(url, callback);
	return this;
}

// GET account/verify_credentials
Twitter.prototype.verifyCredentials = function(callback) {
	var url = '/account/verify_credentials.json';
	this.get(url, null, callback);
	return this;
}

// FIXME: POST account/end_session

// POST account/update_profile
Twitter.prototype.updateProfile = function(params, callback) {
	// params: name, url, location, description
	var defaults = {
		include_entities: 1
	};
	params = merge(defaults, params);

	var url = '/account/update_profile.json';
	this.post(url, params, null, callback);
	return this;
}

// FIXME: POST account/update_profile_background_image

// FIXME: POST account/update_profile_colors

// POST account/update_profile_image, FIXME: This API needs work!
Twitter.prototype.updateProfileImage = function(image, callback) {
	var url = '/account/update_profile_image.json';
	this.request.post(this.options.rest_base + url, {
		headers: merge(this.options.headers, {'content-type': 'multipart/form-data'}),
		multipart: [{
			// FIXME: get proper filename
			'content-disposition': 'form-data; name="image"; filename="jdub-big.png"',
			/*'content-type': 'image/png', // can get away without this
			'content-transfer-encoding': 'base64', // documentation is wrong
			body: image.toString('base64')*/
			body: image
		}]
	}, _handleTwitterResponse(callback));
	return this;
}

// FIXME: GET account/totals

// FIXME: GET account/settings

// FIXME: POST account/settings

// Notification

// FIXME: POST notifications/follow

// FIXME: POST notifications/leave

// Saved Searches

// GET saved_searches
Twitter.prototype.savedSearches = function(callback) {
	var url = '/saved_searches.json';
	this.get(url, null, callback);
	return this;
}

// GET saved_searches/show/:id
Twitter.prototype.showSavedSearch = function(id, callback) {
	var url = '/saved_searches/show/' + escape(id) + '.json';
	this.get(url, null, callback);
	return this;
}

// POST saved_searches/create
Twitter.prototype.createSavedSearch = function(query, callback) {
	var url = '/saved_searches/create.json';
	this.post(url, {query: query}, null, callback);
	return this;
}
Twitter.prototype.newSavedSearch =
	Twitter.prototype.createSavedSearch;

// POST saved_searches/destroy/:id
Twitter.prototype.destroySavedSearch = function(id, callback) {
	var url = '/saved_searches/destroy/' + escape(id) + '.json?_method=DELETE';
	this.post(url, null, null, callback);
	return this;
}
Twitter.prototype.deleteSavedSearch =
	Twitter.prototype.destroySavedSearch;

// Places & Geo

// GET geo/id/:place_id
Twitter.prototype.geoGetPlace = function(place_id, callback) {
	var url = '/geo/id/' + escape(place_id) + '.json';
	this.get(url, callback);
	return this;
}

// GET geo/reverse_geocode
Twitter.prototype.geoReverseGeocode = function(lat, lng, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = {};
	} else if (typeof params !== 'object') {
		params = {};
	}

	if (typeof lat !== 'number' || typeof lng !== 'number') {
		callback(new Error('FAIL: You must specify latitude and longitude as numbers.'));
	}

	var url = '/geo/reverse_geocode.json';
	params.lat = lat;
	params.long = lng;
	this.get(url, params, callback);
	return this;
}

// GET geo/search
Twitter.prototype.geoSearch = function(params, callback) {
	var url = '/geo/search.json';
	this.get(url, params, callback);
	return this;
}

// GET geo/similar_places
Twitter.prototype.geoSimilarPlaces = function(lat, lng, name, params, callback) {
	if (typeof params === 'function') {
		callback = params;
		params = {};
	} else if (typeof params !== 'object') {
		params = {};
	}

	if (typeof lat !== 'number' || typeof lng !== 'number' || !name) {
		callback(new Error('FAIL: You must specify latitude, longitude (as numbers) and name.'));
	}

	var url = '/geo/similar_places.json';
	params.lat = lat;
	params.long = lng;
	params.name = name;
	this.get(url, params, callback);
	return this;
}

// FIXME: POST geo/place

// Trends resources

// FIXME: GET trends/:woeid

// FIXME: GET trends/available

// GET trends/daily
Twitter.prototype.getDailyTrends = function(params, callback) {
	var url = '/trends/daily.json';
	this.get(url, params, callback);
	return this;
}

// GET trends/weekly
Twitter.prototype.getWeeklyTrends = function(params, callback) {
	var url = '/trends/weekly.json';
	this.get(url, params, callback);
	return this;
}

// Block, FIXME: document resource signatures

// FIXME: GET blocks/blocking

// FIXME: GET blocks/blocking/ids

// GET blocks/exists
Twitter.prototype.blockExists = function(id, callback) {
	var url = '/blocks/exists.json';

	var params = {};
	if (typeof id === 'string')
		params.screen_name = id;
	else
		params.user_id = id;

	this.get(url, params, null, callback);
	return this;
}
Twitter.prototype.isBlocked
	= Twitter.prototype.blockExists;

// POST blocks/create
Twitter.prototype.createBlock = function(id, callback) {
	var url = '/blocks/create.json';

	var params = {};
	if (typeof id === 'string')
		params.screen_name = id;
	else
		params.user_id = id;

	this.post(url, params, null, callback);
	return this;
}
Twitter.prototype.blockUser
	= Twitter.prototype.createBlock;

// POST blocks/destroy
Twitter.prototype.destroyBlock = function(id, callback) {
	var url = '/blocks/destroy.json';

	var params = {};
	if (typeof id === 'string')
		params.screen_name = id;
	else
		params.user_id = id;

	this.post(url, params, null, callback);
	return this;
}
Twitter.prototype.unblockUser
	= Twitter.prototype.destroyBlock;

// Spam Reporting

// POST report_spam
Twitter.prototype.reportSpam = function(id, callback) {
	var url = '/report_spam.json';

	var params = {};
	if (typeof id === 'string')
		params.screen_name = id;
	else
		params.user_id = id;

	this.post(url, params, null, callback);
	return this;
}

// OAuth

// Help

// Legal

// Deprecated

Twitter.prototype.getFriendsTimeline = function(params, callback) {
	var url = '/statuses/friends_timeline.json';
	this.get(url, params, callback);
	return this;
}

Twitter.prototype.getPublicTimeline = function(params, callback) {
	var url = '/statuses/public_timeline.json';
	this.get(url, params, callback);
	return this;
}

Twitter.prototype.getTrends = function(callback) {
	var url = '/trends.json';
	this.get(url, null, callback);
	return this;
}

Twitter.prototype.getCurrentTrends = function(params, callback) {
	var url = '/trends/current.json';
	this.get(url, params, callback);
	return this;
}


/*
 * INTERNAL UTILITY FUNCTIONS
 */

Twitter.prototype._getUsingCursor = function(url, params, callback) {
	var self = this,
		params = params || {},
		key = params.key || null,
		result = [];

	// if we don't have a key to fetch, we're screwed
	if (!key)
		callback(new Error('FAIL: Results key must be provided to _getUsingCursor().'));
	delete params.key;

	// kick off the first request, using cursor -1
	params = merge(params, {cursor:-1});
	this.get(url, params, fetch);

	function fetch(data) {
		// FIXME: what if data[key] is not a list?
		if (data[key]) result = result.concat(data[key]);

		if (data.next_cursor_str === '0') {
			callback(null, result);
		} else {
			params.cursor = data.next_cursor_str;
			self.get(url, params, fetch);
		}
	}

	return this;
}

function merge(defaults, options) {
	defaults = defaults || {};
	if (options && typeof options === 'object') {
		var keys = Object.keys(options);
		for (var i = 0, len = keys.length; i < len; i++) {
			var k = keys[i];
			if (options[k] !== undefined) defaults[k] = options[k];
		}
	}
	return defaults;
}

function _handleTwitterResponse(callback) {
	if ( typeof callback !== 'function' ) {
		throw new Error("FAIL: INVALID CALLBACK");
	}

	return function(error, response, data) {
		if (error && error.statusCode) {
			var err = new Error('HTTP Error '
				+ error.statusCode + ': '
				+ http.STATUS_CODES[error.statusCode]
				+ ', Twitter Error: ' + error.data);
			err.statusCode = error.statusCode;
			err.data = error.data;
			callback(err, null, response);
		} else if (error) {
			callback(error, null, response);
		} else {
			try {
				var json = JSON.parse(data);
				callback(null, json, response);
			} catch (err) {
				callback(err, data, response);
			}
		}
	};
}
