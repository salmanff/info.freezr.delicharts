exports.structure= {
	"meta": {
		"app_name":"info.freezr.delicharts",
		"app_display_name":"Delicharts for vulog",
		"app_version": "01",
		"only_use_collections_listed":true,
	},

	"pages": {
		"index": {
			"page_title":"Delicharts",
			"html_file":"index.html",
			"css_files": "index.css",
			"script_files": ["Chart.js","index.js"]
		}
	},
	
	"collections": {

	},

	"files": {
	},

	"permissions": {
		"my_logs": {
			"type":"db_query",
			"description": "Get all log data to chart it",
			"requestee_app": "info.freezr.vulog", //uses app's own name if null
			"collection": "logs",
			"sharable_groups": ["self"],
			"max_count": null,      // null is infinite
			"permitted_fields": null, // ie all
			"sort":{'vulog_timestamp': -1},
			"return_fields": ["domain_app","url","_creator","_date_Modified","visit_details","vulog_timestamp","vulog_ttl_time"]
		}

	}

}