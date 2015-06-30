# Crawler CLI

The crawler spawns (via cluster fork) a social-specific crawler with
the corresponding configuration.

The crawler MUST be configurable completely via command line.

# Crawler options (passed like the ffpeg interface)
## Options
The options can be specified multiple times or can be comma separated
ES:
`crawler -t test -t test -t test2` is equivalent to `crawler -t test,test,test2`

### Input
- List of social networks to use
    + ES: `-s twitter -s instagram`
- **REQUIRED** List of keys PER social network used
    + ES: `-s twitter -s instagram -k:0:key "key" -k:0:secret "secret" ...`
- **AT LEAST 1 REQUIRED** The search is performed using either
    + List of tags to search for (can be social-specific)
        * ES: `-t:0 EXPO2015 -t EXPO`
    + List of Usernames (can be social-specific)
        * ES: `-u ExpoMilano -u:0 ExpoMilano2015`
    + (**EXTRA**) A GeoJSON to be converted in a grid
        * ES: `-g path/to/the/file.json`
- *OPTIONAL* List of tags to exclude
    + ES: `-e NOEXPO`

### Output (NOT IMPLEMENTED)
The output is identified by a key|identifier that will be added to the output as a `identifier` field.
- The identifier **MUST** be present and can be overrided platform specific
    + ES: `-i expo -i:0 expoTw`
The output can be specified by one or many of the following values
for the `-o` flag:
- console
- file
    + The identifier is used in the filename
- db
    + The identifier will be used as field|collectionName|DBname?
- stream (**EXTRA**)
    + Must specify the port


## Data format
Each post will have the folllowing format:
```js
{
    identifier: "asdadsasdasd", // The identifier used for this series of Data
    id: "", // The string representation of the ID
    date: new Date(), // A Date object representing the creation date (UTC format).
    provider: "", // The provider for this post, corresponds to the social network used.
    author: "", // The author username
    authorId: "", // The string representation of the id of the author
    text: "", // The text of the Post (if available)
    
    
    location: {  // The location of the Post (as GeoJSON Point), if available
        type: 'Point',  // Fixed
        coordinates: [ lon, lat ] // the coordinates in the order [ longitude, atitude ]
    },
    tags: [ "asdasd", "qweqweqwe", ... ], // The list of tags present in this post
    
    raw: {} // The row data as retrieved from the social network
}
```

