sub vcl_recv {
#FASTLY recv
	if ( req.request == "FASTLYPURGE" ) {
		set req.http.Fastly-Purge-Requires-Auth = "1";
	}

	if (req.request != "HEAD" && req.request != "GET" && req.request != "FASTLYPURGE") {
		return(pass);
	}

	if (!req.http.Fastly-SSL && (req.http.Host == "cdn.polyfill.io" || req.http.Host == "polyfill.io")) {
		error 751 "Force TLS";
	}

	if (req.url ~ "^/v2/polyfill\." && req.url !~ "[\?\&]ua=") {
		set req.http.X-Orig-URL = req.url;
		set req.url = "/v2/normalizeUa?ua=" urlencode(req.http.User-Agent);
	}

    set req.http.Geo-Lat = geoip.latitude;
    set req.http.Geo-Lng = geoip.longitude;
    set req.http.Geo-Country = geoip.country_code;
    set req.http.Data-Center = server.datacenter;

	return(lookup);
}

sub vcl_deliver {
#FASTLY deliver

	# If the response is to a normalise request and there's a parked "original request", use the normalised UA response to modify the original request and restart it
	if (req.url ~ "^/v\d/normalizeUa" && resp.status == 200 && req.http.X-Orig-URL) {
		set req.http.Fastly-force-Shield = "1";
		if (req.http.X-Orig-URL ~ "\?") {
			set req.url = req.http.X-Orig-URL "&ua=" resp.http.Normalized-User-Agent;
		} else {
			set req.url = req.http.X-Orig-URL "?ua=" resp.http.Normalized-User-Agent;
		}
		restart;

	# If the original request didn't specify a UA override, and we added one when the request was sent to the backend, the backend won't have included a Vary:user-agent header (correctly) but we need to add one
	} else if (req.url ~ "^/v\d/polyfill\..*[\?\&]ua=" && req.http.X-Orig-URL && req.http.X-Orig-URL !~ "[\?\&]ua=") {
		add resp.http.Vary = "User-Agent";
	}
	return(deliver);
}

sub vcl_error {

	# Redirect to SSL
	if (obj.status == 751) {
		set obj.status = 301;
		set obj.response = "Moved Permanently";
		set obj.http.Location = "https://" req.http.host req.url;
		synthetic {""};
		return (deliver);
	}
}
