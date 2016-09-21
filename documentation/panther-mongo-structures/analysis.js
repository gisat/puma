var examples = [
	{
		"_id": 148,
		"type": "fidagg",
		"created": ISODate("2016-07-20T09:22:08.940Z"),
		"createdBy": 1,
		"changed": ISODate("2016-07-20T09:22:55.020Z"),
		"changedBy": 1,
		"name": "Aggregate local betweeness",
		"attributeSets": [34],
		"attributeMap": [{
			"attribute": 18,
			"attributeSet": 34,
			"normAttribute": null,
			"normAttributeSet": null,
			"type": "avgarea"
		}]
	},
	{
		"_id": 911,
		"type": "spatialagg",
		"created": ISODate("2016-07-27T11:46:35.566Z"),
		"createdBy": 2,
		"changed": ISODate("2016-07-27T11:49:41.629Z"),
		"changedBy": 2,
		"name": "Area aggregate per AU",
		"areaTemplate": 8,
		"attributeSet": 912,
		"attributeMap": [{
			"attribute": 910,
			"attributeSet": 912,
			"calcAttribute": 910,
			"calcAttributeSet": 14,
			"groupVal": null,
			"normAttribute": null,
			"normAttributeSet": null,
			"type": "avgattrarea"
		}],
		"groupAttributeSet": null,
		"groupAttribute": null
	}
	// TODO: Find math analysis and show examples.
];